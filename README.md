# Real-time Co‑Writing Platform

A collaborative storytelling app where **exactly one writer** can type at a time. Built with **Cloudflare Workers Durable Objects** (WebSockets + edge storage) to keep lock ownership deterministic and guard against **WebSocket race conditions**. Stories update live, contributors are highlighted, and readers always see a consistent state.

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
┌─────────────────┐     WebSocket      ┌─────────────────────────┐
│   Next.js       │ ◄─────────────────► │  Cloudflare Worker      │
│   Frontend      │                     │  (Durable Object)       │
│                 │                     │  - Lock state in        │
│  - Room page    │                     │    state.storage        │
│  - Editor       │                     │  - Broadcasts lock      │
│  - Story list   │                     │    changes to all       │
└────────┬────────┘                     └───────────┬─────────────┘
         │                                          │
         │ HTTPS                                    │
         ▼                                          ▼
┌─────────────────┐                     ┌─────────────────────────┐
│    Supabase     │                     │  DO SQLite Storage      │
│                 │                     │  (edge, consistent)     │
│  - Rooms table  │                     │  - activeUser           │
│  - Status table │                     │  - room metadata        │
└─────────────────┘                     └─────────────────────────┘
```

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **Editor** | TipTap (headless, no collaboration extensions — uses custom lock) |
| **Realtime** | Cloudflare Workers + Durable Objects (WebSocket server) |
| **Persistence** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email/password) — currently disabled in middleware |

---

## Core Concepts

### Single-Writer Lock (Authoritative at the Edge)

The **Durable Object** is the sole source of truth for who holds the lock. `activeUser` lives in `ctx.storage` — persistent, consistent, and race-free.

**Server (`stories-party/src/server.ts`):**
```typescript
if (data?.type === "start_editing" && data?.user) {
  const activeUser = await this.ctx.storage.get<string>("activeUser");
  if (activeUser && activeUser !== data.user) {
    ws.send(JSON.stringify({ type: "lock", activeUser }));
    return; // Rejected — someone else has it
  }

  this.connUsers.set(ws, data.user);
  await this.ctx.storage.put("activeUser", data.user);
  this.broadcast({ type: "lock", activeUser: data.user });
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
3. **Room page** (`/room/[id]`) → Connects to Cloudflare Worker WebSocket
4. **Lock open** → Click "Tap to start writing" → sends `start_editing`
5. **Lock granted** → Editor appears, 60s countdown starts
6. **Write** → Choose Continue / New Paragraph
7. **Submit** → "Add to Story" modal → saves to Supabase, releases lock
8. **Read/Fork** → Reading mode hides editor; Fork creates new story

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
├── stories-party/                  # Cloudflare Worker (Durable Object)
│   ├── src/server.ts               # Lock logic (THE core)
│   ├── wrangler.toml               # Cloudflare Workers config
│   ├── package.json                # Worker deps (wrangler, types)
│   └── tsconfig.json               # TypeScript config
├── utils/
│   ├── socket.js                   # WebSocket connection to Worker
│   ├── db/
│   │   ├── actions.ts              # Supabase CRUD (rooms, status)
│   │   └── supabase.js             # Supabase clients
│   └── auth.ts                     # Auth helpers (unused currently)
├── middleware.ts                   # Auth disabled (returns NextResponse.next())
├── .nvmrc                          # Node.js 20 (required for Next.js 14)
└── .env.example                    # Environment template
```

---

## Environment Variables

**Root `.env`** (create from `.env.example`):
```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key

# Cloudflare Workers WebSocket (required)
NEXT_PUBLIC_PARTYKIT_HOST=wss://your-worker.your-subdomain.workers.dev
# For local dev: NEXT_PUBLIC_PARTYKIT_HOST=ws://localhost:8787
```

---

## Running Locally

### Prerequisites
- Node.js 20+ (managed via `.nvmrc` — run `nvm use`)
- npm
- Supabase account
- Cloudflare account (for Workers deployment, optional for local dev)

### Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd new-stories
nvm use           # switches to Node 20
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
# For local Workers dev, set: NEXT_PUBLIC_PARTYKIT_HOST=ws://localhost:8787

# 3. Start Cloudflare Worker dev server (terminal 1)
cd stories-party
npx wrangler dev

# 4. Start Next.js dev server (terminal 2)
cd ..
npm run dev
```

**URLs:**
- Next.js App: http://localhost:3000
- Worker WebSocket: ws://localhost:8787
- Worker Health: http://localhost:8787/health

### Using Production WebSocket Locally

If you don't want to run the Worker locally, just set in `.env`:
```bash
NEXT_PUBLIC_PARTYKIT_HOST=wss://stories-party.davidkamere.workers.dev
```
Then only run `npm run dev` in the root.

---

## Deployment

### Frontend (Next.js) → Vercel
```bash
# Connect repo to Vercel, it auto-detects Next.js
# Add environment variables in Vercel dashboard
```

### WebSocket Server → Cloudflare Workers
```bash
cd stories-party
npx wrangler deploy
# Returns: https://stories-party.your-subdomain.workers.dev
```
Update `NEXT_PUBLIC_PARTYKIT_HOST` to the returned `wss://` URL.

| Component | Target | Free Tier |
|-----------|--------|-----------|
| Next.js | Vercel | 100GB bandwidth/mo |
| WebSocket (Durable Objects) | Cloudflare Workers | 100k requests/day, DO included |
| Database | Supabase | 500MB PostgreSQL |

---

## Extending the System

### Add a new lock type (e.g., "editing-title")
1. **Server** (`stories-party/src/server.ts`):
   - Add message type in `webSocketMessage`
   - Use separate storage key (e.g., `titleLock`)
   - Broadcast to room via `this.broadcast()`

2. **Client** (`app/room/[room_id]/page.tsx`):
   - Add lock state enum
   - Add UI for new lock
   - Send/handle messages

### Add realtime cursors
- Enable `ctx.storage` persistence in Worker
- Broadcast `awareness` via WebSocket
- Render remote cursors in `StoryEditor`

### Enable auth
- Remove middleware bypass in `middleware.ts`
- Add `@supabase/ssr` for Next.js App Router
- Protect room routes, associate contributions with user ID

---

## License

MIT