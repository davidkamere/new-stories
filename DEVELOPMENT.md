# Development Guide

Local development workflow for the co-writing platform.

---

## Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (for database)
- PartyKit account (for realtime, or run locally)

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd new-stories
npm install

# 2. Configure environment
cp .env.example .env  # or create .env manually
# Edit .env with your Supabase credentials

# 3. Start PartyKit dev server (terminal 1)
cd stories-party
npx partykit dev

# 4. Start Next.js dev server (terminal 2)
cd ..
npm run dev
```

**URLs:**
- App: http://localhost:3000
- PartyKit WebSocket: ws://127.0.0.1:1999

---

## Environment Variables

Create `.env` in project root:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key

# PartyKit (required)
NEXT_PUBLIC_PARTYKIT_HOST=ws://127.0.0.1:1999  # local dev
# NEXT_PUBLIC_PARTYKIT_HOST=wss://your-party.partykit.dev  # production
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
├── stories-party/                # PartyKit Durable Object
│   ├── src/server.ts             # Lock logic (THE core)
│   ├── src/client.ts             # Demo client (unused)
│   └── partykit.json             # PartyKit config
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
| `utils/socket.js` | PartyKit WebSocket connection |

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
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript check
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

## PartyKit Development

### Local Dev Server
```bash
cd stories-party
npx partykit dev
```
- Watches `src/server.ts` for changes
- Serves on `ws://127.0.0.1:1999`
- Logs connections/messages to console

### Deploy to Cloudflare
```bash
cd stories-party
npx partykit deploy
```
- Publishes DO to Cloudflare edge
- Returns `wss://` URL for `NEXT_PUBLIC_PARTYKIT_HOST`

### PartyKit Config (`partykit.json`)
```json
{
  "name": "stories-party",
  "main": "src/server.ts",
  "compatibilityDate": "2024-08-25",
  "serve": {
    "path": "public",
    "build": "src/client.ts"
  }
}
```

---

## Common Tasks

### Add a New Lock Type
1. **Server** (`stories-party/src/server.ts`):
   - Add message type in `onMessage`
   - Use separate storage key (e.g., `titleLock`)
   - Broadcast to room

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

### PartyKit Logs
```bash
# In PartyKit dev terminal
# Shows: connections, messages, storage reads/writes
```

### Browser DevTools
- **Network → WS** — inspect WebSocket frames
- **Console** — lock state transitions, errors
- **Application → LocalStorage** — pen names

### Supabase Dashboard
- **Table Editor** — inspect Rooms, Status
- **Logs → Realtime** — presence events

---

## Useful Commands

```bash
# Clean install
rm -rf node_modules package-lock.json && npm install

# Type-check only
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run start
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Missing SUPABASE_URL" | Check `.env` exists and vars are set |
| WebSocket connection fails | Ensure PartyKit dev server running on 1999 |
| Lock not releasing | Check `onClose` in server.ts, browser `beforeunload` |
| Story not saving | Check Supabase RLS policies, network tab for errors |
| TypeScript errors | Run `npx tsc --noEmit`, check `@/*` paths in tsconfig |

---

## IDE Setup (VS Code)

Recommended extensions:
- TypeScript Hero
- Tailwind CSS IntelliSense
- PartyKit (if available)

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
- [ ] Run `npm run lint` and `npx tsc --noEmit`