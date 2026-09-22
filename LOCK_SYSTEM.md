# Lock System Deep Dive

Comprehensive documentation of the single-writer lock mechanism — the core innovation of this platform.

---

## Overview

The lock ensures **exactly one writer** can edit a story at a time. Authority lives in the **PartyKit Durable Object's `room.storage`**, not in client state. This eliminates race conditions inherent in distributed WebSocket systems.

---

## State Machine

```
                    ┌─────────────────────┐
                    │      LOCK STATES    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │   OPEN   │     │   SELF   │     │  OTHER   │
        └────┬─────┘     └────┬─────┘     └────┬─────┘
             │                │                │
    ┌────────┴────────┐ ┌────┴────┐    ┌──────┴──────┐
    │                 │ │         │    │             │
    ▼                 ▼ ▼         ▼    ▼             ▼
start_editing   stop_editing  type  start_editing  (wait)
   │                 │   │         │       │
   │ (granted)       │   │         │       │ (rejected)
   ▼                 ▼   ▼         ▼       ▼
  SELF ──────────► OPEN ◄──────── OTHER
   │                 ▲
   │  timeout        │
   │ (60s empty)     │
   └─────────────────┘
```

### State Definitions

| State | `activeUser` in DO | UI | Can Edit |
|-------|-------------------|-----|----------|
| `OPEN` | `null` | "Tap to start writing" button | ❌ |
| `SELF` | `you` | TipTap editor + countdown | ✅ |
| `OTHER` | `someone else` | "Waiting on the writer…" | ❌ |

---

## Message Protocol

### Client → Server

```typescript
// Request lock
{ type: "start_editing", user: "penName" }

// Release lock
{ type: "stop_editing", user: "penName" }
```

### Server → Client (Broadcast to ALL)

```typescript
// Lock state change
{ type: "lock", activeUser: "penName" | null }
```

### Connection Lifecycle

```typescript
// On connect: DO sends current state immediately
{ type: "lock", activeUser: "currentHolder" | null }
```

---

## Server Implementation (`stories-party/src/server.ts`)

### Data Structures

```typescript
class Server implements Party.Server {
  // Maps connection ID → pen name (for cleanup on disconnect)
  private connUsers = new Map<string, string>();

  // Persistent, linearizable storage (Durable Object)
  // Key: "activeUser" → Value: penName (string) | null
}
```

### Lock Acquisition (`start_editing`)

```typescript
if (data?.type === "start_editing" && data?.user) {
  // 1. Read current lock holder from authoritative storage
  const activeUser = await this.room.storage.get<string>("activeUser");

  // 2. If held by someone else → REJECT
  if (activeUser && activeUser !== data.user) {
    sender.send(JSON.stringify({ type: "lock", activeUser }));
    return;
  }

  // 3. Track this connection's user (for disconnect cleanup)
  this.connUsers.set(sender.id, data.user);

  // 4. Write lock to storage (atomic)
  await this.room.storage.put("activeUser", data.user);

  // 5. Broadcast new state to ALL connections
  this.room.broadcast(JSON.stringify({ type: "lock", activeUser: data.user }));
}
```

**Key Properties:**
- **Atomic read-check-write** — no window for race
- **Storage is source of truth** — survives DO restarts
- **Broadcast to all** — including requester (confirms grant)

### Lock Release (`stop_editing`)

```typescript
if (data?.type === "stop_editing" && data?.user) {
  const activeUser = await this.room.storage.get<string>("activeUser");

  // Only release if YOU hold it
  if (activeUser && activeUser === data.user) {
    await this.room.storage.delete("activeUser");
    this.room.broadcast(JSON.stringify({ type: "lock", activeUser: null }));
  }
}
```

### Disconnect Cleanup (`onClose`)

```typescript
async onClose(conn: Party.Connection) {
  const user = this.connUsers.get(conn.id);
  this.connUsers.delete(conn.id);

  if (!user) return;

  const activeUser = await this.room.storage.get<string>("activeUser");
  if (activeUser && activeUser === user) {
    await this.room.storage.delete("activeUser");
    this.room.broadcast(JSON.stringify({ type: "lock", activeUser: null }));
  }
}
```

### New Connection Sync (`onConnect`)

```typescript
async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
  // Immediately send current lock state to new client
  const activeUser = await this.room.storage.get<string>("activeUser");
  conn.send(JSON.stringify({ type: "lock", activeUser: activeUser ?? null }));

  // ... Yjs setup omitted
}
```

---

## Client Implementation (`app/room/[room_id]/page.tsx`)

### Lock State Management

```typescript
const [lockState, setLockState] = useState<'open' | 'self' | 'other'>('open');
const [editable, setEditable] = useState(false);
const [currentlyEditing, setCurrentlyEditing] = useState(false);
```

### Message Handler

```typescript
const handleMessage = (event: MessageEvent) => {
  const data = JSON.parse(event.data);
  if (data?.type === "lock") {
    const activeUser = data?.activeUser;

    // Lock released → OPEN
    if (!activeUser) {
      setLockState('open');
      setEditable(false);
      setCurrentlyEditing(false);
      return;
    }

    // You got the lock → SELF
    if (activeUser === penName) {
      setLockState('self');
      setEditable(true);
      return;
    }

    // Someone else has it → OTHER
    setLockState('other');
    setEditable(false);
    setCurrentlyEditing(false);
    setContent('');
    setClearContent(true); // Triggers editor clear
  }
};
```

### Requesting the Lock

```typescript
// User clicks "Tap to start writing"
const handleStartEditing = () => {
  socketRef.current?.send(JSON.stringify({
    type: "start_editing",
    user: penName,
  }));
  upsertStatus(room_id, `Typing:${new Date().toISOString()}`);
};
```

### Releasing the Lock

```typescript
// Called on: save, delete, timeout, unload
const releaseLock = () => {
  socketRef.current?.send(JSON.stringify({
    type: "stop_editing",
    user: penName,
  }));
  upsertStatus(room_id, 'Idle');
};
```

---

## Timeout Mechanism (Deadlock Prevention)

### Client-Side Countdown (60 seconds)

```typescript
const LOCK_TIMEOUT_MS = 60000;

useEffect(() => {
  if (lockState === 'self' && content.trim().length === 0) {
    // Start countdown
    lockTimeoutRef.current = setTimeout(() => {
      // Double-check before releasing
      if (lockState === 'self' && contentRef.current.trim().length === 0) {
        releaseLock();
      }
    }, LOCK_TIMEOUT_MS);
  }
  // Clear on: typing, lock lost, unmount
}, [lockState, content, ...]);
```

### Visual Countdown

```typescript
// Updates every second
const [lockCountdown, setLockCountdown] = useState(0);

// Conic progress indicator
<div style={{
  background: `conic-gradient(
    #bdbdb8 ${(lockCountdown / 60) * 360}deg,
    rgba(0,0,0,0.05) 0deg
  )`
}}>
  {lockCountdown}
</div>
```

---

## Race Condition Analysis

### Scenario: Simultaneous `start_editing`

```
Time →
Client A: ────send(start_editing)────►
Client B: ─────────send(start_editing)────►
DO:          get(activeUser)=null
             put(activeUser=A)
             broadcast(lock=A)
             get(activeUser)=A
             reject B
             send(lock=A) to B
Client A: ◄────broadcast(lock=A)────
Client B: ◄────send(lock=A)──── (direct) + broadcast(lock=A)
```

**Result:** A gets lock, B sees `OTHER`. No split-brain.

### Scenario: Network Partition

```
Client A has lock (SELF)
Network fails
DO: onClose fires after timeout (~30s)
    → releases lock
    → broadcasts OPEN
Client A: reconnects
          onConnect → receives OPEN
          UI → OPEN
Client B: receives OPEN
          UI → OPEN
```

**Result:** Lock auto-released, both clients sync to `OPEN`.

### Scenario: Malicious Client

```
Client A gets lock
Client A modifies code to not send stop_editing
Client A closes tab
DO: onClose fires → releases lock
```

**Result:** Server-side cleanup handles it. Client cannot hold lock indefinitely.

---

## Persistence Guarantees

| Event | Lock State | Persisted? |
|-------|-----------|------------|
| DO restart | `activeUser` in storage | ✅ Yes |
| Client refresh | `onConnect` reads storage | ✅ Yes |
| Network blip | Storage unchanged | ✅ Yes |
| Client crash | `onClose` releases | ✅ Yes |
| Timeout | Client sends release | ✅ Yes (client-initiated) |

---

## Testing the Lock

### Unit Test Scenarios (for server.ts)

```typescript
// 1. First request gets lock
await server.onMessage('{"type":"start_editing","user":"Alice"}', connA);
assert(storage.get('activeUser') === 'Alice');

// 2. Second request rejected
await server.onMessage('{"type":"start_editing","user":"Bob"}', connB);
assert(storage.get('activeUser') === 'Alice');
assert(connB.sent.includes('"activeUser":"Alice"'));

// 3. Release by holder works
await server.onMessage('{"type":"stop_editing","user":"Alice"}', connA);
assert(storage.get('activeUser') === null);

// 4. Release by non-holder ignored
await server.onMessage('{"type":"stop_editing","user":"Bob"}', connB);
assert(storage.get('activeUser') === 'Alice');

// 5. Disconnect releases
await server.onClose(connA);
assert(storage.get('activeUser') === null);

// 6. New connection gets current state
const connC = new MockConnection();
await server.onConnect(connC, ctx);
assert(connC.sent.includes('"activeUser":"Alice"')); // if held
```

### Integration Test Checklist

- [ ] Two tabs: A gets lock, B sees locked
- [ ] A types → countdown stops
- [ ] A saves → lock releases, B sees open
- [ ] A gets lock, closes tab → B sees open within 30s
- [ ] A gets lock, waits 60s no typing → auto-releases
- [ ] Refresh during lock → state preserved
- [ ] Rapid click "start_editing" → only one succeeds

---

## Extending the Lock

### Add a Second Lock (e.g., Title Editing)

1. **Server**: New storage key `titleLock`, new message types
2. **Client**: New state enum, UI, handlers
3. **Broadcast**: Separate or combined messages

```typescript
// Server
if (data?.type === "start_title_edit") {
  const holder = await storage.get("titleLock");
  if (holder && holder !== data.user) { reject; return; }
  await storage.put("titleLock", data.user);
  broadcast({ type: "titleLock", activeUser: data.user });
}
```

### Server-Side Timeout (Future)

Replace client timeout with DO alarm:

```typescript
// In start_editing:
this.room.storage.setAlarm(Date.now() + LOCK_TIMEOUT_MS);

// In onAlarm:
const activeUser = await storage.get("activeUser");
if (activeUser) {
  await storage.delete("activeUser");
  broadcast({ type: "lock", activeUser: null });
}
```

**Benefit:** Works even if client is malicious/offline.

---

## Monitoring & Debugging

### PartyKit Dev Console
```
Connected: id=abc, room=story-123
Message: {"type":"start_editing","user":"Alice"}
Storage: put activeUser=Alice
Broadcast: {"type":"lock","activeUser":"Alice"}
```

### Key Metrics to Watch
- Lock acquisition latency (should be <100ms edge)
- Timeout trigger rate (high = UX issue)
- Disconnect release rate (high = network issues)

### Debug Commands
```bash
# View DO storage (PartyKit CLI)
partykit storage get stories-party --room story-123

# View connections
partykit connections stories-party --room story-123
```

---

## Summary

| Property | Implementation |
|----------|----------------|
| **Authority** | Durable Object `room.storage` |
| **Consistency** | Linearizable (single-threaded DO) |
| **Race freedom** | Atomic read-check-write |
| **Persistence** | Survives DO restart, client refresh |
| **Cleanup** | `onClose` + client timeout |
| **Sync** | Broadcast to all + `onConnect` |
| **Latency** | ~50-150ms (edge) |

This design makes the lock **deterministic, auditable, and self-healing** — the foundation for reliable collaborative writing.