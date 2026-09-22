# Real-time Co‑Writing Platform

A collaborative storytelling app where **exactly one writer** can type at a time. Built with **PartyKit on Cloudflare primitives** (Durable Objects + WebSockets) to keep lock ownership deterministic and guard against **WebSocket race conditions**. Stories update live, contributors are highlighted, and readers always see a consistent state.

---

## Why this project

WebSocket systems get tricky when multiple clients act at once. Here, several users can click "start writing" simultaneously, which creates race conditions around who owns the edit lock. The core goal is to **enforce single‑writer safety** while keeping everyone else live‑synced.

This project is a study in:
- **Lock acquisition + broadcast** using Durable Object storage
- **Timeout‑based lock release** to prevent deadlocks
- **Realtime UI state transitions** (open → self → locked)

---

## Architecture

```
┌─────────────────┐     WebSocket      ┌────────────────────────┐
│   Next.js       │ ◄─────────────────► │  PartyKit Server       │
│   Frontend      │                     │  (Durable Object)      │
│                 │                     │  - Lock state in       │
│  - Room page    │                     │    room.storage        │
│  - Editor       │                     │  - Broadcasts lock     │
│  - Story list   │                     │    changes to all      │
└────────┬────────┘                     └───────────┬────────────┘
         │                                          │
         │ HTTPS                                    │
         ▼                                          ▼
┌─────────────────┐                     ┌────────────────────────┐
│    Supabase     │                     │    PartyKit Room       │
│                 │                     │    Storage (edge)      │
│  - Rooms table  │                     │  - activeUser          │
│  - Status table │                     │  - Y.Doc (optional)    │
└─────────────────┘                     └────────────────────────┘
```

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **Editor** | TipTap (headless, no collaboration extensions — uses custom lock) |
| **Realtime** | PartyKit (WebSocket server on Cloudflare Durable Objects) |
| **Persistence** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email/password) — currently disabled in middleware |

---

## Core Concepts

### Single-Writer Lock (Authoritative at the Edge)

The **Durable Object** is the sole source of truth for who holds the lock. `activeUser` lives in `room.storage` — persistent, consistent, and race-free.

**Server (`stories-party/src/server.ts`):**
```typescript
if (data?.type === "start_editing" && data?.user) {
  const activeUser = await this.room.storage.get<string>("activeUser");
  if (activeUser && activeUser !== data.user) {
    sender.send(JSON.stringify({ type: "lock", activeUser }));
    return; // Rejected — someone else has it
  }
  await this.room.storage.put("activeUser", data.user);
  this.room.broadcast(JSON.stringify({ type: "lock", activeUser: data.user }));
}
```

**Client (`app/room/[room_id]/page.tsx`):**
Three lock states reflected in UI:

| State | Meaning | UI |
|-------|---------|-----|
| `'open'` | No one writing | "Tap to start writing" button |
| `'self'` | You have the lock | TipTap editor + 60s countdown timer |
| `'other'` | Someone else writing | "Waiting on the writer…" |

### Timeout-Based Deadlock Prevention

When a user acquires the lock but types nothing, a **60-second countdown** starts. If still empty at expiry, the lock is auto-released (`stop_editing` sent). Countdown resets on any keystroke.

### Two Writing Modes

| Mode | Behavior | Storage Format |
|------|----------|----------------|
| `continue` | Appends inline to last paragraph | `existing [pen:Name\|mode:continue\|at:...] new text` |
| `paragraph` | Starts new paragraph | `existing\n\n[pen:Name\|mode:paragraph\|at:...]\nnew text` |

### Story Content Format

```
[pen:AuthorName|mode:continue|at:2024-01-15T10:30:00.000Z] First sentence.
[pen:AnotherUser|mode:paragraph|at:2024-01-15T10:31:00.000Z]
New paragraph content here.
[forked-from:Original Title]  (added when forking)
```

Parsed by `parseStoryContent()` for:
- Contributor list with unique colors (HSL hash of name)
- Highlighting on hover / own contributions
- Reading mode display

### Real-time Status Updates

Supabase Realtime on `Status` table shows live indicators:

| Status value | UI | TTL |
|--------------|-----|-----|
| `Typing:{timestamp}` | Green "Typing" dot | 2 min |
| `Active:{timestamp}` | "Recently active" ribbon | 30 min |
| `Idle` | None | — |
| `Complete` | Story marked complete | — |

---

## Data Model (Supabase)

**Rooms Table**
```sql
room_id (uuid, pk)
story_title (text)
story_content (text)  -- annotated format above
genre (text)
created_at (timestamp)
```

**Status Table**
```sql
room_id (uuid, pk, fk)
status (text)  -- 'Typing:...', 'Active:...', 'Idle', 'Complete'
```

---

## User Flow

1. **Home** (`/`) → See all stories with live status badges
2. **Click story** → Prompts for pen name (stored in `localStorage` per room)
3. **Room page** (`/room/[id]`) → Connects to PartyKit WebSocket
4. **Lock open** → Click "Tap to start writing" → sends `start_editing`
5. **Lock granted** → Editor appears, 60s countdown starts
5. **Write** → Choose Continue / New Paragraph
6. **Submit** → "Add to Story" modal → saves to Supabase, releases lock
7. **Read/Fork** → Reading mode hides editor; Fork creates new story

---

## Notable Implementation Details

- **No TipTap Collaboration Extensions** — Uses custom lock + plain TipTap (history disabled)
- **Pen names per-room** — Stored in `localStorage` keyed by `room_id`
- **WebSocket URL** — Configurable via `NEXT_PUBLIC_PARTYKIT_HOST` (local vs prod)
- **Auth disabled** — Middleware allows all routes public
- **Forking** — Creates new room with `[forked-from:Original]` marker
- **Contributor limit** — Max 12 unique authors per story

---

## File Map (Key Files)

```
/Users/davidkamere/Desktop/projects/new-stories/
├── app/
│   ├── page.tsx                    # Home: story list + create
│   ├── room/[room_id]/page.tsx     # Main room: lock, editor, display
│   ├── components/
│   │   ├── StoryEditor.tsx         # TipTap editor (no collab)
│   │   ├── Story.tsx               # Story card with status
│   │   ├── Rooms.tsx               # Story list with filters
│   │   ├── CreateRoom.tsx          # New story modal
│   │   ├── Header.tsx              # Navigation
│   │   └── OpeningLines.tsx        # Rotating quotes
│   ├── globals.css                 # Design system (CSS variables)
│   └── layout.tsx
├── stories-party/
│   ├── src/server.ts               # PartyKit Durable Object (lock logic)
│   ├── src/client.ts               # PartyKit demo client
│   └── partykit.json               # PartyKit config
├── utils/
│   ├── socket.js                   # WebSocket connection to PartyKit
│   ├── db/
│   │   ├── actions.ts              # Supabase CRUD (rooms, status)
│   │   └── supabase.js             # Supabase clients
│   └── auth.ts                     # Auth helpers (unused currently)
└── middleware.ts                   # Auth disabled
```

---

## Environment Variables (`.env`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
NEXT_PUBLIC_PARTYKIT_HOST=ws://127.0.0.1:1999  # local
# NEXT_PUBLIC_PARTYKIT_HOST=wss://your-party.partykit.dev  # prod
```

---

## Running Locally

```bash
# Install deps
npm install

# Start PartyKit dev server (in stories-party/)
cd stories-party && npx partykit dev

# Start Next.js (in root)
npm run dev
```

- Next.js: http://localhost:3000
- PartyKit: ws://127.0.0.1:1999

---

## Deployment

| Component | Target |
|-----------|--------|
| Next.js | Vercel |
| PartyKit | Cloudflare (via `partykit deploy`) |
| Supabase | Managed PostgreSQL |

PartyKit deploy publishes the Durable Object to Cloudflare's edge network. Update `NEXT_PUBLIC_PARTYKIT_HOST` to the deployed `wss://` URL.

---

## Extending the System

### Add a new lock type (e.g., "editing-title")
1. Server: Add message type in `server.ts` with its own storage key
2. Client: Add lock state enum, UI, and message handlers
3. Broadcast follows same pattern

### Add realtime cursors
- Enable `y-partykit` persistence callback
- Broadcast `yDoc` awareness via PartyKit
- Render remote cursors in `StoryEditor`

### Enable auth
- Remove middleware bypass
- Add `@supabase/auth-helpers-nextjs` SSR client
- Protect room routes, associate contributions with user ID

---

## License

MIT