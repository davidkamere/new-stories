# Contributing Guidelines

Welcome! This document outlines how to contribute to the co-writing platform.

---

## Code of Conduct

- Be respectful and inclusive
- Focus on the code, not the person
- Assume good intent
- Help others learn

---

## Getting Started

1. Read [DEVELOPMENT.md](./DEVELOPMENT.md) for setup
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for design context
3. Pick an issue or propose a new one
4. Open a PR with a clear description

---

## Development Workflow

### Branch Naming
```
feature/<short-description>    # New feature
fix/<short-description>        # Bug fix
refactor/<short-description>   # Code improvement
docs/<short-description>       # Documentation
```

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
type(scope): brief description

Longer explanation if needed.

Fixes #123
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### Pull Requests
- **Title**: Clear, references issue
- **Description**: What, why, how to test
- **Size**: Small, focused PRs preferred
- **Checks**: Must pass lint + type-check

---

## Code Standards

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- No `any` — use `unknown` or proper types
- Prefer interfaces over types for object shapes
- Export types from where they're defined

### React
- Function components + hooks
- `'use client'` only where needed (browser APIs)
- Server components by default (App Router)
- Colocate state with where it's used

### CSS (Tailwind)
- Use design tokens from `globals.css` (`--ink`, `--paper`, etc.)
- Avoid arbitrary values — extend theme if needed
- Mobile-first, responsive utilities

### File Organization
```
app/
  components/        # Shared UI components
  room/[id]/         # Route-specific components live here
utils/
  db/                # Database layer only
  socket.js          # WebSocket helper
stories-party/
  src/server.ts      # DO logic only
```

---

## Lock System: Rules of Engagement

The single-writer lock is the **core invariant**. Changes here require extra care.

### Before Touching Lock Code
1. Read `stories-party/src/server.ts` completely
2. Read `app/room/[room_id]/page.tsx` lock handlers
3. Understand the three states: `open` | `self` | `other`
4. Test: simultaneous clicks, disconnect, timeout, refresh

### Lock Invariants (Must Hold)
- [ ] Only one `activeUser` in DO storage at a time
- [ ] All clients receive same lock state via broadcast
- [ ] `onConnect` sends current `activeUser` to new clients
- [ ] `onClose` releases lock if that user held it
- [ ] Timeout releases lock if content empty
- [ ] Save releases lock

### Testing Lock Changes
```bash
# Manual test matrix:
# 1. Open room in two browser tabs (different pen names)
# 2. Tab A: click "Tap to start writing" → gets lock
# 3. Tab B: click same → sees "Someone else is writing"
# 4. Tab A: type → countdown stops
# 5. Tab A: click "Add to Story" → saves, releases lock
# 6. Tab B: now sees "Tap to start writing"
# 7. Tab A: close tab → lock releases (onClose)
# 8. Tab A: get lock, wait 60s without typing → auto-releases
# 9. Refresh any tab → lock state syncs correctly
```

---

## Database Changes

### Migrations
- Write SQL in `supabase/migrations/` (if using Supabase CLI)
- Or run directly in Supabase Dashboard → SQL Editor
- Update `utils/db/actions.ts` types and queries
- Update any components reading/writing

### RLS Policies
Currently: **No RLS** (auth disabled). If enabling auth:
- Enable RLS on `Rooms` and `Status`
- Policies: `select` for all, `insert/update` for authenticated
- Lock bypasses RLS (DO is separate)

---

## Realtime Changes

### Cloudflare Workers (Lock)
- Edit `stories-party/src/server.ts`
- Test locally with `npx wrangler dev` (in stories-party/)
- Deploy with `npx wrangler deploy`
- Update `NEXT_PUBLIC_PARTYKIT_HOST` in Vercel

### Supabase Realtime (Status)
- Subscribe in components: `supabase.channel('...').on('postgres_changes', ...)`
- Publish via `upsertStatus()` in `actions.ts`
- Status values: `Typing:...`, `Active:...`, `Idle`, `Complete`

---

## Adding Features

### New UI Component
1. Create in `app/components/` (shared) or route folder (route-specific)
2. Use `'use client'` directive
3. Accept props with TypeScript interfaces
4. Follow existing patterns (modals, buttons, cards)

### New API Route
1. Create in `app/api/<route>/route.ts`
2. Use Supabase server client (not `supabaseClient`)
3. Return `NextResponse.json()`

### New Page
1. Create `app/<route>/page.tsx`
2. Add to navigation in `Header.tsx` if needed
3. Follow existing layout patterns

---

## Testing Checklist

Before submitting PR:

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] Manual lock test matrix passes (see above)
- [ ] No console errors in browser
- [ ] Mobile layout works (responsive)
- [ ] Reading mode toggle works
- [ ] Fork flow works

---

## Documentation

Update when changing:
- [ ] `README.md` — user-facing overview
- [ ] `ARCHITECTURE.md` — architectural decisions
- [ ] `DEVELOPMENT.md` — dev workflow
- [ ] Code comments — for complex logic
- [ ] TypeScript types — self-documenting

---

## Release Process

1. Merge to `main`
2. Vercel auto-deploys Next.js
3. Cloudflare Workers deploy separately if DO changed (`cd stories-party && npx wrangler deploy`)
4. Tag release: `git tag v0.x.x && git push --tags`

---

## Questions?

Open a GitHub issue with the `question` label, or start a discussion.

---

## License

By contributing, you agree your contributions will be licensed under the project's MIT License.