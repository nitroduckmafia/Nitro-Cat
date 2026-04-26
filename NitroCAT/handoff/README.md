# Handoff: Enzyme Puzzle — SynBioBeta Booth Game

## Overview

This is a redesigned booth game for the NitroCat SynBioBeta conference booth. Visitors are shown 6 enzymatic reactions (rendered as molecule structure diagrams) and must identify the one reaction that has no known enzyme. The game is accessible from the existing `/demo` route and fits into the existing `DashboardLayout` with `Sidebar`.

The prototype is in `Enzyme Puzzle.html`. Your task is to **re-implement this design in the existing NitroCat React/TypeScript codebase**, replacing the current `src/pages/dashboard/DemoPage.tsx`. Do not ship the HTML file — use it as a visual and behavioral reference only.

---

## Fidelity

**High-fidelity.** The HTML prototype is a pixel-accurate mockup. Recreate the layout, colors, typography, spacing, interactions, and modals as closely as possible using the existing Tailwind CSS tokens and shadcn/ui primitives defined in the codebase.

---

## Target Files

| File to create/modify | Purpose |
|---|---|
| `src/pages/dashboard/DemoPage.tsx` | Replace entirely with the new game UI |
| `src/data/synbiobeta_demo_sets.json` | Already exists — data source for the game (no changes needed) |
| `src/types/demo.ts` | Already exists — may need minor additions |

The sidebar already has a "Game" nav item pointing to `/demo` with a `Gamepad2` icon — **no routing or sidebar changes needed**.

---

## Data

**Source:** `src/data/synbiobeta_demo_sets.json`

This file contains 10 "sets". Each set has ~10 reactions, exactly 1 of which has `"is_impossible": true`. The rest are `"is_impossible": false`.

```ts
// Relevant fields per reaction
{
  id: string;              // e.g. "D13", "IMP01"
  ec: string;              // e.g. "2.4.1.91"
  ec_name: string;         // e.g. "Quercetin 3-O-glucosyltransferase (UGT)"
  substrate_name: string;  // e.g. "quercetin + UDP-glucose"
  product_name: string;    // e.g. "isoquercitrin + UDP"
  reaction_smiles: string; // "substrateSmiles>>productSmiles" (dot-separated fragments)
  story: string;           // Explanation shown after reveal
  is_impossible: boolean;
  n_training_examples?: number; // Only present on impossible reactions
}
```

**Per round:** Pick 1 impossible + 5 random doable reactions from a randomly selected set → shuffle → display 6 cards.

**SMILES parsing** (pick the main molecule — longest fragment):
```ts
function pickLongest(smiles: string): string {
  return smiles.split('.').reduce((a, b) => b.length > a.length ? b : a, '');
}
function parseReactionSmiles(reactionSmiles: string): { substrate: string; product: string } {
  const [left, right] = reactionSmiles.split('>>');
  return { substrate: pickLongest(left ?? ''), product: pickLongest(right ?? '') };
}
```

---

## Molecule Rendering

Use the existing `smiles-drawer` library already in the project. The working API (confirmed in browser) is:

```ts
import SmilesDrawer from 'smiles-drawer';

// Initialize once (store in a ref):
const drawer = new SmilesDrawer.SmiDrawer({ width: 170, height: 108 });

// Draw into a div container using the null-target + callback pattern:
drawer.draw(smiles, null, theme, (svgElement: SVGElement) => {
  container.innerHTML = '';
  container.appendChild(svgElement);
}, () => {
  // fallback on error
});
```

- `theme` should be `'dark'` or `'light'` based on `useTheme().resolvedTheme`
- Container should be a `<div>` (170×108px), **not** a `<canvas>`
- Redraw all molecules whenever theme changes
- The `SmiDrawer` instance can be reused across all cards — draw sequentially

---

## Game State

```ts
type Phase = 'guess' | 'revealed';

// Per-session (reset on page load or new round)
const [reactions, setReactions] = useState<DemoReaction[]>([]);  // 6 displayed
const [selectedId, setSelectedId] = useState<string | null>(null);
const [phase, setPhase] = useState<Phase>('guess');
const [roundResult, setRoundResult] = useState<'correct' | 'wrong' | null>(null);
const [score, setScore] = useState({ correct: 0, total: 0 });

// Modal visibility
const [wrongModalOpen, setWrongModalOpen] = useState(false);
const [correctModalOpen, setCorrectModalOpen] = useState(false);
```

**Round flow:**
1. `pickRound()` — select set, pick 5 doable + 1 impossible, shuffle, set `reactions`
2. User clicks a card → `setSelectedId(id)`
3. User clicks "Reveal Answer" → `reveal()`
   - If correct (selected is_impossible): increment `score.correct`, set `roundResult = 'correct'`, show correct modal
   - If wrong: increment `score.total` only, set `roundResult = 'wrong'`, show wrong modal
4. **Try Again** (from wrong modal): close modal, reset `selectedId` + `phase = 'guess'`, keep same `reactions`
5. **Next Round**: close modal, call `pickRound()`, reset `roundResult = null`

**Score counting rule:** `score.total` increments only once per round (on first reveal, regardless of retry). `score.correct` increments only for a correct first-try answer.

---

## Auto-reset

After any reveal, start a 30-second idle timer. On any mouse/keyboard/touch activity within those 30 seconds, cancel the timer.

If timer fires: show a countdown overlay counting down from 10, then call `pickRound()` automatically.

```ts
// Pseudocode
useEffect(() => {
  if (phase !== 'revealed') return;
  const timer = setTimeout(showResetOverlay, 30_000);
  const cancel = () => clearTimeout(timer);
  window.addEventListener('mousemove', cancel, { once: true, passive: true });
  window.addEventListener('click', cancel, { once: true });
  window.addEventListener('keydown', cancel, { once: true });
  return () => { clearTimeout(timer); /* remove listeners */ };
}, [phase]);
```

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Sidebar — unchanged, existing component]               │
│                │  [Instruction bar — sticky top]          │
│                │  [Score pill]  [instruction text]  [btn] │
│                │  ─────────────────────────────────────── │
│                │  [Game area — overflow-y: auto]           │
│                │  ┌──────┐ ┌──────┐ ┌──────┐             │
│                │  │ Card │ │ Card │ │ Card │             │
│                │  └──────┘ └──────┘ └──────┘             │
│                │  ┌──────┐ ┌──────┐ ┌──────┐             │
│                │  │ Card │ │ Card │ │ Card │             │
│                │  └──────┘ └──────┘ └──────┘             │
└─────────────────────────────────────────────────────────┘
```

The page lives inside the existing `DashboardLayout` with the `Sidebar`. No new layout wrappers needed — the page is the `Outlet` content.

---

## Instruction Bar

Sticky bar at the top of the page content area (inside the layout, not a global header).

- Background: `bg-secondary` (card/surface color)
- Border bottom: `border-b border-border`
- Padding: `px-6 py-2.5`
- Left side: Score pill (hidden until first round played) + instruction text
- Right side: "Reveal Answer" button (primary, disabled until card selected) OR "Next Round →" button (outline)

**Score pill:**
```tsx
<span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground bg-secondary border border-border rounded-full px-3 py-1">
  <Trophy className="w-3 h-3" />
  <span className="font-bold text-primary">{score.correct}/{score.total}</span>
</span>
```

**Instruction text:**
- `"Six reactions below. Only one has no known enzyme — can you find the impossible reaction?"`
- Font: `text-sm text-muted-foreground`
- "Only one has no known enzyme" in `text-primary font-semibold`

**Reveal button:**
- shadcn `<Button size="sm">` with `bg-primary` when active
- Disabled/opacity-40 when no card selected

---

## Reaction Card

Grid: `grid grid-cols-3 gap-3` inside the scrollable game area.

```tsx
<div className={cn(
  "rounded-xl border bg-secondary p-3.5 flex flex-col gap-2 transition-all",
  phase === 'guess' && "cursor-pointer hover:border-primary hover:bg-muted",
  selectedId === rxn.id && phase === 'guess' && "border-primary bg-muted ring-2 ring-primary/10",
  phase === 'revealed' && rxn.is_impossible && "border-danger-500 bg-danger-500/5",
  phase === 'revealed' && !rxn.is_impossible && "border-success-500",
)}>
  {/* Molecule row */}
  <div className="flex items-center gap-1.5">
    <div className="flex-1 h-[108px] bg-background rounded-lg overflow-hidden flex items-center justify-center">
      <div ref={substrateRef} style={{ width: 170, height: 108 }} />
    </div>
    <span className="text-xl text-primary/65 shrink-0">⟶</span>
    <div className="flex-1 h-[108px] bg-background rounded-lg overflow-hidden flex items-center justify-center">
      <div ref={productRef} style={{ width: 170, height: 108 }} />
    </div>
  </div>

  {/* Names */}
  <div className="grid grid-cols-[1fr_auto_1fr]">
    <span className="text-[10.5px] text-muted-foreground leading-snug">{rxn.substrate_name}</span>
    <span />
    <span className="text-[10.5px] text-muted-foreground leading-snug text-right">{rxn.product_name}</span>
  </div>

  {/* Badge */}
  <div className="flex justify-end">
    {/* See badge spec below */}
  </div>

  {/* Revealed body — see spec below */}
</div>
```

**No card numbers** — do not render any `#1`, `#2` etc.

### Card badges

| State | Badge |
|---|---|
| Selected (guess phase) | `● Your pick` — `bg-primary/10 text-primary` |
| Revealed + impossible | `✕ No enzyme found` — `bg-danger-500/10 text-danger-500` |
| Revealed + doable | `✓ Enzyme found` — `bg-success-500/10 text-success-500` |

Badge styles: `inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full`

### Revealed body (shown below badge after reveal)

**Impossible reaction:**
```tsx
<div className="pt-2.5 border-t border-border flex flex-col gap-2">
  <p className="text-[11.5px] text-muted-foreground italic leading-relaxed">{rxn.story}</p>
  {rxn.n_training_examples !== undefined && (
    <p className="text-[10.5px] font-mono text-danger-500">
      Only {rxn.n_training_examples} training example{rxn.n_training_examples !== 1 ? 's' : ''} in CLIPZyme's dataset
    </p>
  )}
</div>
```

**Doable reaction** (show mock enzyme candidates — no live backend needed):
```tsx
<div className="pt-2.5 border-t border-border flex flex-col gap-2">
  <p className="text-[11.5px] font-semibold text-success-500">✓ NitroCat found candidate enzymes</p>
  <table className="w-full text-[10.5px]">
    {/* 3 mock rows: ec_name, variant, homolog — with mock org and score */}
  </table>
</div>
```

Mock enzyme generation (deterministic from reaction id):
```ts
const MOCK_ORGS = ['Escherichia coli K-12', 'Bacillus subtilis 168', 'Streptomyces coelicolor', 'Saccharomyces cerevisiae', 'Pseudomonas putida KT2440', 'Aspergillus niger', 'Thermus thermophilus HB8'];

function mockScore(id: string, offset: number): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) & 0x7fffffff;
  return Math.max(0.55, 0.97 - offset * 0.085 - (h % 80) / 1000);
}

function getMockEnzymes(rxn: DemoReaction) {
  const base = rxn.ec_name.split('(')[0].trim();
  return [0, 1, 2].map(i => ({
    name: i === 0 ? rxn.ec_name : base + (i === 1 ? ' variant' : ' homolog'),
    org: MOCK_ORGS[(rxn.id.charCodeAt(0) * (i + 3)) % MOCK_ORGS.length],
    score: mockScore(rxn.id + i, i),
  }));
}
```

Score color: `≥0.9 → #3FB950`, `≥0.7 → #F59E0B`, `< 0.7 → #F87171`

---

## Modals

Use shadcn `<Dialog>` for both modals.

### Wrong Answer Modal (`max-w-lg`)

Triggered when user selects the wrong reaction and hits Reveal.

**Content:**
1. Header: red `✕` icon in rounded square + title "Not quite!" + subtitle "The impossible reaction was actually this one:"
2. Molecule pair (same layout as card: substrate div → arrow → product div, 170×108 each)
3. Names row (substrate name left, product name right)
4. EC monospace block: `{ec_name} · EC {ec}` — `font-mono text-sm bg-muted rounded px-2.5 py-1.5`
5. Story text: `text-sm text-muted-foreground italic leading-relaxed`
6. Training note (if present): `font-mono text-xs text-danger-500`
7. Divider
8. **Actions (stacked):**
   - "Try this set again" — primary button (full width) → close modal, keep same 6 reactions, reset to guess phase
   - "Join the waiting list 🧬" — outline button (full width) → `window.open('https://nitrocat.tech', '_blank')`
   - "Skip to next round →" — ghost/link text (full width) → close modal, call `pickRound()`

Draw molecules into the modal after it opens (use `useEffect` watching `open` state).

### Correct Answer Modal (`max-w-sm`)

Triggered when user correctly identifies the impossible reaction.

**Content:**
1. Large 🎉 emoji centered (`text-5xl`)
2. "You found it!" — `text-2xl font-bold text-center`
3. Score: `Score: {correct} / {total} correct` — `font-mono text-sm text-muted-foreground text-center`
4. Divider
5. iGEM callout box: `border border-primary bg-primary/5 rounded-xl p-4 flex items-center gap-3`
   - 📸 emoji (large)
   - Text: "You can take a photo with the **iGEM Grand Prize!**"
6. Divider
7. **Actions (stacked):**
   - "Join the waiting list 🧬" — primary button (full width)
   - "Next Round →" — outline button (full width)

---

## Auto-reset Countdown Overlay

Not a modal — a full-screen overlay on top of everything (high z-index).

```tsx
// Show after 30s of inactivity post-reveal
// Counts down from 10, then calls pickRound()
<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center">
  <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-xl">
    <h2 className="text-xl font-bold mb-2">Ready for the next visitor?</h2>
    <p className="text-sm text-muted-foreground mb-5">Starting a new round automatically</p>
    <div className="text-6xl font-bold font-mono text-primary mb-6">{countdown}</div>
    <Button variant="outline" onClick={cancelAndPlay}>Play now</Button>
  </div>
</div>
```

---

## Design Tokens Used

All tokens map to the existing `src/styles/globals.css` definitions:

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--bg-primary` / `bg-background` | `#0A0F0D` | `#FFFFFF` | Page bg, molecule viewer bg |
| `--bg-secondary` / `bg-secondary` | `#0F1612` | `#F7FBF9` | Card bg, instruction bar bg |
| `--bg-tertiary` / `bg-muted` | `#1A2420` | `#EFF6F3` | Hover states, selected cards |
| `--primary-500` / `text-primary` | `#538b5e` | `#538b5e` | Accents, borders, badges |
| `--success-500` | `#3FB950` | `#059669` | Doable card border, badge |
| `--danger-500` | `#F87171` | `#DC2626` | Impossible card border, badge |
| `--border-default` / `border-border` | `#2D3932` | `#E2E8F0` | All card borders |

Typography:
- Body: `font-sans` (IBM Plex Sans)
- Monospace data: `font-mono` (JetBrains Mono)

---

## Assets

| Asset | Location | Usage |
|---|---|---|
| Nitroduck logo | `public/images/nitroduck-logo.png` | Already in sidebar via existing `Sidebar.tsx` |
| Demo data | `src/data/synbiobeta_demo_sets.json` | Import directly — no API call needed for this page |

---

## Key Implementation Notes

1. **Load data locally** — `import demoSets from '@/data/synbiobeta_demo_sets.json'` (no API call). The `getDemoSets()` / `revealDemoSet()` API stubs are NOT needed for this redesign.

2. **Molecule rendering** — initialize one `SmilesDrawer.SmiDrawer` instance in a `useRef`. Redraw on theme change. Use `useEffect` with deps on `[reactions, resolvedTheme]` to trigger redraws.

3. **Theme** — use `useTheme()` from `next-themes`. Pass `resolvedTheme === 'dark' ? 'dark' : 'light'` to smiles-drawer.

4. **No card numbers** — do not render any ordinal labels on the cards.

5. **Try again** — same `reactions` array, just reset `selectedId` to `null` and `phase` to `'guess'`. Do NOT call `pickRound()`.

6. **smiles-drawer draw API** — use `drawer.draw(smiles, null, theme, (svg) => { container.innerHTML=''; container.appendChild(svg); }, onError)`. Do NOT pass a canvas element or CSS selector as the second argument — pass `null`.

---

## Files in this Handoff

```
handoff/
  README.md                  ← this file (full implementation spec)
  Enzyme Puzzle.html         ← visual + behavioral reference prototype
  synbiobeta_demo_sets.json  ← copy of the data file for reference
```
