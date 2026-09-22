# Spec: Ulysses-Inspired Redesign

## Overview
Redesign the co-writing platform's visual system to match Ulysses' design philosophy: **typography-first, content-focused, distraction-free**. No new features — only visual/theme changes to existing components.

## Goals
- Replace current font system (Archivo + IBM Plex Mono) with Ulysses-style typography
- Implement a warm, paper-like color palette 
- Simplify UI chrome — remove unnecessary borders, shadows, gradients
- Make "Reading Mode" (existing) feel like Ulysses' Focus Mode
- Ensure text is the visual priority everywhere

## Non-Goals
- No new features, routes, or components
- No changes to lock logic, WebSocket, Supabase, or data models
- No changes to collaboration flow or story format
- No mobile-specific layouts beyond responsive adjustments

## Background
Current design uses:
- Fonts: Archivo (sans) + IBM Plex Mono (mono) via `next/font/google`
- Colors: CSS variables in `globals.css` (`--ink`, `--paper`, `--accent` = orange `#d16a1c`)
- UI: Card-based with borders, backdrop-blur headers, paper-bg containers
- Reading Mode: Client-side toggle hiding editor/lock UI

Ulysses principles to adopt:
1. **Typography as UI** — font choice, size, line-height, measure carry the design
2. **Content over chrome** — minimal chrome, no cards/borders unless necessary
3. **Focus/Typewriter mode** — centered column, dimmed surroundings, current line highlight
4. **Warm paper tones** — off-white/cream light mode, warm dark gray dark mode
5. **Subtle accent** — single accent color used sparingly (links, current line, selection)

## Design

### Data Model
No changes.

### API / Interface
No changes.

### Visual System

#### Typography
```
Font Family: "Atkinson Hyperlegible" (primary) + "JetBrains Mono" (code/mono)
- Atkinson Hyperlegible: high legibility, distinctive characters, warm humanist feel
- JetBrains Mono: clean monospace for code/pen names/timestamps

Scale (rem, line-height):
- Display: 2.5rem / 1.2 (page titles only)
- H1: 2rem / 1.3
- H2: 1.5rem / 1.4
- Body: 1.125rem / 1.7 (18px base — larger for reading comfort)
- Small: 0.875rem / 1.5 (UI labels, metadata)
- Micro: 0.75rem / 1.4 (timestamps, badges)

Measure: max-width 38rem (≈608px) for story content — optimal reading width
```

#### Color Palette

**Light Mode (Paper)**
```
--bg: #faf8f5           // warm off-white
--bg-elevated: #f5f2ed  // slightly warmer for modals
--text: #2d2b28         // near-black, warm
--text-muted: #6b6760   // warm gray
--text-faint: #9c9890   // very muted
--accent: #c45500       // burnt orange (links, selection, current line)
--accent-hover: #a34400
--border: #e8e3da       // subtle warm border
--focus-line: #fff8e7   // current line highlight in focus mode
--selection: #ffe8d0    // text selection
```

**Dark Mode (Night)**
```
--bg: #1e1d1b           // warm near-black
--bg-elevated: #282623  // slightly lighter
--text: #ebe9e6         // warm near-white
--text-muted: #9c9890
--text-faint: #6b6760
--accent: #e67e22       // warmer orange for dark
--accent-hover: #f39c12
--border: #3d3a35
--focus-line: #353028
--selection: #4a3d2a
```

#### Spacing & Layout
- Base unit: 0.5rem (8px)
- Content column: centered, max-width 38rem, padding 2rem sides
- Vertical rhythm: 1.5rem (24px) between paragraphs
- Header: minimal, no backdrop-blur, just border-bottom

#### Components (Visual Changes Only)

| Component | Current | Ulysses-Inspired |
|-----------|---------|------------------|
| `Header` | backdrop-blur, logo + nav | Thin bottom border, text-only logo, subtle nav |
| `Rooms` (list) | Card grid with paper-bg, borders | Simple list, hover row highlight, no cards |
| `Story` card | Paper card with border | Row with title, genre badge, status dot |
| `Room` page | Paper-bg sections, bordered details | Clean sections, generous whitespace |
| `StoryEditor` | TipTap in bordered container | Full-width in content column, minimal chrome |
| `Reading Mode` | Hides editor/lock | Typewriter mode: centered, current line highlight, dimmed other lines |
| `OpeningLines` | Rotating quotes in details | Subtle epigraph at top of story list |
| `CreateRoom` modal | Paper-bg modal | Centered sheet, elevated bg, no border |
| Buttons | Orange bg, white text | Text buttons (accent color), primary = filled accent |
| Inputs | Bordered, gray bg | Underline only, accent focus |

#### Reading Mode (Focus Mode) Behavior
- Story content centered in 38rem column
- Current paragraph: full opacity
- Other paragraphs: 0.5 opacity (dimmed)
- Current line (where cursor is): subtle warm highlight (`--focus-line`)
- No editor, no lock UI, no header (or minimal)
- Exit on Escape or "Done" button

### Behavior
No behavioral changes — only visual.

## Testing Strategy
- Visual regression: Storybook or manual screenshots across light/dark
- Accessibility: WCAG AA contrast on all text
- Responsive: 320px, 768px, 1440px viewports
- Reading mode: keyboard navigation (Escape to exit), line highlight works

## Open Questions
1. **Font loading**: Self-host Atkinson Hyperlegible + JetBrains Mono, or use `next/font/google` (Atkinson not on Google Fonts)?
2. **Dark mode toggle**: Add OS-preference detection + manual toggle in header?
3. **Current accent (#d16a1c)**: Keep similar or shift to `--accent` above?
4. **Story list density**: Keep current density or more compact?

---