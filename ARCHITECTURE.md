# Architecture Decision Records (ADRs)

This document records significant architectural decisions for the co-writing platform.

---

## ADR-001: Lock Authority in Durable Object Storage

**Date:** 2024  
**Status:** Accepted

### Context
Multiple clients can request the edit lock simultaneously. Client-side locking (optimistic UI) leads to race conditions where two users think they have the lock.

### Decision
The **Durable Object's `room.storage`** is the single source of truth for `activeUser`. All lock acquisitions and releases go through the DO. The DO broadcasts the resulting state to all connected clients.

### Consequences
- ✅ No split-brain: storage is linearizable
- ✅ Clients are dumb reflectors of server truth
- ✅ Reconnection syncs automatically (DO sends current `activeUser` on `onConnect`)
- ⚠️ Adds latency (round-trip to edge) for lock acquisition
- ⚠️ Requires Cloudflare Workers infrastructure

### Alternatives Considered
- **Client-side mutex with Supabase row locks** — higher latency, more complex
- **Centralized lock service** — additional infrastructure, same problems
- **CRDT/Yjs for concurrent editing** — rejects the "single writer" product requirement

### Implementation Note
Originally used PartyKit (which runs on Cloudflare Durable Objects). Now deployed directly to Cloudflare Workers with native Durable Objects (`new_sqlite_classes` for free tier). The lock logic is identical.

---

## ADR-002: Custom Lock Over TipTap Collaboration

**Date:** 2024  
**Status:** Accepted

### Context
TipTap provides `@tiptap/extension-collaboration` (Yjs-based) for real-time concurrent editing.

### Decision
**Do not use TipTap collaboration extensions.** Use a plain TipTap editor with `history: false`, controlled by the custom single-writer lock.

### Consequences
- ✅ Simpler mental model: one writer, no conflict resolution
- ✅ No Yjs dependency on client (smaller bundle)
- ✅ Deterministic content — no merge surprises
- ✅ Easier to reason about for contributors
- ❌ No concurrent editing (by design)
- ❌ No offline support (by design)

### Alternatives Considered
- **Yjs + TipTap collab** — supports concurrent edits but violates product constraint
- **Automerge** — same issue

---

## ADR-003: Story Content as Annotated Plain Text

**Date:** 2024  
**Status:** Accepted

### Context
Need to store story content with author attribution, writing mode, and timestamps.

### Decision
Store as a single `text` column with inline markers:
```
[pen:Alice|mode:continue|at:2024-01-15T10:30:00.000Z] Hello world.
[pen:Bob|mode:paragraph|at:2024-01-15T10:31:00.000Z]
New paragraph.
```

### Consequences
- ✅ Single column, no joins for reading
- ✅ Human-readable in DB
- ✅ Easy to parse with regex
- ✅ Forking just prepends `[forked-from:Title]`
- ⚠️ Parsing on every render (mitigated by memoization)
- ⚠️ No structured query on contributors (acceptable for this scale)
- ❌ Not normalized — hard to change schema later

### Alternatives Considered
- **Separate `Contributions` table** — normalized, but requires joins, more complex fork/merge
- **JSONB column** — structured but less portable, harder to diff

---

## ADR-004: Timeout-Based Lock Release

**Date:** 2024  
**Status:** Accepted

### Context
A user may acquire the lock then disappear (close tab, network loss, walk away). The lock would be held forever.

### Decision
Client-side 60-second countdown starts when lock is acquired with empty content. On expiry, client sends `stop_editing`. Server also releases on WebSocket disconnect (`onClose`).

### Consequences
- ✅ Self-healing: no manual intervention needed
- ✅ Dual release path (client timeout + server disconnect)
- ⚠️ Relies on client honesty (malicious client could not send release)
- ⚠️ Clock drift between client/server (mitigated: server is authority, client just triggers)

### Alternatives Considered
- **Server-side timeout** — more complex (DO alarms), but more secure
- **Heartbeat/keepalive** — adds complexity, same trust model

---

## ADR-005: Pen Names in localStorage (Per-Room)

**Date:** 2024  
**Status:** Accepted

### Context
Users need a display name for contributions. No auth system currently.

### Decision
Pen name stored in `localStorage` keyed by `room_id`: `penname:${room_id}`. Prompted on room entry if not set.

### Consequences
- ✅ Zero backend complexity
- ✅ Persists across sessions
- ✅ Different name per story (fun/roleplay)
- ❌ Not synced across devices
- ❌ Spoofable (no auth)
- ❌ Lost on cache clear

### Alternatives Considered
- **Supabase auth + profiles** — requires auth flow, overkill for MVP
- **URL param** — shareable but ugly, loses on refresh

---

## ADR-006: Supabase Realtime for Status, PartyKit for Lock

**Date:** 2024  
**Status:** Accepted

### Context
Two realtime channels needed: lock state (high consistency) and presence/status (ephemeral, eventually consistent).

### Decision
- **Lock** → PartyKit Durable Object (strong consistency, authoritative)
- **Status/presence** → Supabase Realtime (Postgres changes, ephemeral)

### Consequences
- ✅ Right tool for each job
- ✅ Status survives page refresh (in DB)
- ✅ Lock survives page refresh (in DO storage)
- ⚠️ Two WebSocket connections per client
- ⚠️ Two infrastructure pieces to operate

### Alternatives Considered
- **All in Cloudflare Workers** — DO storage not ideal for ephemeral presence; would need TTL cleanup
- **All in Supabase** — row locks for editing are slower, less deterministic

---

## ADR-007: Reading Mode as UI Toggle (No Backend Change)

**Date:** 2024  
**Status:** Accepted

### Context
Users want a distraction-free reading view.

### Decision
Pure client-side toggle (`readingMode` state). Hides editor, lock UI, controls. Shows parsed story content with contributor highlights.

### Consequences
- ✅ Zero backend work
- ✅ Instant toggle
- ✅ Preserves WebSocket connection (still receives lock/status updates)
- ⚠️ Lock can change while in reading mode (UI updates on return)

---

## ADR-008: Forking Creates New Room with Marker

**Date:** 2024  
**Status:** Accepted

### Context
Users want to branch a story without affecting the original.

### Decision
`createNewRoom` with copied content + `\n\n[forked-from:Original Title]` appended. New room gets new `room_id`, new pen name prompt.

### Consequences
- ✅ Original untouched
- ✅ Fork history preserved in content
- ✅ Independent lock, contributors, status
- ⚠️ No automatic merge/back-port (by design)
- ⚠️ Content duplication (acceptable for text)

---

## Summary Table

| ADR | Decision | Key Trade-off |
|-----|----------|---------------|
| 001 | DO storage for lock (Cloudflare Workers) | Latency for consistency |
| 002 | No TipTap collab | No concurrent edit |
| 003 | Annotated plain text | Parse cost, no SQL queries |
| 004 | Client timeout + server disconnect | Trusts client |
| 005 | localStorage pen names | Not cross-device |
| 006 | Two realtime systems (Workers + Supabase) | Two WS connections |
| 007 | Client-only reading mode | Lock can change unseen |
| 008 | Fork = new room + marker | No merge support |

---

## Future ADR Candidates

- [ ] **ADR-009:** Add auth — migrate pen names to user profiles
- [ ] **ADR-010:** Server-side lock timeout — DO alarms for malicious-client resistance
- [ ] **ADR-011:** Contributions table — normalize for analytics/queries
- [ ] **ADR-012:** WebRTC for peer-to-peer — reduce PartyKit load