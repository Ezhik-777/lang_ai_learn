# Lang AI Learn — Interface System

**Scope:** in-app screens (dashboard, onboarding, test, practice/*). The
marketing landing at `/` lives in its own editorial register and uses scoped
tokens (`--paper`, `--ink`, `--oxblood`, `--rule`); the app interior uses the
workspace tokens defined below.

## Intent

**Who:** Russian-speaking adult learner — 20 quiet minutes after work or with
morning coffee. Wants progress they can see, mistakes corrected without
condescension, and to get on with it.

**What they do:** Open the app → see "where am I" → do one round (sentence,
phrase, listening) → see what they got wrong → close it.

**Feel:** Calm study workspace. A modern notebook. Restrained, warm, clearly a
tool — not a game, not a magazine. Distinctive without being decorative.

## Signature

- **Warm paper background** (`#faf8f3`) instead of cold-gray. Workspace feels
  inhabited, not sterile.
- **Indigo ink as the single accent.** One color does action, focus, and "you
  are here" — like fountain pen on paper.
- **Tabular Geist Mono for all data.** Levels, streaks, scores, character
  counts — anything that's a number reads in a refined mono with tabular
  figures.
- **Circular score gauge** in pronunciation — the one piece of visual data
  expression in the app. Everything else is plain text on rectangles.

## Tokens (`:root`)

```css
/* Workspace */
--bg:              #faf8f3;  /* warm off-white page */
--surface:         #ffffff;  /* card / input */
--surface-2:       #f5f2eb;  /* inset wells, sidebar */
--surface-hover:   #ede8dd;  /* hover state */
--border:          #e3ddcf;  /* standard separators */
--border-strong:   #c9c0ab;  /* emphasis borders */

--fg:              #1c1814;  /* primary text */
--fg-secondary:    #57514a;  /* supporting prose */
--fg-muted:        #948d80;  /* metadata, placeholders */

/* Single accent — indigo ink */
--accent:          #3730a3;
--accent-hover:    #312e81;
--accent-soft:     #eef2ff;
--accent-fg:       #ffffff;

/* Semantic — tuned warm */
--success:         #15803d;  --success-soft:  #ecfdf5;
--warning:         #b45309;  --warning-soft:  #fef3c7;
--danger:          #be123c;  --danger-soft:   #fff1f2;

/* Depth */
--shadow-sm:       0 1px 2px rgba(15,23,42,0.04);
--shadow-md:       0 1px 2px rgba(15,23,42,0.04), 0 2px 6px rgba(15,23,42,0.04);

/* Radius */
--radius-sm: 6px;  --radius-md: 8px;  --radius-lg: 12px;  --radius-xl: 16px;
```

**Text hierarchy:** `--fg` (body, titles) → `--fg-secondary` (supporting) →
`--fg-muted` (metadata, hints, placeholders) → `--accent` (action), then
semantic for scores/errors.

## Typography

| Role  | Family    | Where                                        |
|-------|-----------|----------------------------------------------|
| Body  | Geist     | Everything in-app                            |
| Mono  | Geist Mono | Numbers, levels, char counts, kbd, codes    |
| Display | Fraunces (SOFT/WONK) | **Landing only.** Not in the app. |

`.eyebrow` — 11px, weight 500, letter-spacing 0.06em, uppercase, `--fg-muted`.
Used as a small label above sections/cards. Replaces all-uppercase mono labels.

`.kbd` — small inline keyboard shortcut chip (border + mono).

Numbers always use `tabular-nums tracking-tight`. Scores in headlines use
`font-semibold`, level codes (`A2`, `B1`) use Geist Mono for clarity.

## Depth strategy

**Borders + very subtle shadow.** Pick one approach; don't mix.

- Cards: 1px border `--border`, radius `--radius-lg`, `--shadow-sm`.
- On hover (interactive cards): border → `--accent`, shadow → `--shadow-md`,
  `translate-y-px` lift optional.
- Inputs: 1px border `--border`, inset shadow 0 1px 2px rgba(15,23,42,0.02),
  focus → `--accent` border + 2px ring `--accent`/15 opacity.
- Sidebar: same `bg-[var(--surface-2)]` as inset wells, separated from main by
  a single 1px border, not a colour shift.
- No multi-layer drop-shadows. No glassmorphism. No gradients except the
  subtle background of the body itself (none currently — flat).

## Spacing

4px base. Common rhythm:

- Card padding: `p-5` (20px) for content cards, `p-6/sm:p-8` for hero/centered
  cards.
- Stack: `space-y-3` between related cards in a flow, `space-y-5/6` between
  major groups, `space-y-8` between top-level page sections.
- Card-internal gap: `gap-3/4` for control rows, `gap-6` for split content
  inside a card.
- Page wrapper: `mx-auto max-w-5xl px-5 sm:px-8 py-8 sm:py-10`.

## Layout shell

Sidebar (`260px`) on `lg+`, top bar on smaller. Sidebar has:

1. Logo cell — accent square + wordmark.
2. Language strip — flag + name + small mono CEFR badge.
3. Nav links — two-line: bold label + muted description; active state =
   `--surface-hover` background + 1.5px accent dot.
4. Footer — `<UserButton>` + version.

The mobile top bar collapses the nav into compact chips and shows the flag +
level inline.

## Component patterns

### Card
- `Card` — `rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6
  shadow-[var(--shadow-sm)]`. Pass `p-0` and add internal `border-b` rows for
  list-style cards.

### Button
Variants in `components/ui/button.tsx`:
- `primary` — indigo, white text. Default.
- `secondary` — surface + border, used for alternate actions.
- `outline` — `border-strong` only.
- `ghost` — text + surface-hover on hover.
- `danger` — `--danger` background.
- `subtle` — `--accent-soft` background with accent text. Used for filter-like
  pills.

Sizes: `sm h-8`, `md h-10` (default), `lg h-11`.

### Badge / ScorePill
`components/ui/badge.tsx`. Tones: neutral, accent, success, warning, danger.
Pill shape, 1px border same hue as background.

`<ScorePill score={n} />` auto-selects tone: ≥80 success, ≥50 warning, else
danger.

### Stat tile (dashboard)
Inline div with border + shadow-sm, top eyebrow label, big number row, optional
muted hint underneath. CEFR levels render in Geist Mono.

### Action card
Bordered card with title + description + right-aligned arrow that shifts on
hover. `disabled` state uses `border-dashed`, `surface-2`, no shadow, no link.

### Textarea
Paper-white surface, 1px border, inset 1px shadow, focus → accent border + 2px
accent/15 ring. Min height 140px.

### Score ring (pronunciation only)
SVG circle, 128×128, 8px stroke. Track in `--surface-hover`, fill in
`success/warning/danger`. Centered text: big tabular number + tiny uppercase
"из 100". Animates with `transition-all duration-700 ease-out` on dashoffset.

### Feedback split
Pair "Your answer" (plain `Card`) with "Corrected" (`--success-soft` Card,
`--success` eyebrow). Errors below in a single `p-0 Card` with `divide-y`
rows. Inline highlighting of mistakes: wavy underline in `--danger`.

### Pull-quote / tip
`flex items-start gap-3 border-[var(--accent)]/30 bg-[var(--accent-soft)]/40
p-5` Card with a small `◐` mark and `eyebrow !text-[var(--accent)]` label.
Used for "next focus" and "overall tip".

### Loading
Small `animate-pulse-dot` bar (2/3 width) instead of skeleton trees.
`animate-fade-in` for feedback blocks that appear after a check.

## States

Every interactive element must have hover, focus-visible (2px accent ring +
2px offset on `--bg`), disabled (opacity-50, no pointer events). Data states:
loading (pulse-dot line), empty (italic muted note), error (danger-soft Card
with danger eyebrow).

## Avoid

- Editorial decor in the app: roman numerals, "глава/рубрика/фолио",
  oversized italic display headlines, drop caps, double rule lines. Those
  live only on the landing.
- Multiple accent colours (a second accent dilutes the indigo).
- Hue shifts for elevation (raise via subtle shadow + same warm hue only).
- Filled status badges in headlines — use `ScorePill` for compact, big tabular
  number + `/100` for prominent.
- Sidebars with a different colour than the canvas — same warm paper, 1px
  border only.
- Mixing zinc-* tokens with the new tokens (legacy spots: any direct
  `text-zinc-*` / `bg-zinc-*` should be migrated when touched).

## Files of reference

- `app/globals.css` — tokens, eyebrow/kbd utilities, animations.
- `app/layout.tsx` — fonts (Geist Sans + Geist Mono in-app; Fraunces only for
  landing).
- `app/(app)/layout.tsx` — app shell wiring.
- `components/app-shell/sidebar.tsx` — `Sidebar` + `MobileTopbar`.
- `components/ui/{button,card,textarea,badge}.tsx` — primitives.
- `components/practice/SpeakButton.tsx` — TTS playback pill.
- `app/(app)/dashboard/page.tsx` — stat tile, action card, recent block.
- `components/test/LevelTestClient.tsx` — quiz state machine pattern.
- `components/practice/PronunciationPractice.tsx` — ScoreRing.
- `components/practice/SentencePractice.tsx` — split feedback pattern.
- `components/practice/ListeningPractice.tsx` — audio playback pattern.
