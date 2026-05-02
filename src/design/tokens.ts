// ─────────────────────────────────────────────────────────────────────────────
// NITRO-CAT DESIGN TOKENS
//
// Single source of truth for all JS/TS design values.
// CSS custom properties in src/styles/globals.css must be kept in sync.
//
// ── HOW TO USE THIS FILE ─────────────────────────────────────────────────────
//
//   Redesign workflow:
//   1. Take this file to a Claude session and describe the changes you want.
//   2. Claude returns a modified version of this file.
//   3. Bring it back here and ask Claude to apply it:
//      - JS-side values auto-propagate since all components import from here.
//      - New color hex values → also update globals.css and both theme files.
//
//   What lives here vs globals.css:
//   - Here:        any value referenced in TypeScript (inline styles, confidence
//                  tier palettes, molecule element colors)
//   - globals.css: CSS custom properties consumed by Tailwind and CSS classes
//   - Both must match — comments show which CSS var each maps to.
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Brand palette ─────────────────────────────────────────────────────────────
// One muted forest green, paper-warm neutrals. Light/dark mode handled by CSS vars.
// In dark mode, --brand-primary lifts to #6FAF82 for contrast (defined in dark.css).

export const BRAND = {
  // Deep muted forest — primary CTA, links, active nav
  // CSS: --brand-primary (light: #2C5F3F, dark: #6FAF82)
  primary:            '#2C5F3F',

  // Hover state
  // CSS: --brand-primary-h
  primaryHover:       '#234C32',

  // Tint for selected/hover backgrounds
  // CSS: --brand-soft
  soft:               '#E8EFE9',

  // Darkest — headings on light, high-confidence text on light
  // CSS: --brand-ink
  ink:                '#1F2D24',
} as const;

// ── Confidence tier colors ─────────────────────────────────────────────────────
// Muted earthy tones — all in the same low-saturation register.
// CSS: --conf-high/good/medium/low
//
// IMPORTANT: these are light-mode values. In dark mode the CSS vars automatically
// lift to higher-contrast versions (defined in dark.css). If you read these values
// in JS at runtime, read the actual CSS var instead if dark mode matters:
//   getComputedStyle(document.documentElement).getPropertyValue('--conf-high')
// For now, components use these hex values directly (visible in both modes).

export const CONFIDENCE_COLORS: Record<'high' | 'good' | 'medium' | 'low', string> = {
  high:   '#2C5F3F',  // deep forest  — ≥ 0.9  → CSS: --conf-high
  good:   '#6B8C5A',  // muted olive  — ≥ 0.8  → CSS: --conf-good
  medium: '#B07A2E',  // muted ochre  — ≥ 0.5  → CSS: --conf-medium
  low:    '#9C3A2E',  // brick red    — < 0.5  → CSS: --conf-low
};

// Tinted rgba variants — background panels, border accents, tinted rings.
export const CONFIDENCE_TINTS: Record<
  'high' | 'good' | 'medium' | 'low',
  { bg: string; border: string; panel: string }
> = {
  high:   { bg: 'rgba(44,95,63,0.05)',   border: 'rgba(44,95,63,0.2)',   panel: 'rgba(44,95,63,0.07)'   },
  good:   { bg: 'rgba(107,140,90,0.05)', border: 'rgba(107,140,90,0.2)', panel: 'rgba(107,140,90,0.07)' },
  medium: { bg: 'rgba(176,122,46,0.05)', border: 'rgba(176,122,46,0.2)', panel: 'rgba(176,122,46,0.07)' },
  low:    { bg: 'rgba(156,58,46,0.05)',  border: 'rgba(156,58,46,0.2)',  panel: 'rgba(156,58,46,0.07)'  },
};

// ── Named shadows ──────────────────────────────────────────────────────────────
// Neutral — no color tint. Used in inline styles on action buttons.

export const SHADOWS = {
  // CSS: --shadow-sm/md/lg/xl
  btnPrimary:      '0 1px 2px rgba(0, 0, 0, 0.06)',
  btnPrimaryHover: '0 1px 3px rgba(0, 0, 0, 0.10)',
  btnPrimaryLg:    '0 4px 12px rgba(0, 0, 0, 0.08)',
} as const;

// ── Molecule element colors ────────────────────────────────────────────────────
// Passed directly to smiles-drawer. FOREGROUND/BACKGROUND follow the new palette.
// Element colors use CPK convention; adjusted for each background.

export const MOLECULE_THEMES = {
  light: {
    FOREGROUND: '#1F1E1B',  // → --text-primary (warm near-black)
    BACKGROUND: '#FAF9F5',  // → --bg-primary (warm off-white)
    C:  '#1F1E1B',
    O:  '#DC2626',
    N:  '#1D4ED8',
    F:  '#059669',
    CL: '#059669',
    BR: '#B45309',
    I:  '#7C3AED',
    P:  '#D97706',
    S:  '#D97706',
    B:  '#D97706',
    SI: '#D97706',
    H:  '#8A8780',  // → --text-tertiary
  },
  dark: {
    FOREGROUND: '#EDECE4',  // → --text-primary dark (warm off-white)
    BACKGROUND: '#2F2E2B',  // → --bg-elevated dark (warm charcoal)
    C:  '#EDECE4',
    O:  '#F87171',
    N:  '#60A5FA',
    F:  '#34D399',
    CL: '#34D399',
    BR: '#FCD34D',
    I:  '#A78BFA',
    P:  '#FBBF24',
    S:  '#FBBF24',
    B:  '#FBBF24',
    SI: '#FBBF24',
    H:  '#8A8780',
  },
} as const;

// ── Typography ────────────────────────────────────────────────────────────────
// Fonts loaded in globals.css via Google Fonts @import.

export const TYPOGRAPHY = {
  fontSans: '"Inter"',        // body, UI labels, headings — CSS: font-sans
  fontMono: '"JetBrains Mono"', // enzyme names, chemistry data — CSS: font-mono
} as const;

// ── Light mode structural colors ───────────────────────────────────────────────
// Reference only — match :root in globals.css / themes/light.css.

export const LIGHT = {
  bgPrimary:        '#FAF9F5',
  bgSecondary:      '#F5F4EE',
  bgTertiary:       '#EDEBE3',
  bgElevated:       '#FAF9F5',
  textPrimary:      '#1F1E1B',
  textSecondary:    '#5C5A52',
  textTertiary:     '#8A8780',
  textDisabled:     '#B8B5AC',
  borderDefault:    '#E1DED4',
  borderEmphasis:   '#C9C5B7',
  borderInteractive:'#2C5F3F',
} as const;

// ── Dark mode structural colors ────────────────────────────────────────────────
// Reference only — match .dark in globals.css / themes/dark.css.

export const DARK = {
  bgPrimary:        '#262624',
  bgSecondary:      '#2F2E2B',
  bgTertiary:       '#3A3936',
  bgElevated:       '#2F2E2B',
  textPrimary:      '#EDECE4',
  textSecondary:    '#B8B5AC',
  textTertiary:     '#8A8780',
  textDisabled:     '#5C5A52',
  borderDefault:    '#3F3D38',
  borderEmphasis:   '#565249',
  borderInteractive:'#6FAF82',
} as const;
