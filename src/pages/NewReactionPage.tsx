import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { MoleculeViewer } from "@/components/molecule/MoleculeViewer";
import {
  ArrowLeft, Download, CheckCircle2, FlaskConical, FileText,
  Dna, Check, X, TrendingUp, ShoppingCart, Droplets, Thermometer, Activity, Target,
  PencilLine, ScrollText, Beaker, Clock, AlertTriangle, BookOpen, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatScore, formatConfidenceLabel, CONFIDENCE_COLORS } from "@/lib/utils/formatting";
import SmilesDrawer from "smiles-drawer";
import { addHistoryEntry } from "@/lib/history";
import type { Enzyme, GroupStats } from "@/types/enzyme";

const KetcherEditor = lazy(() => import('@/components/reaction/KetcherEditor'));

// ── Error boundary ────────────────────────────────────────────────────────────

class RenderGuard extends Component<{ children: ReactNode; fallback: ReactNode }, { caught: boolean }> {
  state = { caught: false };
  static getDerivedStateFromError() { return { caught: true }; }
  componentDidCatch() {}
  render() { return this.state.caught ? this.props.fallback : this.props.children; }
}

// ── Enzyme lookup ─────────────────────────────────────────────────────────────

// ── Example SMILES ────────────────────────────────────────────────────────────
const HOMOFARNESOL   = 'CC(C)=CCC/C(C)=C/CC/C(C)=C/CCO';
const AMBROX         = 'CC1(C)CCC[C@@]2(C)[C@H]1CC[C@@]3(C)OCC[C@H]23';
const TAXADIENE      = 'CC1=C2CC[C@@]3(CCC=C([C@H]3C[C@@H](C2(C)C)CC1)C)C';
const TAXADIENOL     = 'CC1CC[C@@H]2C(C)(C)C=1CC[C@@]1(C)C(C2)C(=C)[C@@H](O)CC1';

// ── Example MOL V2000 strings (used by Ketcher editor) ───
const MOL = {
  HOMOFARNESOL: `
  -INDIGO-04012621222D

 17 16  0  0  0  0  0  0  0  0999 V2000
   -3.4641   -1.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -3.4641    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -4.3301    0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -2.5981    0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.7321    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.8660    0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000   -1.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.8660    0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.7321    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.5981    0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    3.4641    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    3.4641   -1.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    4.3301    0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    5.1962    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    6.0622    0.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    6.9282    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
  2  4  2  0  0  0  0
  4  5  1  0  0  0  0
  5  6  1  0  0  0  0
  6  7  1  0  0  0  0
  7  8  1  0  0  0  0
  7  9  2  0  0  0  0
  9 10  1  0  0  0  0
 10 11  1  0  0  0  0
 11 12  1  0  0  0  0
 12 13  1  0  0  0  0
 12 14  2  0  0  0  0
 14 15  1  0  0  0  0
 15 16  1  0  0  0  0
 16 17  1  0  0  0  0
M  END
`,
  AMBROX: `
  -INDIGO-04012621222D

 17 19  0  0  0  0  0  0  0  0999 V2000
   -1.3264   -1.8508    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.5000   -0.8660    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -2.4397   -1.2080    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -2.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -1.5000    0.8660    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.5000    0.8660    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.5000    0.8660    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
   -0.5000   -0.8660    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000   -1.7321    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0000   -1.7321    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.5000   -0.8660    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.0878   -1.6750    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    2.4781   -0.6581    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    2.5827    0.3364    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.6691    0.7431    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
  2  4  1  0  0  0  0
  4  5  1  0  0  0  0
  5  6  1  0  0  0  0
  6  7  1  0  0  0  0
  7  8  1  0  0  0  0
  7  9  1  0  0  0  0
  9  2  1  0  0  0  0
  9 10  1  0  0  0  0
 10 11  1  0  0  0  0
 11 12  1  0  0  0  0
 12 13  1  0  0  0  0
 12 14  1  0  0  0  0
 14 15  1  0  0  0  0
 15 16  1  0  0  0  0
 16 17  1  0  0  0  0
 17  7  1  0  0  0  0
 17 12  1  0  0  0  0
M  END
`,
  TAXADIENE:   'CC1=C2CC[C@@]3(CCC=C([C@H]3C[C@@H](C2(C)C)CC1)C)C',
  TAXADIENOL:  'CC1CC[C@@H]2C(C)(C)C=1CC[C@@]1(C)C(C2)C(=C)[C@@H](O)CC1',
};

const DEFAULT_ENZYME: Enzyme = {
  id: 'th-rd38b',
  name: 'Tyrosine Hydroxylase (variant TH-Rd38B)',
  ecNumber: 'EC 1.14.16.2',
  organism: 'E. coli (engineered)',
  score: 0.91,
  description: '',
  optimalPh: '7.2',
  optimalTemp: '34°C',
  kcat: '18.4 s⁻¹',
  km: '0.31 mM',
  projectedYield: '88%',
  vendor: '',
  vendorLogo: '',
  catalogNumber: '',
  price: '$310 / 10mg',
};

function getEnzymeForSubstrate(_smiles: string): Enzyme {
  return DEFAULT_ENZYME;
}

// ── Example data ──────────────────────────────────────────────────────────────

const EXAMPLE_PAIRS = [
  {
    label:      '(E,E)-Homofarnesol → Ambrox',
    shortLabel: 'Homofarnesol → Ambrox',
    substrate:  HOMOFARNESOL,  subMol: MOL.HOMOFARNESOL,
    product:    AMBROX,        prodMol: MOL.AMBROX,
  },
  {
    label:      'Taxadiene → Taxadien-5α-ol',
    shortLabel: 'Taxadiene → Taxadienol',
    substrate:  TAXADIENE,     subMol: MOL.TAXADIENE,
    product:    TAXADIENOL,    prodMol: MOL.TAXADIENOL,
  },
];

const REACTION_EXAMPLES = EXAMPLE_PAIRS.map(({ label, substrate, product }) => ({ label, substrate, product }));

// ── Validation ────────────────────────────────────────────────────────────────

function validateInput(value: string, onResult: (valid: boolean) => void) {
  const trimmed = value.trim();
  if (!trimmed) { onResult(false); return; }
  SmilesDrawer.parse(trimmed, () => onResult(true), () => onResult(false));
}

// ── Confidence badge ──────────────────────────────────────────────────────────


const ConfidenceBadge = ({ score }: { score: number }) => {
  const label = formatConfidenceLabel(score);
  const color = CONFIDENCE_COLORS[label];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-mono font-semibold shrink-0"
      style={{
        color,
        backgroundColor: color + '1a',
        border: `1px solid ${color}66`,
      }}
    >
      {formatScore(score)}
      <span className="font-normal opacity-80">confidence</span>
    </span>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ExampleChip = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-xs bg-muted hover:bg-muted/80 border border-border rounded-full px-3 py-1 font-mono cursor-pointer transition-colors"
  >
    {label}
  </button>
);

const ValidityBadge = ({ valid }: { valid: boolean | null }) => {
  if (valid === null) return null;
  return valid ? (
    <span className="inline-flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--success-600)' }}>
      <Check className="w-3 h-3" /> valid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-destructive">
      <X className="w-3 h-3" /> invalid
    </span>
  );
};

const KetcherFallback = () => (
  <div className="rounded-xl border border-border bg-muted/30 flex items-center justify-center h-72 text-sm text-muted-foreground">
    Loading editor…
  </div>
);

const SmilesColumn = ({
  label,
  value,
  valid,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  valid: boolean | null;
  onChange: (v: string) => void;
  placeholder: string;
}) => (
  <div className="flex flex-col gap-2 flex-1 min-w-0">
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <ValidityBadge valid={value.trim() ? valid : null} />
    </div>
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className={cn(
        'font-mono text-sm resize-none transition-colors rounded-xl',
        value.trim() && valid === false && 'border-destructive focus-visible:ring-destructive/30'
      )}
    />
    <div className="bg-muted/30 rounded-xl p-3 flex items-center justify-center min-h-[240px]">
      {value.trim().length >= 2 ? (
        <RenderGuard fallback={<p className="text-xs text-muted-foreground italic">Could not render structure</p>}>
          <MoleculeViewer key={value} smiles={value} width={340} height={225} />
        </RenderGuard>
      ) : (
        <p className="text-xs text-muted-foreground italic">Enter SMILES to preview</p>
      )}
    </div>
  </div>
);

// ── Find Enzymes button ───────────────────────────────────────────────────────

const FindEnzymesButton = ({ active, loading, onClick }: { active: boolean; loading?: boolean; onClick: () => void }) => (
  <div className="flex flex-col items-center gap-2">
    <button
      type="button"
      onClick={onClick}
      disabled={!active || loading}
      className={cn(
        'inline-flex items-center gap-2 px-8 py-3 rounded-full text-base font-semibold transition-all',
        (active && !loading) ? 'cursor-pointer font-bold' : 'cursor-not-allowed opacity-50'
      )}
      style={
        active
          ? { background: 'var(--primary-500)', color: '#fff', boxShadow: 'none' }
          : { border: '2px solid var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }
      }
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Dna className="w-5 h-5" />}
      {loading ? 'Searching…' : 'Find Biocatalyst'}
    </button>
    {loading && (
      <p className="text-sm text-muted-foreground text-center max-w-md">
        This may take a few minutes - we're searching through over 250 000 biocatalysts to find the best matches for you. ☕
      </p>
    )}
  </div>
);

// ── Protocol data ─────────────────────────────────────────────────────────────

const MW_TABLE: Record<string, { mw: number; name: string }> = {
  'CCCCCC(=O)O':                                        { mw: 116.16, name: 'Hexanoic acid' },
  'OC(=O)c1cc(O)cc(O)c1CCCCC':                         { mw: 210.23, name: 'Olivetolic acid' },
  'OC(=O)CCc1c(O)cc(O)c(CC=C(C)CCC=C(C)C)c1':         { mw: 360.45, name: 'CBGA' },
  'C#C[C@]1(CO)[C@@H](O)C[C@@H](OP(=O)(O)O)O1':       { mw: 254.22, name: 'Compound 3' },
  'C#C[C@]1(COP(=O)(O)O)[C@@H](O)C[C@@H](O)O1':       { mw: 254.22, name: 'Compound 4' },
  'CC(=O)CCc1cccc(N)c1':                                { mw: 177.24, name: '4-(3-Aminophenyl)butan-2-one' },
  'C[C@@H](O)CCc1cccc(N)c1':                            { mw: 179.26, name: '(R)-4-(3-Aminophenyl)butan-2-ol' },
};

function calcYieldGrams(substrateSMILES: string, productSMILES: string, yieldPct: number, startGrams = 1): string {
  const sub  = MW_TABLE[substrateSMILES.trim()];
  const prod = MW_TABLE[productSMILES.trim()];
  if (!sub || !prod) return '~0.8 g (estimated)';
  const mmol = (startGrams * 1000) / sub.mw;
  const productGrams = (mmol * (yieldPct / 100) * prod.mw) / 1000;
  return `${productGrams.toFixed(2)} g`;
}

// ── Protocol modal ────────────────────────────────────────────────────────────

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 mt-5 first:mt-0">{children}</p>
);

const ProtocolRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between py-1.5 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-mono font-medium text-foreground">{value}</span>
  </div>
);

const ProtocolModal = ({
  open, onClose, substrate, product, enzyme,
}: {
  open: boolean;
  onClose: () => void;
  substrate: string;
  product: string;
  enzyme: Enzyme;
}) => {
  const yieldPct = parseFloat(enzyme.projectedYield.replace('%', '')) || 85;
  const subInfo  = MW_TABLE[substrate.trim()];
  const prodInfo = MW_TABLE[product.trim()];
  const yieldGrams = calcYieldGrams(substrate, product, yieldPct);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
        <DialogHeader>
          <div className="flex flex-wrap items-start gap-3">
            <DialogTitle className="text-xl font-bold">Reaction Protocol</DialogTitle>
            <Badge variant="secondary" className="font-mono text-xs shrink-0">{enzyme.name}</Badge>
          </div>
        </DialogHeader>

        {/* Scale banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mt-1">
          <div className="flex items-center gap-2 mb-2">
            <Beaker className="w-4 h-4 shrink-0" style={{ color: 'var(--primary-500)' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--primary-600)' }}>
              Scale calculation · 1 g substrate
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: 'Substrate',  value: subInfo  ? `${subInfo.mw} g/mol`  : 'Unknown' },
              { label: 'Product',    value: prodInfo ? `${prodInfo.mw} g/mol`  : 'Unknown' },
              { label: 'Yield',      value: enzyme.projectedYield },
              { label: 'Product out', value: yieldGrams },
            ].map(({ label, value }) => (
              <div key={label} className="bg-background rounded-lg p-2 border border-primary/10">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-sm font-mono font-semibold text-foreground mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reagents */}
        <SectionHeading>Reagents &amp; Materials</SectionHeading>
        <div className="rounded-lg border border-border overflow-hidden">
          {[
            { label: subInfo?.name ?? 'Substrate',    value: '1.00 g (starting material)' },
            { label: enzyme.name,                      value: '5 mg · enzyme loading 0.5 mol%' },
            { label: 'NADPH (cofactor)',               value: '10 mM · sodium salt' },
            { label: 'Glucose-6-phosphate (GDH cycle)', value: '20 mM' },
            { label: 'Glucose dehydrogenase (GDH)',    value: '2 U/mL' },
            { label: 'Potassium phosphate buffer',     value: `100 mM · pH ${enzyme.optimalPh}` },
            { label: 'Total reaction volume',          value: '50 mL' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between px-3 py-2 border-b border-border/50 last:border-0 even:bg-muted/50">
              <span className="text-sm text-foreground">{label}</span>
              <span className="text-xs font-mono text-muted-foreground ml-4 text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* Procedure */}
        <SectionHeading>Procedure</SectionHeading>
        <ol className="space-y-2 text-sm text-foreground">
          {[
            `Prepare 100 mM potassium phosphate buffer, pH ${enzyme.optimalPh}. Degas with N₂ for 10 min.`,
            `Dissolve substrate (1.00 g) in 2 mL DMSO, then dilute into 45 mL buffer. Final DMSO ≤ 4% v/v.`,
            `Add NADPH (10 mM final), glucose-6-phosphate (20 mM), and GDH (2 U/mL). Mix gently.`,
            `Add ${enzyme.name} (5 mg). Adjust pH to ${enzyme.optimalPh} if necessary.`,
            `Incubate at ${enzyme.optimalTemp}, 200 rpm orbital shaking, for 4–6 h. Monitor conversion by TLC or HPLC every 90 min.`,
            `Quench with equal volume EtOAc. Centrifuge 5 min at 3000 × g to break emulsion.`,
            `Collect organic layer. Back-extract aqueous phase twice with EtOAc (2 × 20 mL). Combine organics.`,
            `Wash combined organics with brine (20 mL), dry over MgSO₄, filter, and evaporate in vacuo.`,
            `Purify by silica gel chromatography (hexane/EtOAc gradient). Expected yield: ${enzyme.projectedYield} → ${yieldGrams} product.`,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-[11px] font-mono font-semibold flex items-center justify-center" style={{ color: 'var(--primary-600)' }}>
                {i + 1}
              </span>
              <span className="leading-relaxed text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>

        {/* Reaction conditions */}
        <SectionHeading>Reaction Conditions</SectionHeading>
        <div className="rounded-lg border border-border overflow-hidden">
          {[
            { label: 'Temperature',      value: enzyme.optimalTemp },
            { label: 'pH',               value: enzyme.optimalPh },
            { label: 'Agitation',        value: '200 rpm orbital shaker' },
            { label: 'Atmosphere',       value: 'N₂ (anaerobic preferred)' },
            { label: 'Reaction time',    value: '4–6 h (HPLC-monitored)' },
            { label: 'k_cat',            value: enzyme.kcat },
            { label: 'K_m (substrate)',  value: enzyme.km },
          ].map(({ label, value }) => (
            <ProtocolRow key={label} label={label} value={value} />
          ))}
        </div>

        {/* Analytical */}
        <SectionHeading>Analytical Monitoring</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { icon: <Clock className="w-3.5 h-3.5" />, title: 'HPLC', body: 'C18 reverse-phase, 5 µm, 4.6 × 150 mm. Gradient: 10 → 90% MeCN / 0.1% TFA. Flow 1.0 mL/min. UV 254 nm.' },
            { icon: <Activity className="w-3.5 h-3.5" />, title: 'TLC', body: 'Silica 60 F₂₅₄. EtOAc/hexane 3:7. Visualise UV 254 nm + KMnO₄ stain.' },
            { icon: <BookOpen className="w-3.5 h-3.5" />, title: 'ee / Chiral HPLC', body: 'Chiralpak IA-3, 0.46 cm × 25 cm. Hexane/IPA 95:5, 0.8 mL/min.' },
            { icon: <Target className="w-3.5 h-3.5" />, title: 'Conversion target', body: '≥ 95% by HPLC peak area before workup.' },
          ].map(({ icon, title, body }) => (
            <div key={title} className="rounded-lg bg-muted/60 border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1 text-foreground font-medium">
                {icon}{title}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Safety */}
        <SectionHeading>Safety &amp; Handling</SectionHeading>
        <div className="rounded-xl border border-warning-500/40 bg-warning-50 dark:bg-warning-100/20 p-3 flex gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning-600" />
          <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
            <li>Handle enzyme powder under N₂; avoid prolonged air exposure (activity loss).</li>
            <li>DMSO penetrates skin — wear nitrile gloves and eye protection at all times.</li>
            <li>Dispose of organic solvent waste per institutional solvent waste procedures.</li>
            <li>This protocol is a mock template for demonstration; verify against your safety guidelines before use.</li>
          </ul>
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
          Generated by nitroAI · Mock protocol · {enzyme.ecNumber}
        </p>
      </DialogContent>
    </Dialog>
  );
};

// ── Result view ───────────────────────────────────────────────────────────────

const truncateSMILES = (s: string, max = 18) =>
  s.length > max ? s.slice(0, max) + '…' : s;

const ResultView = ({
  substrate,
  product,
  enzyme,
  onBack,
}: {
  substrate: string;
  product: string;
  enzyme: Enzyme;
  onBack: () => void;
}) => {
  const [protocolOpen, setProtocolOpen] = useState(false);
  return (
  <div className="max-w-3xl mx-auto space-y-8 p-6">
    <div className="mb-8">
      <div className="flex items-start gap-4 mb-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2 shrink-0">
          <ArrowLeft className="w-4 h-4" />
          Back to input
        </Button>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Enzyme Suggestion</h1>
      <p className="text-sm text-muted-foreground mt-1 font-mono">
        {truncateSMILES(substrate)} → {truncateSMILES(product)}
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: identity + kinetics */}
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground leading-tight">{enzyme.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-sm font-mono bg-muted border border-border px-2 py-0.5 rounded">
              {enzyme.ecNumber}
            </span>
            <span className="text-sm font-mono bg-muted border border-border px-2 py-0.5 rounded text-muted-foreground">
              {enzyme.organism}
            </span>
          </div>
          <div className="mt-3">
            <ConfidenceBadge score={enzyme.score} />
          </div>
        </div>
        <div className="border-t border-border" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Kinetic Parameters
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Droplets className="w-4 h-4" />,    label: 'Optimal pH',   value: enzyme.optimalPh   },
              { icon: <Thermometer className="w-4 h-4" />, label: 'Optimal Temp', value: enzyme.optimalTemp },
              { icon: <Activity className="w-4 h-4" />,    label: 'k_cat',        value: enzyme.kcat        },
              { icon: <Target className="w-4 h-4" />,      label: 'K_m',          value: enzyme.km          },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex flex-col gap-1.5 rounded-lg p-3 bg-muted/50 border border-border">
                <span className="text-muted-foreground">{icon}</span>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-base font-mono font-semibold text-foreground mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: yield + actions */}
      <div className="space-y-4">
        <div
          className="flex items-center gap-3 rounded-xl p-4"
          style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)' }}
        >
          <TrendingUp className="w-5 h-5 shrink-0" style={{ color: 'var(--primary-500)' }} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Projected Yield
            </p>
            <p className="text-3xl font-bold font-mono text-foreground">{enzyme.projectedYield}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={() => window.open('#', '_blank')}
          >
            <ShoppingCart className="w-4 h-4" />
            Buy · {enzyme.price}
          </Button>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-semibold text-white glow-green-sm transition-colors"
            style={{ background: '#1a7a4a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#155f3a')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a7a4a')}
          >
            <FlaskConical className="w-4 h-4" />
            Test with Nitroduck
          </button>
          <Button
            variant="outline"
            className="w-full gap-2 mt-2"
            onClick={() => setProtocolOpen(true)}
          >
            <ScrollText className="w-4 h-4" />
            View Protocol
          </Button>
        </div>
      </div>
    </div>
    <ProtocolModal
      open={protocolOpen}
      onClose={() => setProtocolOpen(false)}
      substrate={substrate}
      product={product}
      enzyme={enzyme}
    />
  </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

type View = 'select' | 'input' | 'result';
type Mode = 'smiles' | 'draw';

export const NewReactionPage = () => {
  const navigate     = useNavigate();

  const [view, setView]     = useState<View>('select');
  const [visible, setVisible] = useState(true);
  const isMobile = useIsMobile();
  const [mode, setMode]     = useState<Mode>('smiles');

  // If we're on mobile and the user somehow ends up in 'draw' mode (e.g. resize from desktop), bounce to SMILES.
  useEffect(() => {
    if (isMobile && mode === 'draw') setMode('smiles');
  }, [isMobile, mode]);
  const [substrateSmiles, setSubstrate] = useState('');
  const [productSmiles, setProduct]     = useState('');
  const [substrateValid, setSubstrateValid] = useState<boolean | null>(null);
  const [productValid, setProductValid]     = useState<boolean | null>(null);
  const [subLoadTrigger,  setSubLoadTrigger]  = useState<{ molfile: string; key: number } | undefined>(undefined);
  const [prodLoadTrigger, setProdLoadTrigger] = useState<{ molfile: string; key: number } | undefined>(undefined);
  const [drawStep, setDrawStep] = useState<1 | 2>(1);
  // Tracks live editor state for lossless step-switch restoration
  const subMolfileRef = useRef<string>('');  // MOL V2000 — used for substrate→product copy
  const prodMolfileRef = useRef<string>('');
  const subKetRef = useRef<string>('');      // KET (Ketcher native) — used for restoration
  const prodKetRef = useRef<string>('');
  const subFromEditorRef = useRef(false);
  const prodFromEditorRef = useRef(false);
  const firstMount = useRef(true);
  /** Tracks how draw mode was entered: 'tab' = empty board, 'editSub'/'editProd' = synced from SMILES */
  const drawOriginRef = useRef<'tab' | 'editSub' | 'editProd'>('tab');
  const [resultEnzyme, setResultEnzyme] = useState<Enzyme>(DEFAULT_ENZYME);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  /** Load a substrate + product pair into the two draw editors */
  const loadDrawPair = (subSmiles: string, subMolfile: string, prodSmiles: string, prodMolfile: string) => {
    // Clear stale KET refs so the new example's mol is used on step 2
    subKetRef.current = '';
    prodKetRef.current = '';
    setSubLoadTrigger(t => ({ molfile: subMolfile,  key: (t?.key ?? 0) + 1 }));
    setProdLoadTrigger(t => ({ molfile: prodMolfile, key: (t?.key ?? 0) + 1 }));
    setSubstrate(subSmiles);
    setProduct(prodSmiles);
  };

  // Fade transition on view change
  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; return; }
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [view]);

  useEffect(() => {
    validateInput(substrateSmiles, (v) => setSubstrateValid(substrateSmiles.trim() ? v : null));
  }, [substrateSmiles]);

  useEffect(() => {
    validateInput(productSmiles, (v) => setProductValid(productSmiles.trim() ? v : null));
  }, [productSmiles]);

  // Sync SMILES → draw editor. Skip when the change originated from the editor itself to prevent loops.
  useEffect(() => {
    if (subFromEditorRef.current) { subFromEditorRef.current = false; return; }
    if (!substrateSmiles.trim()) return;
    setSubLoadTrigger(t => ({ molfile: substrateSmiles.trim(), key: (t?.key ?? 0) + 1 }));
  }, [substrateSmiles]);

  useEffect(() => {
    if (prodFromEditorRef.current) { prodFromEditorRef.current = false; return; }
    if (!productSmiles.trim()) return;
    setProdLoadTrigger(t => ({ molfile: productSmiles.trim(), key: (t?.key ?? 0) + 1 }));
  }, [productSmiles]);

  const canSubmit = substrateSmiles.trim().length >= 2 && productSmiles.trim().length >= 2;
  const isActive = canSubmit;

  const goTo = (next: View) => setView(next);

  /** Switch to draw mode and open a specific step (1 = substrate, 2 = product).
   *  Button-based entry: always syncs content from SMILES fields. */
  const editInDraw = (step: 1 | 2) => {
    drawOriginRef.current = step === 1 ? 'editSub' : 'editProd';
    setMode('draw');
    setDrawStep(step);
    // Button-based entry: sync content into the editor
    if (substrateSmiles.trim()) {
      setSubLoadTrigger(t => ({ molfile: substrateSmiles.trim(), key: (t?.key ?? 0) + 1 }));
    }
    if (productSmiles.trim()) {
      setProdLoadTrigger(t => ({ molfile: productSmiles.trim(), key: (t?.key ?? 0) + 1 }));
    }
    goTo('input');
  };

  const selectMode = (m: Mode) => {
    setMode(m);
    if (m === 'draw') {
      drawOriginRef.current = 'tab';
      setDrawStep(1);
      // Tab-based entry: empty drawing board — don't load any triggers
      setSubLoadTrigger(undefined);
      setProdLoadTrigger(undefined);
      subKetRef.current = '';
      prodKetRef.current = '';
      subMolfileRef.current = '';
      prodMolfileRef.current = '';
    }
    goTo('input');
  };

  const handleFindEnzymes = async () => {
    if (!isActive || apiLoading) return;
    setApiError(null);

    let enzyme     = DEFAULT_ENZYME;
    let candidates: Enzyme[] = [];
    let groupStats: GroupStats | null = null;
    let comments: string[] = [];

    const fmt     = (v: unknown) => (v != null && v !== '' ? String(v) : 'Unavailable');
    const fmtTemp = (v: unknown) => (v != null && v !== '' ? `${v}°C` : 'Unavailable');
    // Lowercase the first letter of every word in an enzyme name
    const lowerName = (s: string) => s.replace(/\b\w/g, c => c.toLowerCase());
    const toEnzyme = (r: Record<string, unknown>, idx: number, baseScore: number): Enzyme => ({
      id:            (r.uniprot_id ?? r.uniprot ?? 'unknown') as string,
      name:          r.protein_name ? lowerName(String(r.protein_name)) : 'Unavailable',
      ecNumber:      (r.ec_number ?? 'Unavailable') as string,
      score:         Math.max(0, +(baseScore - idx * 0.008).toFixed(3)),
      organism:      (r.organism ?? 'Unavailable') as string,
      description:   (r.function ?? 'Unavailable') as string,
      optimalPh:     fmt(r.ph),
      optimalTemp:   fmtTemp(r.temperature),
      kcat:          fmt(r.kcat_per_s),
      km:            fmt(r.km_mM),
      projectedYield: 'Unavailable',
      vendor: '', vendorLogo: '', price: 'Unavailable', catalogNumber: 'Unavailable',
    });

    if (substrateSmiles.trim() && productSmiles.trim()) {
      setApiLoading(true);
      try {
        const response = await fetch('https://nitrocat-backend-production.up.railway.app/screen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            substrate_smiles: substrateSmiles.trim(),
            product_smiles:   productSmiles.trim(),
            top_k: 96,
            enrich: true,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || data?.status === 'error' || data?.status === 'ERROR') {
          const msg = (typeof data?.result === 'string' && data.result) ? data.result : (data?.error ?? `Server error (${response.status})`);
          setApiError(msg);
          setApiLoading(false);
          return;
        }

        comments = Array.isArray(data?.comments) ? data.comments : [];

        // Parse atom mapping confidence from comments (e.g. "Atom mapping confidence: 0.61.")
        const atomConfComment = comments.find((c: string) => c.toLowerCase().includes('atom mapping confidence'));
        const atomConfMatch = atomConfComment?.match(/([\d.]+)/);
        const baseScore = atomConfMatch ? parseFloat(atomConfMatch[1]) : 0.7;

        groupStats = data?.group_stats ?? null;

        candidates = (Array.isArray(data?.enzymes) ? data.enzymes : [])
          .map((r: Record<string, unknown>, idx: number) => toEnzyme(r, idx, baseScore));

        if (candidates.length > 0) enzyme = candidates[0];

      } catch {
        setApiError('Backend is unreachable. The server may be down — please try again later.');
        setApiLoading(false);
        return;
      }
      setApiLoading(false);
    } else {
      enzyme     = getEnzymeForSubstrate(substrateSmiles);
      candidates = [enzyme];
    }

    setResultEnzyme(enzyme);
    const substrateName = MW_TABLE[substrateSmiles.trim()]?.name ?? substrateSmiles.slice(0, 24);
    const productName   = MW_TABLE[productSmiles.trim()]?.name  ?? productSmiles.slice(0, 24);
    const confidence    = formatConfidenceLabel(enzyme.score);
    const reactionState: import('@/types/reaction').ReactionNodeData = {
      label:         (confidence === 'high' || confidence === 'good') ? 'Biocatalyst found' : 'Test biocatalysis',
      confidence,
      enzyme,
      substrateSmiles: substrateSmiles.trim(),
      productSmiles:   productSmiles.trim(),
      substrateName,
      productName,
      pathwayId:   'import',
      reactionId:  'result',
    };
    addHistoryEntry({
      id:       `reaction-${Date.now()}`,
      type:     'reaction',
      name:     `${substrateName} → ${productName}`,
      subtitle: enzyme.name,
    });
    navigate('/reactions/test/result', { state: { reaction: reactionState, candidates, groupStats, comments } });
  };

  // ── Select view ─────────────────────────────────────────────────────────────

  const SelectContent = (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-16 gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Find Biocatalyst</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose how you'd like to input your reaction</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          {(([
            { id: 'draw'  as Mode, icon: <PencilLine className="w-6 h-6 text-primary" />, label: 'Draw Structure' },
            { id: 'smiles' as Mode, icon: <FileText className="w-6 h-6 text-primary" />, label: 'SMILES' },
          ] as const).filter(t => !(isMobile && t.id === 'draw'))).map(({ id, icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectMode(id)}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:bg-accent transition-all group"
              style={{ cursor: 'pointer' }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                {icon}
              </div>
              <p className="font-semibold text-foreground">{label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Input view ───────────────────────────────────────────────────────────────

  const modeTabs: { id: Mode; label: string }[] = [
    ...(isMobile ? [] : [{ id: 'draw' as Mode, label: 'Draw Structure' }]),
    { id: 'smiles', label: 'SMILES' },
  ];

  const InputContent = (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-4 pt-14 sm:pt-4 flex flex-wrap items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="sm" onClick={() => goTo('select')} className="gap-1.5 shrink-0">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        {/* Mode tab switcher */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {modeTabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === 'draw') {
                  drawOriginRef.current = 'tab';
                  setDrawStep(1);
                  // Tab switch: empty drawing board
                  setSubLoadTrigger(undefined);
                  setProdLoadTrigger(undefined);
                  subKetRef.current = '';
                  prodKetRef.current = '';
                  subMolfileRef.current = '';
                  prodMolfileRef.current = '';
                }
                setMode(id);
              }}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={
                mode === id
                  ? { background: 'var(--bg-primary)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {mode === 'smiles' && (
          <>
            {/* Heading + examples — centered */}
            <div className="w-full px-4 sm:px-[95px] pt-2 space-y-2">
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">Enter SMILES</h1>
                <p className="text-sm text-muted-foreground">
                  Paste SMILES for your substrates and product.
                  <br />
                  Separate multiple substrates with dots. Or pick an example below.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium shrink-0">Examples:</span>
                {REACTION_EXAMPLES.map((ex) => (
                  <ExampleChip
                    key={ex.label}
                    label={ex.label}
                    onClick={() => { setSubstrate(ex.substrate); setProduct(ex.product); }}
                  />
                ))}
              </div>
            </div>

            {/* Columns — full width with symmetric margins for centering */}
            <div className="w-full px-4 sm:px-[95px] py-3">
              <div className="flex flex-col sm:flex-row gap-4 items-stretch">

                {/* Substrate column */}
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <SmilesColumn
                    label="Substrate"
                    value={substrateSmiles}
                    valid={substrateValid}
                    onChange={setSubstrate}
                    placeholder="e.g. CCCCCC(=O)O"
                  />
                </div>

                {/* Middle column — desktop only */}
                <div className="hidden sm:flex flex-col items-center gap-3 pt-9">
                  {/* Copy SMILES — at textarea level */}
                  <button
                    type="button"
                    onClick={() => setProduct(substrateSmiles)}
                    disabled={substrateSmiles.trim().length < 2}
                    className="inline-flex flex-col items-center justify-center px-3 py-2 text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed text-center leading-snug"
                    style={{ color: 'var(--success-600)', background: 'transparent' }}
                  >
                    <span>click to copy substrate<br />SMILES to product</span>
                    <span className="text-2xl leading-none mt-0.5" style={{ color: 'var(--primary-500)', opacity: 0.75 }}>⟶</span>
                  </button>

                  {/* Spacer fills remaining height */}
                  <div className="flex-1" />
                </div>

                {/* Product column */}
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <SmilesColumn
                    label="Product"
                    value={productSmiles}
                    valid={productValid}
                    onChange={setProduct}
                    placeholder="e.g. OC(=O)c1cc(O)cc(O)c1CCCCC"
                  />
                </div>
              </div>

              {/* Bottom row — three buttons on the same line (desktop only) */}
              <div className="hidden sm:flex gap-3 items-center mt-3">
                <button
                  type="button"
                  onClick={() => editInDraw(1)}
                  disabled={substrateSmiles.trim().length < 2}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-full text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed border"
                  style={{ borderColor: 'var(--success-600)', color: 'var(--success-600)', background: 'transparent' }}
                >
                  Edit Substrate in Drawing Tool
                </button>

                <button
                  type="button"
                  onClick={handleFindEnzymes}
                  disabled={!canSubmit || apiLoading}
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap shrink-0',
                    (canSubmit && !apiLoading) ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  )}
                  style={
                    canSubmit
                      ? { background: 'var(--primary-500)', color: '#fff', boxShadow: 'none' }
                      : { border: '2px solid var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }
                  }
                >
                  {apiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dna className="w-4 h-4" />}
                  {apiLoading ? 'Searching…' : 'Find Biocatalysts'}
                </button>

                <button
                  type="button"
                  onClick={() => editInDraw(2)}
                  disabled={productSmiles.trim().length < 2}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-full text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed border"
                  style={{ borderColor: 'var(--success-600)', color: 'var(--success-600)', background: 'transparent' }}
                >
                  Edit Product in Drawing Tool
                </button>
              </div>

              {/* Coffee message — shown below all buttons while loading */}
              {apiLoading && (
                <p className="hidden sm:block text-sm text-muted-foreground text-center mt-2">
                  This may take a few minutes - we're searching through over 250 000 biocatalysts to find the best matches for you. ☕
                </p>
              )}
            </div>

            {/* Mobile: copy + find biocatalysts + error */}
            <div className="px-4 sm:px-[95px] pb-4 space-y-3 sm:space-y-0">
              <div className="flex flex-col gap-3 sm:hidden">
                <button
                  type="button"
                  onClick={() => setProduct(substrateSmiles)}
                  disabled={substrateSmiles.trim().length < 2}
                  className="w-full inline-flex flex-col items-center justify-center px-3 py-2 text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: 'var(--success-600)', background: 'transparent' }}
                >
                  <span>click to copy substrate SMILES to product</span>
                  <span className="text-2xl leading-none mt-0.5" style={{ color: 'var(--primary-500)', opacity: 0.75 }}>⟶</span>
                </button>
                <FindEnzymesButton active={canSubmit} loading={apiLoading} onClick={handleFindEnzymes} />
              </div>
              {apiError && (
                <div className="flex items-start gap-2 rounded-full border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mt-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{apiError}</span>
                </div>
              )}
            </div>
          </>
        )}

        {mode === 'draw' && (
          <div className="max-w-3xl mx-auto w-full px-6 pt-1 pb-4 space-y-4">
            <>
            <h1 className="text-xl font-bold text-foreground">
              {drawStep === 1 ? 'Draw substrate(s)' : 'Draw your product'}
            </h1>

            {drawStep === 1 && (
              <p className="text-sm text-muted-foreground">Draw each substrate separately on the same drawing board.</p>
            )}

            {/* ── Examples above the canvas ─────────────────────────────── */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium shrink-0">Examples:</span>
              {EXAMPLE_PAIRS.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => loadDrawPair(ex.substrate, ex.subMol, ex.product, ex.prodMol)}
                  className="text-xs px-2.5 py-0.5 rounded-full border border-border bg-secondary hover:bg-tertiary hover:border-primary/50 text-foreground transition-colors cursor-pointer whitespace-nowrap"
                >
                  {ex.shortLabel}
                </button>
              ))}
            </div>

            {/* ── Single full-width editor ──────────────────────────────── */}
            <RenderGuard
              fallback={
                <div className="rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center h-72 gap-3 text-sm text-muted-foreground">
                  <Beaker className="w-8 h-8 opacity-40" />
                  <p>Structure editor failed to load.</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => selectMode('smiles')}>
                    Switch to SMILES input
                  </Button>
                </div>
              }
            >
              {drawStep === 1 ? (
                <Suspense key="substrate-editor" fallback={<KetcherFallback />}>
                  <KetcherEditor
                    onSmiles={(s) => { subFromEditorRef.current = true; setSubstrate(s); }}
                    onMolfile={(m) => { subMolfileRef.current = m; }}
                    onKet={(k) => { subKetRef.current = k; }}
                    height={400}
                    loadTrigger={subLoadTrigger}
                  />
                </Suspense>
              ) : (
                <Suspense key="product-editor" fallback={<KetcherFallback />}>
                  <KetcherEditor
                    onSmiles={(s) => { prodFromEditorRef.current = true; setProduct(s); }}
                    onMolfile={(m) => { prodMolfileRef.current = m; }}
                    onKet={(k) => { prodKetRef.current = k; }}
                    height={400}
                    loadTrigger={prodLoadTrigger}
                  />
                </Suspense>
              )}
            </RenderGuard>

            {apiError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}

            {/* ── Step navigation ───────────────────────────────────────── */}
            <div className="relative flex items-center justify-center w-full">
              {drawStep === 2 && !apiLoading && (
                <Button variant="ghost" size="sm" onClick={() => {
                  const restore = subKetRef.current || substrateSmiles.trim();
                  if (restore) setSubLoadTrigger(t => ({ molfile: restore, key: (t?.key ?? 0) + 1 }));
                  setDrawStep(1);
                }} className="absolute left-0 gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back to substrate
                </Button>
              )}

              {drawStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (drawOriginRef.current === 'tab') {
                        if (productSmiles.trim()) {
                          // Product already set (e.g. by example pill) — restore it
                          const restore = prodKetRef.current || productSmiles.trim();
                          if (restore) setProdLoadTrigger(t => ({ molfile: restore, key: (t?.key ?? 0) + 1 }));
                        } else {
                          // No product yet — copy substrate as starting point for editing
                          const subData = subKetRef.current || subMolfileRef.current || substrateSmiles.trim();
                          if (subData) {
                            setProdLoadTrigger(t => ({ molfile: subData, key: (t?.key ?? 0) + 1 }));
                            setProduct(substrateSmiles);
                          }
                        }
                      } else {
                        // Edit from SMILES: only copy substrate if no product exists
                        if (!productSmiles.trim()) {
                          const subData = subKetRef.current || subMolfileRef.current || substrateSmiles.trim();
                          if (subData) {
                            setProdLoadTrigger(t => ({ molfile: subData, key: (t?.key ?? 0) + 1 }));
                            setProduct(substrateSmiles);
                          }
                        } else {
                          // Product exists — restore from KET for lossless round-trip
                          const restore = prodKetRef.current || productSmiles.trim();
                          if (restore) setProdLoadTrigger(t => ({ molfile: restore, key: (t?.key ?? 0) + 1 }));
                        }
                      }
                      setDrawStep(2);
                    }}
                    disabled={!substrateSmiles.trim()}
                    className={cn(
                      'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all',
                      substrateSmiles.trim()
                        ? 'cursor-pointer'
                        : 'cursor-not-allowed opacity-50'
                    )}
                    style={
                      substrateSmiles.trim()
                        ? { background: 'var(--primary-500)', color: '#fff', boxShadow: 'none' }
                        : { border: '2px solid var(--border-default)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }
                    }
                  >
                    Next: Draw your product →
                  </button>
                ) : (
                  <FindEnzymesButton active={canSubmit} loading={apiLoading} onClick={handleFindEnzymes} />
                )}
            </div>
            </>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={cn('h-full transition-opacity duration-150', visible ? 'opacity-100' : 'opacity-0')}>
      {view === 'select' && SelectContent}
      {view === 'input'  && InputContent}
      {view === 'result' && (
        <ResultView
          substrate={substrateSmiles}
          product={productSmiles}
          enzyme={resultEnzyme}
          onBack={() => goTo('input')}
        />
      )}
    </div>
  );
};

export default NewReactionPage;
