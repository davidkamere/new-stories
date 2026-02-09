# Real-time Co‑Writing Platform

A collaborative storytelling app where **exactly one writer** can type at a time. Built with **PartyKit on Cloudflare primitives** (Durable Objects + WebSockets) to keep lock ownership deterministic and guard against **WebSocket race conditions**. Stories update live, contributors are highlighted, and readers always see a consistent state.

---

## Why this project

WebSocket systems get tricky when multiple clients act at once. Here, several users can click “start writing” simultaneously, which creates race conditions around who owns the edit lock. The core goal is to **enforce single‑writer safety** while keeping everyone else live‑synced.

This project is a study in:
- **Lock acquisition + broadcast** using Durable Object storage
- **Timeout‑based lock release** to prevent deadlocks
- **Realtime UI state transitions** (open → self → locked)

---

## Architecture

- **Frontend:** Next.js App Router + TipTap editor
- **Realtime:** PartyKit (WebSocket server on Cloudflare Durable Objects)
- **Persistence:** Supabase (story content + status metadata)
- **Presence + status:** PartyKit lock broadcasts + Supabase realtime updates

---

## Lock lifecycle (race‑condition control)

1. Client sends `start_editing`
2. Durable Object checks `activeUser` in room storage
3. If free, lock is granted and broadcast to all clients
4. If occupied, request is rejected and UI stays locked
5. On submit or timeout, lock is released and broadcast

---

## Code snippets

### 1) Durable Object lock handling (PartyKit)
**File:** `stories-party/src/server.ts`

```ts
if (data?.type === "start_editing" && data?.user) {
  const activeUser = await this.room.storage.get<string>("activeUser");
  if (activeUser && activeUser !== data.user) {
    sender.send(JSON.stringify({ type: "lock", activeUser }));
    return;
  }

  this.connUsers.set(sender.id, data.user);
  await this.room.storage.put("activeUser", data.user);
  this.room.broadcast(JSON.stringify({ type: "lock", activeUser: data.user }));
  return;
}

if (data?.type === "stop_editing" && data?.user) {
  const activeUser = await this.room.storage.get<string>("activeUser");
  if (activeUser && activeUser === data.user) {
    await this.room.storage.delete("activeUser");
    this.room.broadcast(JSON.stringify({ type: "lock", activeUser: null }));
  }
  return;
}
```

### 2) Client lock → UI transitions
**File:** `app/room/[room_id]/page.tsx`

```ts
const handleMessage = (event: MessageEvent) => {
  const data = JSON.parse(event.data)
  if (data?.type === "lock") {
    const activeUser = data?.activeUser
    if (!activeUser) {
      setLockState('open')
      setEditable(false)
      setCurrentlyEditing(false)
      return
    }
    if (activeUser === penName) {
      setLockState('self')
      setEditable(true)
    } else {
      setLockState('other')
      setEditable(false)
      setCurrentlyEditing(false)
      setContent('')
      setClearContent(true)
    }
  }
}
```

### 3) Timeout release (self‑healing)
**File:** `app/room/[room_id]/page.tsx`

```ts
if (lockState === 'self' && content.trim().length === 0) {
  lockTimeoutRef.current = setTimeout(() => {
    if (lockState === 'self' && contentRef.current.trim().length === 0) {
      socketRef.current?.send(JSON.stringify({
        type: "stop_editing",
        user: penName,
      }))
      upsertStatus(room_id, 'Idle')
    }
    setLockCountdown(0)
  }, LOCK_TIMEOUT_MS)
}
```

### 4) Continue vs paragraph persistence
**File:** `app/room/[room_id]/page.tsx`

```ts
const header = `[pen:${penName || 'Anonymous'}|mode:${startMode}|at:${new Date().toISOString()}]`
const normalizedDraft = draft.replace(/\s*\n\s*/g, ' ').trim()

if (startMode === 'continue') {
  const updatedContent = `${story.story_content.trimEnd()} ${header} ${normalizedDraft}`
  await saveContributionToDB(updatedContent)
} else {
  const updatedContent = `${story.story_content.trimEnd()}\n\n${header}\n${normalizedDraft}`
  await saveContributionToDB(updatedContent)
}
```

---

## Suggested screenshots

1. **Home page with live typing indicator**
   - Caption: “Stories update live, with typing/active status.”

2. **Locked state (two tabs)**
   - Caption: “Single‑writer lock prevents collisions.”

3. **Editor with countdown**
   - Caption: “Idle lock timeout frees the room if no typing.”

4. **Contribution highlights**
   - Caption: “Hover to see author highlights.”

5. **Reading mode**
   - Caption: “Story‑first view with editor hidden.”

---

## Notes

- The lock is **authoritative at the edge** (Durable Object storage), not just in UI.
- The UI reflects server truth, so even simultaneous clicks resolve cleanly.
- Timeout keeps the system from stalling if someone grabs the turn and disappears.

