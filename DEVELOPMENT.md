# Development Guide

Local development workflow for the co-writing platform.

---

## Prerequisites

- Node.js 20+ (pinned via `.nvmrc`)
- npm
- Supabase account (for database)
- Cloudflare account (for Workers deployment, optional for local dev)

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd new-stories
nvm use           # switches to Node 20
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Start Cloudflare Worker dev server (terminal 1)
cd stories-party
npx wrangler dev

# 4. Start Next.js dev server (terminal 2)
cd ..
npm run dev
```

**URLs:**
- App: http://localhost:3000
- Worker WebSocket: ws://localhost:8787
- Worker Health: http://localhost:8787/health

---

## Environment Variables

Create `.env` in project root from `.env.example`:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key

# Cloudflare Workers (required)
NEXT_PUBLIC_PARTYKIT_HOST=ws://localhost:8787  # local dev
# NEXT_PUBLIC_PARTYKIT_HOST=wss://your-worker.your-subdomain.workers.dev  # production
```

---

## Project Structure

```
new-stories/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home: story list
│   ├── room/[room_id]/page.tsx   # Main room (lock, editor, display)
│   ├── components/               # React components
│   ├── globals.css               # Design system
│   └── layout.tsx
├── stories-party/                # Cloudflare Worker (Durable Object)
│   ├── src/server.ts             # Lock logic (THE core)
│   ├── wrangler.toml             # Workers config (DO bindings, migrations)
│   ├── package.json              # Worker deps
│   └── tsconfig.json             # TypeScript config
├── utils/
│   ├── socket.js                 # WebSocket connection helper
│   ├── db/
│   │   ├── actions.ts            # Supabase CRUD
│   │   └── supabase.js           # Supabase clients
│   └── auth.ts                   # Auth helpers (unused)
└── middleware.ts                 # Auth disabled
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `stories-party/src/server.ts` | **Lock authority** — read this first |
| `app/room/[room_id]/page.tsx` | Room page — lock state machine, editor, save |
| `app/components/StoryEditor.tsx` | TipTap editor (no collab) |
| `utils/db/actions.ts` | Supabase queries |
| `utils/socket.js` | WebSocket connection to Worker |
| `stories-party/wrangler.toml` | Worker config (DO bindings, migrations) |

---

## Running Tests

```bash
# No tests currently — add with:
# npm install -D vitest @testing-library/react
# npm test
```

---

## Linting & Type Checking

```bash
npm run lint              # ESLint (Next.js)
cd stories-party && npm run typecheck  # TypeScript check for Worker
```

---

## Database Schema (Supabase)

Run in Supabase SQL editor:

```sql
-- Rooms table
create table if not exists "Rooms" (
  room_id uuid primary key default gen_random_uuid(),
  story_title text not null default 'Untitled',
  story_content text not null default '',
  genre text,
  created_at timestamptz not null default now()
);

-- Status table (for realtime presence)
create table if not exists "Status" (
  room_id uuid primary key references "Rooms"(room_id) on delete cascade,
  status text not null default 'Idle',
  updated_at timestamptz not null default now()
);

-- Enable realtime
alter publication supabase_realtime add table "Status";
```

---

## Cloudflare Worker Development

### Local Dev Server
```bash
cd stories-party
npx wrangler dev
```
- Watches `src/server.ts` for changes
- Serves on `ws://localhost:8787`
- Durable Object: `ROOM` binding → `PartyServer` class
- Logs connections/messages to console

### Type Checking
```bash
cd stories-party
npm run typecheck
```

### Deploy to Cloudflare
```bash
cd stories-party
npx wrangler deploy
```
- Publishes DO to Cloudflare edge (uses SQLite-backed DO for free tier)
- Returns `https://stories-party.your-subdomain.workers.dev`
- Update `NEXT_PUBLIC_PARTYKIT_HOST` in Vercel/env

### Worker Config (`wrangler.toml`)
```toml
name = "stories-party"
main = "src/server.ts"
compatibility_date = "2024-08-25"
compatibility_flags = ["nodejs_compat"]

[durable_objects]
bindings = [
  { name = "ROOM", class_name = "PartyServer" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["PartyServer"]
```
**Key:** `new_sqlite_classes` enables SQLite-backed DOs (required for free plan).

---

## Common Tasks

### Add a New Lock Type
1. **Server** (`stories-party/src/server.ts`):
   - Add message type in `webSocketMessage`
   - Use separate storage key (e.g., `titleLock`)
   - Broadcast via `this.broadcast()`

2. **Client** (`app/room/[room_id]/page.tsx`):
   - Add lock state enum
   - Add UI for new lock
   - Send/handle messages

### Add a Database Column
1. Run migration in Supabase
2. Update `actions.ts` types/queries
3. Update components that read/write

### Change Editor Behavior
- `StoryEditor.tsx` — TipTap config, extensions
- `page.tsx` — `onContentChange`, `onStartEditing`, save logic

### Modify Story Parsing
- `parseStoryContent()` in `page.tsx` — regex, output format
- `colorForAuthor()` — hue generation
- `getRoomStatus()` — contributor logic

---

## Debugging

### Worker Logs
```bash
# In wrangler dev terminal
# Shows: connections, messages, storage reads/writes
```

### Browser DevTools
- **Network → WS** — inspect WebSocket frames
- **Console** — lock state transitions, errors
- **Application → LocalStorage** — pen names

### Supabase Dashboard
- **Table Editor** — inspect Rooms, Status
- **Logs → Realtime** — presence events

### Cloudflare Dashboard
- **Workers → stories-party → Logs** — production logs
- **Workers → Durable Objects** — inspect DO storage

---

## Useful Commands

```bash
# Clean install (root)
rm -rf node_modules package-lock.json && npm install

# Clean install (worker)
cd stories-party && rm -rf node_modules package-lock.json && npm install

# Type-check only (root)
npx tsc --noEmit

# Type-check only (worker)
cd stories-party && npm run typecheck

# Build for production (Next.js)
npm run build

# Preview production build
npm run start
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Missing SUPABASE_URL" | Check `.env` exists and vars are set |
| WebSocket connection fails | Ensure `wrangler dev` running on port 8787 |
| Lock not releasing | Check `webSocketClose` in server.ts, browser `beforeunload` |
| Story not saving | Check Supabase RLS policies, network tab for errors |
| TypeScript errors (root) | Run `npx tsc --noEmit`, check `@/*` paths in tsconfig |
| TypeScript errors (worker) | Run `npm run typecheck` in stories-party/ |
| "Durable Object namespace not found" | Run `wrangler deploy` to create DO migration |
| Node version errors | Run `nvm use` in project root (needs Node 20) |

---

## IDE Setup (VS Code)

Recommended extensions:
- TypeScript Hero
- Tailwind CSS IntelliSense
- Cloudflare Workers (for wrangler integration)

Settings:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true
}
```

---

## Adding a Feature: Checklist

- [ ] Update `ARCHITECTURE.md` if architectural
- [ ] Add types to `actions.ts` / component props
- [ ] Test lock behavior (open → self → other → open)
- [ ] Test timeout (wait 60s without typing)
- [ ] Test disconnect (close tab, reopen)
- [ ] Test fork flow
- [ ] Verify reading mode toggle
- [ ] Run `npm run lint` and `npx tsc --noEmit` (root)
- [ ] Run `npm run typecheck` in stories-party/