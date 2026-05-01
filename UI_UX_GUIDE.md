# NitroCat UI/UX Guide

This document is the single source of truth for visual and interaction design in NitroCat. Read it before touching any component. It supplements `CLAUDE.md` with design intent, not just technical facts.

---

## 1. Brand & Identity

**Product name:** NitroCat (rendered as "NitroCat" in UI, file/URL slug `nitro-cat`)
**Tagline:** *Discover enzymes for your impossible reactions*
**Personality:** Precision scientific tool — clean, dark-lab aesthetic, not a consumer app. Think terminal + lab notebook, not a SaaS dashboard.
**Logo:** `/images/logo3.png` (dark mode) / `/images/logo4.png` (light mode). Always use the theme-resolved logo. Never use a hardcoded path.

---

## 2. Color System

### Semantic token usage
Never use raw Tailwind colors (e.g. `text-green-500`). Always use semantic CSS variables or the Tailwind config aliases that map to them.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg-primary` | `#FFFFFF` | `#0A0F0D` | Page backgrounds |
| `--bg-secondary` | `#F7FBF9` | `#0F1612` | Card/panel backgrounds |
| `--bg-tertiary` | `#EFF6F3` | `#1A2420` | Hover states, inset areas |
| `--bg-elevated` | `#FFFFFF` | `#141C18` | Modals, popovers |
| `--primary-500` | `#538b5e` | `#538b5e` | CTA buttons, active states, accents (sage) |
| `--primary-600` | `#059669` | `#34D399` | Hover on primary elements |
| `--border-default` | `#E2E8F0` | `#2D3932` | All default borders |
| `--border-interactive` | `#059669` | `#3FB950` | Focused inputs, hover borders |

### Brand accent palette
Promoted from the landing-page handoff so the same greens are available app-wide. Same hex in both modes (brand colors don't flip with theme):

| Token | Hex | Usage |
|---|---|---|
| `--green-sage` | `#538b5e` | Primary brand green; hover borders, secondary accents |
| `--green-bright` | `#6ca033` | Bright accent — landing CTA, step numbers, card highlights |
| `--green-bright-hover` | `#5a8a28` | Hover state for `--green-bright` buttons |
| `--green-dark` | `#25512b` | Deep accent — body leads, card titles, dark CTAs |
| `--amber` | `#B45309` | Warning accent (alias of `--warning-700`) |

### Confidence color scale (enzyme scoring)
This is a core visual language — keep it consistent everywhere. Logic is implemented in `formatConfidenceLabel()` in `src/lib/utils/formatting.ts`:

| Score | Label | Color token | Usage |
|---|---|---|---|
| ≥ 0.9 | `high` | `--success-*` (sage green) | `border-l-success-500` on enzyme cards |
| 0.8 – 0.899 | `good` | `--green-bright` | High-quality match accent |
| 0.5 – 0.799 | `medium` | `--warning-*` (amber) | `border-l-warning-500` on enzyme cards |
| < 0.5 | `low` | `--danger-*` (red) | `border-l-danger-500` on enzyme cards |

Always use `formatConfidenceLabel()` to derive the label. Do not inline the threshold logic.

### Glow utilities
Use these sparingly for emphasis — not decoration:

- `.glow-green` — hero CTAs, prominent interactive elements
- `.glow-green-sm` — subtle hover glow on secondary elements
- `.glow-success` — enzyme card hover (confidence-positive feedback)
- `.text-glow` — hero headings only

---

## 3. Typography

| Role | Font | Tailwind class |
|---|---|---|
| Body / UI text | Space Grotesk | `font-sans` |
| Data / scientific values | Urbanist | `font-mono` |
| Landing page body | Urbanist | (set directly on `.nc-landing`) |

**Rules:**
- Molecular formulas, enzyme EC numbers, kinetic values (k_cat, K_m, pH, temp), catalog numbers → always `font-mono`
- Section labels / micro-headings → `text-[10px] font-semibold uppercase tracking-widest text-muted-foreground`
- Page/card titles → `font-bold text-foreground`, size contextual (hero: `text-4xl sm:text-5xl`, panel header: `text-2xl`, modal: `text-xl`)
- Muted descriptions → `text-sm text-muted-foreground leading-relaxed`

> **Note:** Urbanist is technically a sans-serif, not a monospace. The `font-mono` alias is a project convention for "scientific data styling" — fixed-width alignment is not guaranteed.

---

## 4. Layout

### Outer shell
`DashboardLayout` = collapsible `Sidebar` (w-64 / w-14) + `Header` + scrollable main content area.

The sidebar collapses to icon-only mode. When collapsed, navigation labels and session history are hidden but icon buttons remain. The collapse state is local to the component (not persisted). Keep this behaviour — don't make it global state.

### Core screens
The current app routes are: `LandingPage` → `NewReactionPage` (Ketcher substrate/product editor) → `TestReactionPage` (ranked enzyme candidates). Plus `HistoryPage`, `SettingsPage`, `ProfilePage`, `DemoPage`, `NotFound`.

`MoleculeViewer` (used inside enzyme/results views) renders an SVG structure via `smiles-drawer`. Default canvas centered at 300×190px.

---

## 5. Component Patterns

### EnzymeCard
- `inline-flex` (not `w-full`) — card sizes to content, not the column
- 3px left border colored by confidence: `border-l-[3px]` + `border-l-{success|warning|danger}-500`
- Hover: `bg-muted hover:glow-success transition-all`
- Group hover: icon brightens (`group-hover:text-primary`), name brightens (`group-hover:text-foreground`)
- Always show: enzyme name, EC number · organism (monospace, muted), `ConfidenceScore` chip

### EnzymeModal
- `max-w-lg`, `p-0 overflow-hidden` — padding lives inside sections, not on the dialog itself
- Header section: `px-6 pt-6 pb-4 border-b` — title, EC + organism badges, confidence score, description
- Projected yield: large `text-2xl font-bold font-mono` in a `bg-muted/30` banner with `TrendingUp` icon — this is the hero metric
- Kinetic grid: 2-column, each cell `bg-muted/50 rounded-lg p-2.5`, icon + label (micro) + value (mono)
- Vendor row: logo initials avatar + vendor name + catalog number + price + "Order" button
- Dialog background: `var(--bg-elevated)` (not Tailwind bg classes) — avoids theme flicker

### EnzymeTable
- Used in `TestReactionPage` to render ranked enzyme candidates
- Column order: rank, enzyme name, EC + organism (mono), confidence chip, action
- Confidence chip uses `ConfidenceScore` (same colour mapping as `EnzymeCard`)

---

## 6. Sidebar

- **Logo**: theme-resolved via `useTheme().resolvedTheme`. Never render both and hide one.
- **New Reaction button**: `variant="outline"` with `border-dashed`. Navigates to `/reactions/new`.
- **Session history**: grouped by Today / Yesterday / Older. Each item truncated with `truncate`.
- **Active state**: `bg-accent text-accent-foreground font-medium` — driven by `location.pathname`.
- **Bottom section**: ThemeToggle + Settings + Profile — always visible, even when collapsed (icon-only).
- Collapse transition: `transition-all duration-300`.

---

## 7. LandingPage

The landing page is the design-handoff layout (sticky nav, hero, 5-step flow, "C–H hydroxylations — Success Cases" grid, deep-dive case modal). Layout-only rules live under `.nc-landing` / `.nc-landing-modal` in `src/styles/landing.css`. **Color/background/border tokens come from the global theme** — `landing.css` no longer scopes its own palette.

- Body font: Urbanist (set directly on `.nc-landing`)
- Brand greens used for hero copy, CTA, step numbers, card highlights: `--green-bright`, `--green-sage`, `--green-dark`
- Backgrounds, borders, ink colors: standard global tokens (`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--border-default`, `--border-emphasis`, `--text-primary`, `--text-secondary`, `--text-tertiary`)
- The case-deep-dive modal (`.nc-landing-modal`) currently still uses hardcoded hex values for some accent colors (peach-tone "negative comparison" pane). Those have no global equivalent yet — leave hardcoded until a token mapping is decided.

---

## 8. Spacing & Shape

- Border radius: `rounded-md` (small components), `rounded-lg` (cards, badges, containers), `rounded-xl` (molecule cards, pathway header card)
- Card padding: `p-4` to `p-6` depending on prominence
- Section gaps: `space-y-5` inside modals/panels
- Inline gaps: `gap-2` to `gap-3` for icon+label combos
- All interactive elements: minimum touch target of 32px (use `h-8 w-8` for icon buttons)

---

## 9. Interaction & Motion

- All hover transitions: `transition-all` or `transition-colors` — no custom durations unless sidebar collapse (`duration-300`)
- No page transition animations currently — don't add without a spec
- Modal open/close: shadcn/ui default Radix animation — do not override

---

## 10. Accessibility & States

- All buttons must have visible focus states (Radix/shadcn handles this for ui/ components)
- Icon-only buttons (collapsed sidebar) must have accessible labels — add `aria-label` if missing
- Confidence scores must not rely on color alone — the label text ("High", "Medium", "Low") must also be present
- Modals use Radix `Dialog` — keyboard trap and focus management are provided. Don't roll custom modals.
- Empty states: use italic muted text + relevant icon (e.g. `<Beaker>` + "No enzymes found"), never a blank area

---

## 11. What NOT to Do

- **Don't use raw hex colors** in className or style props — use CSS variables via `var(--token)` or Tailwind aliases
- **Don't use `w-full` on EnzymeCard** — it intentionally sizes to content
- **Don't remove `font-mono` from numeric/scientific data** — it's functional, not decorative
- **Don't add Tailwind green shades directly** (e.g. `bg-green-500`) — always go through the design token layer
- **Don't hardcode logo paths** — always resolve through `useTheme()`
- **Don't add a footer to the LandingPage** without a design spec
- **Don't change the confidence threshold values** (0.9 / 0.8 / 0.5) without updating `formatConfidenceLabel()` and this guide
- **Don't put `overflow` on the outer layout shell** — it belongs on the scroll containers only
- **Don't use bullet-point lists in UI text** — prose descriptions only

---

## 12. File & Component Ownership Map

| What you're changing | Files to touch |
|---|---|
| Colors / tokens | `src/styles/globals.css`, `src/styles/themes/light.css`, `src/styles/themes/dark.css` |
| Landing page styles | `src/styles/landing.css` (layout only — tokens come from theme files) |
| Enzyme card look | `src/components/enzyme/EnzymeCard.tsx`, `src/components/enzyme/ConfidenceScore.tsx` |
| Enzyme detail modal | `src/components/enzyme/EnzymeModal.tsx` |
| Enzyme results table | `src/components/enzyme/EnzymeTable.tsx` |
| Reaction editor | `src/components/reaction/KetcherEditor.tsx`, `src/components/reaction/YieldCard.tsx` |
| Molecule rendering | `src/components/molecule/MoleculeViewer.tsx` |
| Navigation / layout | `src/components/layout/Sidebar.tsx`, `src/components/layout/DashboardLayout.tsx`, `src/components/layout/Header.tsx` |
| Landing page | `src/pages/LandingPage.tsx`, `src/data/landing-reactions.ts` |
| Confidence logic | `src/lib/utils/formatting.ts` |
