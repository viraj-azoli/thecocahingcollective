# Seeker UI redesign — "Calm Clinical"

**Date:** 2026-07-30
**Status:** Approved, ready for implementation planning
**Scope:** `tcco-app` seeker surface (11 screens) + auth surface (4 screens)

---

## 1. Why

The app reads as amateur, and the cause is not the palette. The brand tokens are
considered — a deep green `#1A5843`, warm cream `#F5EFDC`, a real type family. The
problem is that a component layer was never built, so every screen re-implements its
own version of everything.

Measured across the seeker surface: **3,855 lines, 330 inline `style={{…}}` props,
40 emoji standing in for icons.** The duplication is systematic:

| Thing | State today |
|---|---|
| `StatTile` | Defined **twice**, byte-identical CSS, as `.stat-card` and `.db-stat-card` |
| Avatar colour + initials helpers | Copy-pasted into **5** files |
| `StarRating` | **4** separate implementations |
| Mood 1–5 table | Duplicated **4** times |
| Date formatters | **7** functions across **6** files |
| `Skeleton.jsx` | Exists; used by **2 of 11** screens |

The audit also surfaced defects that are not cosmetic:

1. `.btn-primary` is orange (`var(--accent)` `#CD512F`) while `.btn-primary:hover` is
   hardcoded green `#27896F` — primary buttons change colour family on hover.
2. The settings `Toggle` is keyboard- and screen-reader-unreachable: the real `<input>`
   is `display:none` and the click handler sits on the decorative `<span>`.
3. Session cancellation uses `window.confirm()`, so the late-cancellation fee warning
   renders in raw OS browser chrome.
4. The booking wizard's `step` (1–4) and `showIntake` are orthogonal, so the header can
   render two titles at once. Step 4 is unreachable dead code — it was the success screen,
   orphaned when booking became a Stripe redirect.
5. `.spinner` and its keyframes live in `AppLayout.css`, which is not loaded on `/login`
   or `/signup` — so auth screens show no spinner at all.
6. Signup enforces a 6-character minimum password; reset enforces 8.
7. No `:focus-visible` styling exists anywhere in the app.

This redesign builds the missing component layer and fixes the above as a consequence.

---

## 2. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Visual direction | **Calm Clinical** | Restrained, hairline-bordered, generous whitespace. Fits a coaching/therapy context; reads credible rather than consumer. |
| Typography | **Inter** (interface) + **Newsreader** (headings, figures) | Serif numerals carry clinical credibility. Montserrat's geometric numerals read consumer-app. |
| Icons | **Lucide** (`lucide-react`) | Monoline, open-source, renders identically on every OS. Replaces all 40 emoji. |
| Surfaces | Seeker (11) + Auth (4) | Highest traffic and first impression. Coach/admin deferred. |
| Latitude | Visual + **layout refinement** | May restructure within a page; may not add/remove/reorder pages or change navigation. |
| Execution | **Foundation first**, then screens in tiers | The duplication is the disease; primitives are the cure. Fixes land once, not 15 times. |
| Styling tech | Plain CSS + custom properties | Matches the existing codebase. No Tailwind, no CSS-in-JS. One new dependency. |

---

## 3. Architecture

```
src/ui/
  tokens.css          Single source of truth for all design tokens
  primitives.css      Component classes, consuming tokens only
  index.js            Barrel export
  Icon.jsx            Lucide wrapper — the only place icons are imported
  <Primitive>.jsx     One file per primitive
src/lib/
  datetime.js         Replaces 7 duplicate formatters
  money.js            Locale-aware currency; replaces `'$' + amount`
```

**Rules:**

- Primitives consume tokens only. No literal colour, spacing, or radius values in a
  primitive.
- Screens consume primitives only. A screen must not define visual CSS; if it needs
  something new, that is a missing primitive.
- `style={{…}}` is permitted only for genuinely dynamic values (a computed bar height,
  a progress percentage). Anything static belongs in a class.

---

## 4. Token system

Concrete values. These are additive — see §7 for the compatibility strategy.

### Surfaces and borders
```
--surface-page      #FBFAF8   warm off-white, calmer than pure white
--surface-card      #FFFFFF
--surface-sunken    #F4F2ED
--surface-inverse   #16352C   sidebar
--border-hairline   #E4E9E7   the workhorse
--border-strong     #CBD8D2
```

### Brand and text
```
--brand             #1A5843   unchanged from today
--brand-hover       #144636
--brand-subtle      #E9EFEC
--accent            #CD512F   demoted to rare emphasis only
--text-primary      #16352C   green-black, warmer than pure black
--text-secondary    #5A6B64
--text-tertiary     #8A9A93
--text-inverse      #F7F5F0
```

### Semantic — desaturated, never colour alone
```
--success #2E7D5B  --success-subtle #E6F0EA   ✓ glyph
--warning #A66A1F  --warning-subtle #F7EFE1   ◷ glyph
--danger  #A8422F  --danger-subtle  #F6E9E5   ✕ glyph
--info    #3A6B7D  --info-subtle    #E8F0F3   ◉ glyph
--neutral #5A6B64  --neutral-subtle #F4F2ED
```
This replaces the seven colour-named badge variants (green/blue/yellow/red/gray/purple/teal).
Every badge renders a glyph alongside its hue so status survives greyscale and
colour-blindness.

### Type
```
--font-sans   'Inter', system-ui, sans-serif
--font-serif  'Newsreader', Georgia, serif

--text-xs   11px/1.45      --text-lg   18px/1.4
--text-sm   12px/1.5       --text-xl   22px/1.3
--text-base 14px/1.6       --text-2xl  28px/1.25
--text-md   16px/1.55

--figure-sm 22px  --figure-md 28px  --figure-lg 36px
            serif, font-variant-numeric: tabular-nums

--tracking-eyebrow .11em
```
Figures are `tabular-nums` so numbers do not jitter as they update.

### Space, radii, elevation, focus, motion
```
--space-1 4px   --space-2 8px   --space-3 12px  --space-4 16px
--space-5 20px  --space-6 24px  --space-8 32px  --space-10 40px  --space-12 48px

--r-xs 3px  --r-sm 4px  --r-md 6px  --r-lg 10px  --r-full 999px

--shadow-xs 0 1px 2px rgba(22,53,44,.04)
--shadow-sm 0 1px 3px rgba(22,53,44,.06)
--shadow-md 0 4px 12px rgba(22,53,44,.08)

--focus-ring 0 0 0 3px rgba(26,88,67,.22)

--dur-fast 120ms  --dur 180ms  --ease cubic-bezier(.2,.6,.2,1)
```

Radii tighten from today's 8/12/16px. Heavy rounding is the strongest consumer cue;
clinical products use tight corners. Elevation is nearly absent by design — hairline
borders carry separation instead. All motion is wrapped in
`@media (prefers-reduced-motion: reduce)`.

---

## 5. Primitives

41 components, plus an `Icon` wrapper and 2 utility modules. Counted by group:
Chrome 6 · Controls 9 · Display 11 · Overlay 3 · Composites 6 · Auth 6.

**Chrome** — `PageHeader` · `SectionHeader` · `Card` · `Divider` · `EmptyState` · `SkeletonPage`

**Controls** — `Button` · `IconButton` · `TextInput` · `TextArea` · `Select` · `FormField` ·
`Checkbox` · `Toggle` · `SearchInput`

**Display** — `Avatar` · `Badge` · `Tag` · `FilterChip` · `StatTile` · `PriceLabel` ·
`StarRating` · `ProgressBar` · `ProgressRing` · `MoodScale` · `BarChart`

**Overlay** — `Modal` · `ConfirmDialog` · `Toast` (restyle; keep the imperative
`showToast()` API — 22 call sites depend on it)

**Composites** — `CoachCard` · `SessionCard` · `ContentCard` · `DateGrid` · `TimeSlotGrid` ·
`StepWizard`

**Auth** — `AuthShell` · `AuthCard` · `PasswordInput` · `SocialAuthButton` · `Alert` ·
`StatusScreen`

**Utility** — `Icon` (Lucide wrapper) · `lib/datetime.js` · `lib/money.js`

Notes on the non-obvious ones:

- `Tag` and `FilterChip` are separate. Today `.chip` serves both a static label and an
  interactive toggle, so a coach's specialty looks identical to a clickable filter.
- `StarRating` needs read-only and interactive modes; four implementations collapse into one.
- `MoodScale` needs input and read-only modes, backed by a single 1–5 table.
- `Toggle` is rebuilt on a real focusable `<input>` with the label as the control surface.
- `StepWizard` owns booking-flow state so `step` and `showIntake` cannot contradict.

---

## 6. Screen conversion order

**Tier 1 — highest traffic, convert first**
`SeekerDashboard` · `SessionsPage` · `CoachesPage` · `CoachProfilePage`

**Tier 2**
`JournalPage` · `ProgressPage` · `LibraryPage` · `SettingsPage`

**Tier 3**
`CommunityPage` · `FavouritesPage` · `SeekerOnboarding`

**Auth** — `Login` · `SignUp` · `ResetPassword` · `AuthCallback`

`CoachProfilePage` is 759 lines and contains the booking wizard. It is deliberately
sequenced fourth, after the primitives have been proven on three simpler screens.

One screen per commit, each with a before/after screenshot, so any regression is
bisectable.

---

## 7. Compatibility with coach and admin

Coach and admin screens share `AppLayout.css` with seeker. They are **out of scope** and
must not visually change in this work.

Strategy: introduce `tokens.css` **additively** and alias the existing variable names to
the old values. Nothing coach or admin renders is repointed. New primitives consume the
new token names; legacy `AppLayout.css` classes continue to consume the legacy names.

Consequence, accepted deliberately: coach and admin will look dated beside the new seeker
screens until a later pass. That is the cost of scoping to seeker.

---

## 8. Defects fixed as part of this work

Not deferred — each is a direct consequence of building the primitive that replaces it.

1. `.btn-primary` hover colour-family flip — fixed by `Button` (primary becomes brand green).
2. `Toggle` keyboard/screen-reader inaccessibility — fixed by `Toggle`.
3. Both `window.confirm()` calls (session cancellation, journal deletion) — fixed by
   `ConfirmDialog`.
4. Booking wizard contradictory step state and orphaned step 4 — fixed by `StepWizard`.
5. Missing auth spinner keyframes — fixed by `AuthShell` owning its own styles.
6. Password minimum inconsistency — standardised on **8** characters in `PasswordInput`.
7. No `:focus-visible` anywhere — fixed by `--focus-ring` applied across all controls.
8. Status conveyed by colour alone — fixed by `Badge` rendering a glyph with every hue.

---

## 9. Testing

- The 11 existing vitest tests must continue to pass, unmodified.
- A render smoke test per primitive (mounts, renders children, respects variants).
- A keyboard pass on every interactive primitive: tab reaches it, Enter/Space activates,
  Escape dismisses overlays, focus is visible and returns correctly after a modal closes.
- Contrast verification on every token pair used for text on a surface, against WCAG AA.
- Before/after screenshots per screen via the dev server.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Visual regression while removing 330 inline styles | One screen per commit, screenshot before/after, bisectable |
| `CoachProfilePage` complexity (759 lines + booking wizard) | Sequenced fourth, after primitives are proven |
| Token changes leaking into coach/admin | Additive tokens with legacy aliases (§7); verify coach/admin screenshots are unchanged |
| Lucide bundle size | Import per-icon, never the barrel; verify chunk sizes after Tier 1 |
| Two new webfonts on first paint | `display=swap`, preconnect, subset to Latin |
| Scope creep into coach/admin | Explicitly out of scope; a screen outside the 15 listed is a new spec |

---

## 11. Out of scope

- Coach (10 screens) and admin (8 screens) surfaces.
- Navigation structure, page count, page order, information architecture.
- Any backend, schema, payment, or email change.
- The static marketing site under `pages/`.
