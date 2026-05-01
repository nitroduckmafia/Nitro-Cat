import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Dna, Wrench,
  ExternalLink, Plus, HelpCircle, Share2,
  ChevronDown, ChevronUp, BookOpen, CheckCircle2, Clock, FlaskConical,
  Loader2, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatScore } from '@/lib/utils/formatting';
import { MoleculeViewer } from '@/components/molecule/MoleculeViewer';
import type { ReactionNodeData } from '@/types/reaction';
import type { Enzyme, GroupStats } from '@/types/enzyme';
import { YieldCard } from '@/components/reaction/YieldCard';

// ── Similar Transformations ───────────────────────────────────────────────────

type SimiPublication = {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
};

type SimiResult = {
  rank: number;
  rhea_id: string;
  reaction: string;
  score: number;
  score_morgan: number;
  score_drfp: number;
  ec: string[];
  confidence: number;
  url: string;
  publications: SimiPublication[];
};


// ── Group stats panel ─────────────────────────────────────────────────────────

const GroupStatsPanel = ({ groupStats, comments }: { groupStats: GroupStats; comments: string[] }) => {
  const rankedComment = comments.find(c => c.toLowerCase().includes('ranked'));

  const fmtN = (n: number, d = 1) => Number.isInteger(n) ? String(n) : n.toFixed(d);

  const metrics: { label: string; unit: string; stat: import('@/types/enzyme').GroupStatNumeric }[] = [
    ...(groupStats.temperature ? [{ label: 'Temperature', unit: '°C',   stat: groupStats.temperature }] : []),
    ...(groupStats.ph          ? [{ label: 'pH',          unit: '',     stat: groupStats.ph          }] : []),
    ...(groupStats.km_mM       ? [{ label: 'Km',          unit: ' mM',  stat: groupStats.km_mM       }] : []),
    ...(groupStats.kcat_per_s  ? [{ label: 'kcat',        unit: ' s⁻¹', stat: groupStats.kcat_per_s  }] : []),
  ];

  const cofactors = groupStats.cofactors.filter(c => c.name !== 'more').slice(0, 4);

  if (metrics.length === 0 && cofactors.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Candidate pool — known kinetics &amp; conditions ({groupStats.n_enzymes} returned)
        </p>
        {rankedComment && (
          <span className="text-[10px] text-muted-foreground">{rankedComment}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        {metrics.map(({ label, unit, stat }) => (
          <div key={label} className="min-w-[100px]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm font-bold text-foreground">{fmtN(stat.median)}{unit}</p>
            <p className="text-[11px] text-muted-foreground">
              {fmtN(stat.min)}–{fmtN(stat.max)}{unit}
              <span className="text-muted-foreground/60 ml-1">(n={stat.n})</span>
            </p>
          </div>
        ))}
        {cofactors.length > 0 && (
          <div className="min-w-[100px]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Cofactors</p>
            <div className="flex flex-wrap gap-1">
              {cofactors.map(c => (
                <span key={c.name} className="text-[11px] bg-muted border border-border rounded-full px-2 py-0.5 text-foreground">
                  {c.name} <span className="text-muted-foreground/70">×{c.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Mock candidate generator ──────────────────────────────────────────────────

// TODO: wire backend — call API with top_k: 96 to get all candidates
const MOCK_ORGS = [
  '', // placeholder — replaced with top1.organism at index 0
  '(variant A)',
  'Bacillus subtilis',
  'Streptomyces coelicolor',
  'Rhodotorula glutinis',
  'Pseudomonas putida',
  'Aspergillus niger',
  'Candida antarctica',
  'Thermoanaerobacter ethanolicus',
  'Fusarium oxysporum',
  'Nocardia farcinica',
  'Arthrobacter simplex',
];

const buildCandidates = (top1: Enzyme): Enzyme[] =>
  Array.from({ length: 96 }, (_, i) => ({
    ...top1,
    id: `${top1.id}-cand-${i + 1}`,
    score: Math.max(0, +(top1.score - i * 0.008).toFixed(3)),
    organism: i === 0
      ? top1.organism
      : i === 1
        ? `${top1.organism} (variant A)`
        : MOCK_ORGS[i % MOCK_ORGS.length] || top1.organism,
  }));

// ── Score colour ──────────────────────────────────────────────────────────────

const getScoreColor = (score: number): string => {
  if (score >= 0.9) return '#25512B';
  if (score >= 0.7) return '#6CA033';
  if (score >= 0.3) return '#F69B05';
  return '#C00000';
};

// ── Seeded price helper ───────────────────────────────────────────────────────

const seedPrice = (id: string, min: number, max: number): number => {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) & 0x7fffffff;
  return min + (h % (max - min + 1));
};

const QTY_MG          = [1, 5, 10, 50]                              as const;
const QTY_RXNS         = [10, 50, 100, 500]                          as const;
const QTY_MUG          = ['1 µg', '5 µg', '10 µg', '50 µg']         as const;
const MUG_MULT         = [1, 3, 5, 15]                               as const;
const DNA_CNS          = [1, 2, 5, 10]                               as const;
const ENZYME_DISCOUNT  = [1.00, 0.90, 0.82, 0.70]                   as const;
const DNA_MUG_DISCOUNT = [1.00, 0.88, 0.80, 0.65]                   as const;
const DNA_CNS_DISCOUNT = [1.00, 0.92, 0.85, 0.75]                   as const;

const SEL_BTN  = 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold ring-1 ring-emerald-500/30';
const IDLE_BTN = 'border-border bg-muted/30 text-muted-foreground hover:border-emerald-500/40';

// ── Get-Enzyme dialog ─────────────────────────────────────────────────────────

type GetView = 'chooser' | 'enzyme' | 'dna' | 'design';

const GetEnzymeDialog = ({ enzyme, open, onOpenChange }: {
  enzyme: Enzyme;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const [view, setView] = useState<GetView>('chooser');
  const [enzymeQtyIdx, setEnzymeQtyIdx] = useState(0); // drives both qty AND reactions
  const [dnaMugIdx,    setDnaMugIdx]    = useState(0);
  const [dnaSubStep,    setDnaSubStep]    = useState<'config' | 'review'>('config');
  const [orderPlaced,   setOrderPlaced]   = useState<'enzyme' | 'dna' | null>(null);

  const handleOpenChange = (v: boolean) => {
    if (!v) { setView('chooser'); setOrderPlaced(null); setDnaSubStep('config'); }
    onOpenChange(v);
  };

  const backLink = (
    <button
      type="button"
      onClick={() => setView('chooser')}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center pt-1"
    >
      ← Back
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm" style={{ background: 'var(--bg-elevated)' }}>

        {view === 'chooser' && (
          <>
            <DialogHeader>
              <DialogTitle>Obtain {enzyme.name}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Choose how you'd like to obtain{' '}
              <span className="font-semibold text-foreground">{enzyme.name}</span>.
            </p>
            <div className="space-y-2 mt-1">
              {(
                [
                  { key: 'enzyme' as const, icon: <ShoppingCart className="w-5 h-5 text-primary" />, title: 'Get the Enzyme', desc: 'Order purified enzyme from a vendor' },
                  { key: 'dna'    as const, icon: <Dna className="w-5 h-5 text-primary" />,           title: 'Get DNA',        desc: 'Order a codon-optimised gene construct' },
                  { key: 'design' as const, icon: <Wrench className="w-5 h-5 text-primary" />,        title: 'Get Design',     desc: 'Receive an engineering design for this enzyme' },
                ] satisfies { key: GetView; icon: React.ReactNode; title: string; desc: string }[]
              ).map(({ key, icon, title, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className="flex items-center gap-3 w-full rounded-xl border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/40 p-3 text-left transition-colors group"
                >
                  <div className="shrink-0 rounded-lg bg-primary/10 p-2">{icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{title}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <span className="ml-auto text-muted-foreground">›</span>
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'enzyme' && (
          <>
            <DialogHeader><DialogTitle>Get the Enzyme</DialogTitle></DialogHeader>
            {orderPlaced === 'enzyme' ? (
              <div className="py-8 flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
                <p className="text-sm font-semibold text-foreground">Order placed!</p>
                <p className="text-xs text-muted-foreground">Your order for <span className="font-semibold text-foreground">{enzyme.name}</span> is being processed.</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => handleOpenChange(false)}>Done</Button>
              </div>
            ) : (
              <div className="py-2 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Quantity</p>
                  <div className="grid grid-cols-4 gap-2">
                    {QTY_MG.map((mg, i) => (
                      <button key={mg} type="button" onClick={() => setEnzymeQtyIdx(i)}
                        className={cn('rounded-lg border py-2 text-sm transition-colors', enzymeQtyIdx === i ? SEL_BTN : IDLE_BTN)}
                      >{mg} mg</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Reactions</p>
                  <div className="grid grid-cols-4 gap-2">
                    {QTY_RXNS.map((n, i) => (
                      <button key={n} type="button" onClick={() => setEnzymeQtyIdx(i)}
                        className={cn('rounded-lg border py-2 text-sm transition-colors', enzymeQtyIdx === i ? SEL_BTN : IDLE_BTN)}
                      >{n}</button>
                    ))}
                  </div>
                </div>
                {(() => {
                  const base  = seedPrice(enzyme.id, 150, 380);
                  const unit  = Math.round(base * ENZYME_DISCOUNT[enzymeQtyIdx]);
                  const total = QTY_MG[enzymeQtyIdx] * unit;
                  return (
                    <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Estimated cost</p>
                        <p className="text-xl font-bold text-foreground font-mono mt-0.5">${total.toLocaleString()}</p>
                        {enzymeQtyIdx > 0 && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            {Math.round((1 - ENZYME_DISCOUNT[enzymeQtyIdx]) * 100)}% volume discount applied
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Unit price</p>
                        <p className="text-sm font-mono text-muted-foreground">${unit}/mg</p>
                      </div>
                    </div>
                  );
                })()}
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => setOrderPlaced('enzyme')}>Place Order</Button>
                {backLink}
              </div>
            )}
          </>
        )}

        {view === 'dna' && (
          <>
            <DialogHeader><DialogTitle>Get DNA</DialogTitle></DialogHeader>
            {orderPlaced === 'dna' ? (
              <div className="py-8 flex flex-col items-center gap-3 text-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
                <p className="text-sm font-semibold text-foreground">Order placed!</p>
                <p className="text-xs text-muted-foreground">Your gene synthesis order is being processed.</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => handleOpenChange(false)}>Done</Button>
              </div>
            ) : dnaSubStep === 'config' ? (
              <div className="py-2 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Quantity</p>
                  <div className="grid grid-cols-4 gap-2">
                    {QTY_MUG.map((q, i) => (
                      <button key={q} type="button" onClick={() => setDnaMugIdx(i)}
                        className={cn('rounded-lg border py-2 text-sm transition-colors', dnaMugIdx === i ? SEL_BTN : IDLE_BTN)}
                      >{q}</button>
                    ))}
                  </div>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => setDnaSubStep('review')}>Continue</Button>
                {backLink}
              </div>
            ) : (
              <div className="py-2 space-y-4">
                <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Order summary</p>
                  <p className="text-sm text-foreground font-semibold">{enzyme.name} — codon-optimised gene</p>
                  <p className="text-xs text-muted-foreground">Quantity: {QTY_MUG[dnaMugIdx]}</p>
                </div>
                {(() => {
                  const base    = seedPrice(enzyme.id + 'dna', 80, 220);
                  const total   = Math.round(base * MUG_MULT[dnaMugIdx] * DNA_MUG_DISCOUNT[dnaMugIdx]);
                  const discPct = Math.round((1 - DNA_MUG_DISCOUNT[dnaMugIdx]) * 100);
                  return (
                    <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Estimated cost</p>
                        <p className="text-xl font-bold text-foreground font-mono mt-0.5">${total.toLocaleString()}</p>
                        {discPct > 0 && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">{discPct}% volume discount applied</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Base price</p>
                        <p className="text-sm font-mono text-muted-foreground">${base}</p>
                      </div>
                    </div>
                  );
                })()}
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => setOrderPlaced('dna')}>Place Order</Button>
                <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => setDnaSubStep('config')}>
                  ← Edit quantity
                </button>
              </div>
            )}
          </>
        )}

        {view === 'design' && (
          <>
            <DialogHeader><DialogTitle>Get Design</DialogTitle></DialogHeader>
            <div className="py-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                An engineering design for {enzyme.name} — expression vector, host strain recommendation, and process parameters.
              </p>
              <Button className="w-full gap-2" disabled>
                <Wrench className="w-4 h-4" />Generate design — coming soon
              </Button>
              {backLink}
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
};

// ── PubChem name lookup ──────────────────────────────────────────────────────

type PubChemInfo = { name: string; cid: number } | null;

async function fetchPubChemName(smiles: string): Promise<PubChemInfo> {
  try {
    // Use POST to avoid issues with slashes (E/Z stereochemistry) in the URL path
    const cidRes = await fetch(
      'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/cids/JSON',
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `smiles=${encodeURIComponent(smiles)}` },
    );
    if (!cidRes.ok) return null;
    const cidData = await cidRes.json();
    const cid = cidData?.IdentifierList?.CID?.[0];
    if (!cid) return null;

    const iupacRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IUPACName/JSON`
    );
    if (!iupacRes.ok) return { name: `CID ${cid}`, cid };
    const iupacData = await iupacRes.json();
    const iupacName = iupacData?.PropertyTable?.Properties?.[0]?.IUPACName;
    if (!iupacName) return { name: `CID ${cid}`, cid };

    return { name: iupacName, cid };
  } catch {
    return null;
  }
}

// ── Reaction header ───────────────────────────────────────────────────────────

const ReactionHeader = ({ substrateSmiles, productSmiles, substrateInfo, productInfo, loading, enzymeName, accentColor }: {
  substrateSmiles: string; productSmiles: string;
  substrateName: string;   productName: string;
  substrateInfo?: PubChemInfo; productInfo?: PubChemInfo; loading?: boolean;
  enzymeName?: string; accentColor?: string;
}) => {
  const renderLabel = (fallback: string, info?: PubChemInfo) => {
    if (loading) return <span className="text-xs text-muted-foreground animate-pulse">…</span>;
    if (info) {
      return (
        <a
          href={`https://pubchem.ncbi.nlm.nih.gov/compound/${info.cid}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors inline-flex items-center gap-1 text-center leading-snug"
        >
          <span className="break-words text-center">{info.name}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      );
    }
    return <span className="text-xs text-muted-foreground">{fallback}</span>;
  };

  return (
    <div className="h-full rounded-xl border border-border bg-muted/20 px-1 py-0 flex flex-col justify-center overflow-hidden">
      <div className="flex items-center justify-center gap-2">
        {/* Substrate */}
        <div className="flex flex-col items-center">
          <MoleculeViewer smiles={substrateSmiles} width={390} height={220} />
          <div className="-mt-1 w-[390px] flex justify-center">{renderLabel('Substrate', substrateInfo)}</div>
        </div>

        {/* Enzyme name + arrow — one word per line, column sizes to longest word */}
        <div className="flex flex-col items-center gap-1 shrink-0 w-fit">
          <div className="flex flex-col items-center leading-snug" style={{ color: accentColor ?? '#6CA033' }}>
            {(enzymeName ?? 'Enzyme').split(' ').map((word, i) => (
              <span key={i} className="text-base font-semibold text-center whitespace-nowrap">
                {word}
              </span>
            ))}
          </div>
          <span className="text-4xl leading-none shrink-0" style={{ color: 'var(--color-primary, #538b5e)', opacity: 0.75 }}>
            ⟶
          </span>
        </div>

        {/* Product */}
        <div className="flex flex-col items-center">
          <MoleculeViewer smiles={productSmiles} width={390} height={220} />
          <div className="-mt-1 w-[390px] flex justify-center">{renderLabel('Product', productInfo)}</div>
        </div>
      </div>
    </div>
  );
};

// ── Organism formatter ────────────────────────────────────────────────────────

function italicizeOrganism(organism: string): React.ReactNode {
  const words = organism.trim().split(/\s+/);
  if (words.length === 0 || organism === 'Unavailable') return organism;
  const scientific = words.slice(0, 2).join(' ');
  const rest = words.slice(2).join(' ');
  return <><em>{scientific}</em>{rest ? ` ${rest}` : ''}</>;
}

// ── Candidate card (accordion) ────────────────────────────────────────────────

const CandidateCard = ({ enzyme, rank, zz, expanded, onToggle, inKit, onToggleKit }: {
  enzyme: Enzyme;
  rank: number;
  zz: number;
  reaction: ReactionNodeData;
  expanded: boolean;
  onToggle: () => void;
  inKit: boolean;
  onToggleKit: () => void;
}) => {
  const [getOpen, setGetOpen] = useState(false);

  const hasUniProt     = !!enzyme.id && enzyme.id !== 'unknown';
  const hasEcNumber    = !!enzyme.ecNumber && enzyme.ecNumber !== 'Unavailable';
  const ecDisplay      = hasEcNumber
    ? `EC ${enzyme.ecNumber.replace(/^EC\s*/i, '')}`
    : 'EC unavailable';
  const wasOriginallyInKit = rank <= zz;
  const wasManuallyAdded   = rank > zz && inKit;
  const shouldDim          = wasOriginallyInKit && !inKit;

  return (
    <div
      className={cn(
        'rounded-xl transition-all',
        inKit  ? 'border-2 bg-muted/20 hover:bg-muted/30' : 'border bg-muted/20 hover:bg-muted/30',
        expanded && 'bg-muted/30',
      )}
      style={inKit
        ? { borderColor: 'var(--primary-500)' }
        : shouldDim
          ? { borderColor: '#C00000', borderWidth: '2px' }
          : undefined}
    >
      {/* "Manually removed" banner */}
      {shouldDim && (
        <div className="px-4 pt-2 pb-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#C00000' }}>
            Manually removed from the kit
          </span>
        </div>
      )}
      {/* "Manually added" banner */}
      {wasManuallyAdded && (
        <div className="px-4 pt-2 pb-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#538b5e' }}>
            Manually added to the kit
          </span>
        </div>
      )}

      {/* Header row — dimmed when removed from kit */}
      <button
        type="button"
        onClick={onToggle}
        className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-opacity', shouldDim && 'opacity-40')}
      >
        <span className="shrink-0 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{enzyme.name}</p>
          <p className="text-xs text-muted-foreground truncate">{italicizeOrganism(enzyme.organism)}</p>
        </div>
        <span className="shrink-0 text-xs font-mono bg-muted border border-border px-2 py-0.5 rounded hidden sm:block">
          {ecDisplay}
        </span>
        <span className='shrink-0 text-sm font-mono font-bold' style={{ color: getScoreColor(enzyme.score) }}>
          {Math.round(enzyme.score * 100)}%
        </span>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-4 border-t border-border/50">

          {/* DB links — dimmed when removed; shown only when enzyme exists in that database */}
          <div className={cn('flex flex-wrap gap-2 transition-opacity', shouldDim && 'opacity-40')}>
            {hasUniProt && (
              <a
                href={`https://www.uniprot.org/uniprotkb?query=${enzyme.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors text-sky-500 border-sky-400/40 bg-sky-500/5 hover:bg-sky-500/15"
              >
                UniProt <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {hasEcNumber && (
              <a
                href={`https://www.brenda-enzymes.org/enzyme.php?ecno=${enzyme.ecNumber.replace(/^EC\s*/i, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors text-amber-500 border-amber-400/40 bg-amber-500/5 hover:bg-amber-500/15"
              >
                BRENDA <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {hasEcNumber && (
              <a
                href={`https://www.enzyme-database.org/query.php?ec=${enzyme.ecNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors text-violet-500 border-violet-400/40 bg-violet-500/5 hover:bg-violet-500/15"
              >
                ExplorEnz <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Actions — always full opacity */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1.5 flex-1 font-semibold"
              style={inKit
                ? { background: '#C00000', color: '#fff' }
                : { background: '#538b5e', color: '#fff' }}
              onClick={onToggleKit}
            >
              {inKit ? (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Remove this biocatalyst from kit
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add this biocatalyst to kit
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <GetEnzymeDialog enzyme={enzyme} open={getOpen} onOpenChange={setGetOpen} />

    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const TestReactionPage = () => {
  const navigate   = useNavigate();
  const location   = useLocation();

  // Derive tier early so useState can use ZZ as its initial value
  const state0     = location.state as { reaction: ReactionNodeData; candidates?: Enzyme[]; groupStats?: GroupStats; comments?: string[] } | null;
  const score0     = state0?.reaction?.enzyme?.score ?? 0;
  const initZZ     = score0 >= 0.9 ? 30 : score0 >= 0.7 ? 60 : 90;
  const enzyme0    = state0?.reaction?.enzyme ?? null;
  const initCands  = state0?.candidates?.length
    ? state0.candidates
    : enzyme0 ? buildCandidates(enzyme0) : [];

  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [bulkOpen, setBulkOpen]       = useState(false);
  const [visibleCount, setVisibleCount] = useState(initZZ);
  const [showKitOnly, setShowKitOnly]     = useState(false);
  const [shareDiscount, setShareDiscount] = useState(false);
  const [shareInfoOpen, setShareInfoOpen]       = useState(false);
  const [refundInfoOpen, setRefundInfoOpen]     = useState(false);
  const [deliveryInfoOpen, setDeliveryInfoOpen] = useState(false);
  const [protocolOpen, setProtocolOpen]         = useState(false);
  const [howSelectOpen, setHowSelectOpen]       = useState(false);
  const [orderOpen, setOrderOpen]               = useState(false);
  const [shippingInfo, setShippingInfo]   = useState({ org: '', name: '', street: '', city: '', zip: '', state: '', country: '' });
  const [billingInfo, setBillingInfo]     = useState({ org: '', name: '', street: '', city: '', zip: '', state: '', country: '', idNumber: '', vat: '' });
  const [kitIds, setKitIds] = useState<Set<string>>(
    () => new Set(initCands.slice(0, initZZ).map(c => c.id))
  );
  const [showScrollTop, setShowScrollTop] = useState(false);
  const candidatesRef = useRef<HTMLDivElement>(null);
  const yieldCardRef  = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [pubchemLoading, setPubchemLoading] = useState(false);
  const [substrateInfo, setSubstrateInfo]   = useState<PubChemInfo>(null);
  const [productInfo, setProductInfo]       = useState<PubChemInfo>(null);
  const [simiLoading, setSimiLoading]       = useState(false);
  const [simiResults, setSimiResults]       = useState<SimiResult[]>([]);
  const [simiError, setSimiError]           = useState<string | null>(null);

  const state      = location.state as { reaction: ReactionNodeData; candidates?: Enzyme[]; groupStats?: GroupStats; comments?: string[] } | null;
  const reaction   = state?.reaction;
  const enzyme     = reaction?.enzyme ?? null;
  const groupStats = state?.groupStats ?? null;
  const comments   = state?.comments  ?? [];

  const substrateSmiles = reaction?.substrateSmiles ?? '';
  const productSmiles   = reaction?.productSmiles   ?? '';
  const substrateName   = reaction?.substrateName   ?? 'Substrate';
  const productName     = reaction?.productName     ?? 'Product';

  // Fetch common names from PubChem
  useEffect(() => {
    if (!substrateSmiles && !productSmiles) return;
    let cancelled = false;

    // Pick the longest substrate (dot-separated SMILES)
    const longestSubstrate = substrateSmiles
      .split('.')
      .reduce((a, b) => (b.length > a.length ? b : a), '');

    setPubchemLoading(true);
    Promise.all([
      longestSubstrate ? fetchPubChemName(longestSubstrate) : Promise.resolve(null),
      productSmiles    ? fetchPubChemName(productSmiles)    : Promise.resolve(null),
    ]).then(([sub, prod]) => {
      if (cancelled) return;
      setSubstrateInfo(sub);
      setProductInfo(prod);
    }).finally(() => {
      if (!cancelled) setPubchemLoading(false);
    });

    return () => { cancelled = true; };
  }, [substrateSmiles, productSmiles]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const fetchSimi = async () => {
    if (simiLoading) return;
    setSimiLoading(true);
    setSimiError(null);
    try {
      const res = await fetch('https://nitrocat-backend-production.up.railway.app/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substrate_smiles: substrateSmiles,
          product_smiles:   productSmiles,
          top_k: 5,
          pub_fetch: true,
        }),
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      const results = Array.isArray(data) ? data : [];
      setSimiResults(results);
    } catch (e) {
      setSimiError(e instanceof Error ? e.message : 'Failed to fetch similar reactions');
    } finally {
      setSimiLoading(false);
    }
  };

  if (!enzyme || !reaction) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        No reaction data found. Please navigate here from a pathway node.
      </div>
    );
  }

  // Use real backend candidates when available (import flow), fall back to mock (pathway flow)
  const candidates = (state?.candidates && state.candidates.length > 0)
    ? state.candidates
    : buildCandidates(enzyme);

  const toggleKit = (id: string) => {
    setKitIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const scorePct = Math.round(enzyme.score * 100);

  // 4-tier wording + palette based on raw score
  const tier = enzyme.score >= 0.9 ? 'high'
             : enzyme.score >= 0.7 ? 'medium'
             : enzyme.score >= 0.3 ? 'low'
             : 'none';

  const TIER_CFG = {
    high: {
      header1:     'We found your biocatalysts!',
      phrase:      'is a perfect match',
      showEnzyme:  true,
      zz:          30,
      accentColor: '#25512B',
      accentBg:    'rgba(37,81,43,0.04)',
      accentBorder:'rgba(37,81,43,0.2)',
      accentPanel: 'rgba(37,81,43,0.06)',
    },
    medium: {
      header1:     'We found your biocatalysts!',
      phrase:      'is a very promising option',
      showEnzyme:  true,
      zz:          60,
      accentColor: '#6CA033',
      accentBg:    'rgba(108,160,51,0.04)',
      accentBorder:'rgba(108,160,51,0.2)',
      accentPanel: 'rgba(108,160,51,0.06)',
    },
    low: {
      header1:     'We found your biocatalysts!',
      phrase:      'is an option worth exploring',
      showEnzyme:  true,
      zz:          90,
      accentColor: '#F69B05',
      accentBg:    'rgba(246,155,5,0.04)',
      accentBorder:'rgba(246,155,5,0.2)',
      accentPanel: 'rgba(246,155,5,0.06)',
    },
    none: {
      header1:     'Biocatalysts detected with very low confidence!',
      phrase:      'testing the ≥90 biocatalysts may still yield your product',
      showEnzyme:  false,
      zz:          90,
      accentColor: '#C00000',
      accentBg:    'rgba(192,0,0,0.04)',
      accentBorder:'rgba(192,0,0,0.2)',
      accentPanel: 'rgba(192,0,0,0.06)',
    },
  } as const;

  const { header1, phrase, showEnzyme, zz, accentColor, accentBg, accentBorder, accentPanel } = TIER_CFG[tier];

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto">

      {/* Title section — full width */}
      <div
        className="w-full border-b px-4 sm:px-8 pt-14 pb-4 sm:py-4"
        style={{ borderColor: accentBorder, backgroundColor: accentBg }}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4 sm:gap-5 max-w-6xl ml-0">
          {/* Accent bar */}
          <div
            className="w-1.5 self-stretch rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <div className="flex-1 min-w-0 space-y-2">

            {/* Line 1 — label */}
            <h1 className="text-2xl font-bold tracking-tight leading-none" style={{ color: accentColor }}>
              {header1}
            </h1>

            {/* Line 2 — confidence + enzyme description */}
            <p className="text-3xl font-bold tracking-tight leading-snug text-foreground">
              With <span style={{ color: accentColor }}>{scorePct}%</span> confidence,{' '}
              {showEnzyme
                ? <><span style={{ color: accentColor }}>{enzyme.name}</span>{' '}{phrase}</>
                : phrase
              }!
            </p>

            {/* Line 3 — testing recommendation (hidden for low tier) */}
            {showEnzyme && (
              <p className="text-xl text-foreground pt-1">
                Testing the top{' '}
                <span style={{ color: accentColor }}>{zz}</span>
                {' '}biocatalysts will yield the desired reaction on your substrate.
              </p>
            )}

          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="w-full px-4 sm:px-8 py-2 space-y-3">

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          {reaction.pathwayId === 'import' ? 'Back to input' : 'Back to pathway'}
        </button>

        {/* Two main boxes side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 lg:gap-6 items-stretch lg:min-h-[313px]">

          {/* Reaction structural view */}
          <ReactionHeader
            substrateSmiles={substrateSmiles}
            productSmiles={productSmiles}
            substrateName={substrateName}
            productName={productName}
            substrateInfo={substrateInfo}
            productInfo={productInfo}
            loading={pubchemLoading}
            enzymeName={enzyme.name}
            accentColor={accentColor}
          />

          {/* Kit card */}
          {(() => {
            const kitCount = kitIds.size;
            const kitPrice = shareDiscount ? 4000 : 5000;
            return (
              <div className="flex flex-col rounded-xl border border-border bg-muted/20 px-4 py-3 gap-2">

                {/* ── CTA ── */}
                <button
                  type="button"
                  onClick={() => setBulkOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer"
                  style={{ background: 'var(--primary-500)', color: '#fff', boxShadow: '0 2px 12px 0 rgba(16,185,129,0.25)' }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  GET CUSTOM KIT
                </button>

                {/* ── Kit contents ── */}
                <div className="space-y-2">
                  <div className="grid items-center gap-x-2 py-2" style={{ gridTemplateColumns: '1rem 1fr' }}>
                    <Dna className="w-4 h-4 shrink-0" style={{ color: 'var(--primary-500)' }} />
                    <p className="text-sm font-bold text-foreground leading-snug">
                      {kitCount} hand-picked enzymes most likely to catalyze your reaction
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHowSelectOpen(true)}
                    className="w-full inline-flex items-center justify-center px-3 py-2 rounded-full text-xs font-medium transition-all border"
                    style={{ borderColor: 'var(--primary-500)', color: 'var(--primary-500)', background: 'transparent' }}
                  >
                    How do we select biocatalysts?
                  </button>
                </div>

                <div className="border-t border-border/50" />

                {/* ── Price ── */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    {shareDiscount && (
                      <span className="text-sm text-muted-foreground line-through">$5,000</span>
                    )}
                    <span className="text-2xl font-bold text-foreground">${kitPrice.toLocaleString()}</span>
                    {shareDiscount && (
                      <span className="text-xs font-semibold" style={{ color: 'var(--primary-500)' }}>−20%</span>
                    )}
                  </div>
                  {/* Share discount toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShareDiscount(v => !v)}
                      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus:outline-none"
                      style={shareDiscount
                        ? { borderColor: 'var(--primary-500)', background: 'var(--primary-500)' }
                        : { borderColor: 'var(--foreground)', background: 'transparent' }}
                      aria-checked={shareDiscount}
                      role="switch"
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-3 w-3 rounded-full shadow transition-transform mt-0.5',
                          shareDiscount ? 'translate-x-4 ml-0' : 'translate-x-0 ml-0.5',
                        )}
                        style={{ background: '#9ca3af' }}
                      />
                    </button>
                    <span className="text-xs text-foreground leading-tight flex-1">
                      Share your results and get 20% off!
                    </span>
                    <button
                      type="button"
                      onClick={() => setShareInfoOpen(true)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Guarantee ── */}
                <div className="grid items-center gap-x-2 py-2" style={{ gridTemplateColumns: '1.25rem 1fr 1rem' }}>
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--primary-500)' }} />
                  <p className="text-sm font-bold leading-snug" style={{ color: 'var(--primary-500)' }}>
                    No desired reaction on your substrate?<br />Full refund guaranteed!
                  </p>
                  <button
                    type="button"
                    onClick={() => setRefundInfoOpen(true)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors justify-self-end"
                    aria-label="About refund guarantee"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* ── Delivery ── */}
                <div className="grid items-center gap-x-2 py-2" style={{ gridTemplateColumns: '1.25rem 1fr 1rem' }}>
                  <Clock className="w-5 h-5 shrink-0" style={{ color: 'var(--primary-500)' }} />
                  <p className="text-sm font-bold text-foreground leading-snug">
                    Delivery in 5 business days
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeliveryInfoOpen(true)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors justify-self-end"
                    aria-label="About delivery"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="border-t border-border/50 mt-auto" />

                {/* ── Protocol ── */}
                <div className="space-y-1.5">
                  <div className="grid items-center gap-x-2 py-2" style={{ gridTemplateColumns: '1rem 1fr' }}>
                    <FlaskConical className="w-4 h-4 shrink-0" style={{ color: 'var(--primary-500)' }} />
                    <p className="text-sm font-bold text-foreground leading-snug">
                      Easy-to-use protocol and all reagents included.<br />Just add your substrate!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProtocolOpen(true)}
                    className="w-full inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
                    style={{ borderColor: 'var(--primary-500)', color: 'var(--primary-500)', background: 'transparent' }}
                  >
                    Explore protocol for your reaction!
                  </button>
                </div>

              </div>
            );
          })()}

        </div>

        {/* Group stats — candidate pool kinetics & conditions (hidden from user view) */}

        {/* Explore reaction details — jumps to yield card */}
        <button
          type="button"
          onClick={() => yieldCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer"
          style={{ background: 'var(--primary-500)', color: '#fff', boxShadow: '0 2px 12px 0 rgba(16,185,129,0.25)' }}
        >
          <FlaskConical className="w-4 h-4" />
          Explore reaction details
        </button>

        {/* Yield card — reaction conditions, predicted yield, similar transformations, references */}
        <div ref={yieldCardRef}>
          <YieldCard
            enzyme={enzyme}
            substrateCid={substrateInfo?.cid ?? null}
            productCid={productInfo?.cid ?? null}
            substrateSmiles={substrateSmiles || undefined}
            productSmiles={productSmiles || undefined}
            enzymeMassMg={0.1}
            accentColor={accentColor}
            groupStats={groupStats}
            onExploreBiocatalysts={() =>
              candidatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            simiResults={simiResults}
            simiLoading={simiLoading}
            simiError={simiError}
            onLoadSimi={fetchSimi}
          />
        </div>

        {/* Candidate list */}
        <div ref={candidatesRef} className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Biocatalysts sorted by confidence to catalyze your reaction
          </p>
          {(() => {
            const visible = candidates.slice(0, visibleCount);
            // Sort into three display groups
            const inKitGroup      = visible.filter(c =>  kitIds.has(c.id)).sort((a, b) => b.score - a.score);
            const removedGroup    = visible.filter(c => !kitIds.has(c.id) && (candidates.indexOf(c) + 1) <= zz).sort((a, b) => b.score - a.score);
            const extraGroup      = visible.filter(c => !kitIds.has(c.id) && (candidates.indexOf(c) + 1) >  zz).sort((a, b) => b.score - a.score);
            const sorted = [...inKitGroup, ...removedGroup, ...extraGroup]
              .filter(cand => !showKitOnly || kitIds.has(cand.id));
            return sorted.map(cand => (
              <CandidateCard
                key={cand.id}
                enzyme={cand}
                rank={candidates.indexOf(cand) + 1}
                reaction={reaction}
                expanded={expandedId === cand.id}
                onToggle={() => setExpandedId(prev => prev === cand.id ? null : cand.id)}
                zz={zz}
                inKit={kitIds.has(cand.id)}
                onToggleKit={() => toggleKit(cand.id)}
              />
            ));
          })()}

          {/* Bottom controls */}
          <div className="flex gap-3">
            {!showKitOnly && visibleCount < Math.min(candidates.length, 96) && (
              <button
                type="button"
                onClick={() => setVisibleCount(prev => Math.min(prev + zz, 96, candidates.length))}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer border"
                style={{ borderColor: accentColor, color: accentColor, background: 'transparent' }}
              >
                <Dna className="w-4 h-4" />
                Load more biocatalysts ({Math.min(candidates.length, 96) - visibleCount} remaining)
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowKitOnly(v => !v)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer border"
              style={showKitOnly
                ? { background: '#538b5e', color: '#fff', borderColor: '#538b5e' }
                : { borderColor: '#538b5e', color: '#538b5e', background: 'transparent' }}
            >
              <ShoppingCart className="w-4 h-4" />
              {showKitOnly ? 'Show all biocatalysts' : 'Show only biocatalysts in kit'}
            </button>
          </div>
        </div>

      </div>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{ background: 'var(--primary-500)', color: '#fff', boxShadow: '0 4px 16px 0 rgba(16,185,129,0.35)' }}
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}

      {/* Share discount info dialog */}
      <Dialog open={shareInfoOpen} onOpenChange={setShareInfoOpen}>
        <DialogContent className="max-w-sm rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              Help us improve NitroCat
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              NitroCat is built for medicinal chemists to easily use biocatalysis from hit-to-lead onward — no biological expertise required. Our goal is to help you access complex molecules for undruggable targets and develop greener, cheaper manufacturing routes.
            </p>
            <p>
              To make NitroCat as accurate as possible, we need high-quality experimental data, especially on which enzymes work — and which ones do not.
            </p>
            <p className="font-semibold text-foreground">Help us improve NitroCat</p>
            <p>
              If you share your <span className="font-semibold text-foreground">centroided mzML data</span> within one year of purchase, we will return <span className="font-semibold text-foreground">20% of the order value</span> as credit.
            </p>
            <p className="text-xs">
              You can upload your data anytime in <span className="font-semibold text-foreground">"Manage My Orders"</span> in your profile. Cashback is applied automatically.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund guarantee info dialog */}
      <Dialog open={refundInfoOpen} onOpenChange={setRefundInfoOpen}>
        <DialogContent className="max-w-sm rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Full refund guarantee
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              We are confident in our biocatalyst selection. If none of the enzymes in your kit produce the desired transformation on your substrate, we will issue a <span className="font-semibold text-foreground">full refund</span> — no questions asked.
            </p>
            <p>
              To claim a refund, simply upload your LC-MS data in <span className="font-semibold text-foreground">"Manage My Orders"</span> within 6 months of receiving your kit. Our team will review the results and process the refund within 5 business days.
            </p>
            <p className="text-xs">
              The guarantee covers the full kit price and applies when the screening protocol included with your kit is followed as described.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery info dialog */}
      <Dialog open={deliveryInfoOpen} onOpenChange={setDeliveryInfoOpen}>
        <DialogContent className="max-w-sm rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Delivery
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Your kit is prepared and shipped within <span className="font-semibold text-foreground">2 business days</span> of order confirmation, and delivered to your lab within <span className="font-semibold text-foreground">5 business days</span> worldwide.
            </p>
            <p>
              Kits are shipped on <span className="font-semibold text-foreground">dry ice</span> to maintain enzyme activity. Upon arrival, store at <span className="font-semibold text-foreground">−20 °C</span> — stable for at least 12 months.
            </p>
            <p className="text-xs">
              Tracking information is sent to your email once the shipment is dispatched.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Explore protocol dialog */}
      <Dialog open={protocolOpen} onOpenChange={setProtocolOpen}>
        <DialogContent className="max-w-sm rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <DialogHeader>
            <DialogTitle>Explore protocol</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Our recommended screening protocol is designed to give you reliable results with minimal hands-on time.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Set up reactions in a 96-well plate format (100 µL per well)</li>
              <li>Incubate at 30 °C, 300 rpm for 16–24 h</li>
              <li>Quench with 1:1 acetonitrile and analyse by LC-MS or HPLC</li>
              <li>Identify hits by product peak area vs. substrate control</li>
            </ul>
            <p className="text-xs">
              Full SOP and data analysis templates are included with your kit shipment.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* How do we select biocatalysts dialog */}
      <Dialog open={howSelectOpen} onOpenChange={setHowSelectOpen}>
        <DialogContent className="max-w-sm rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <DialogHeader>
            <DialogTitle>How do we select biocatalysts?</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              NitroCat ranks biocatalysts using a confidence score derived from multiple data sources.
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Structural similarity between your substrate and known enzyme substrates</li>
              <li>Reaction mechanism compatibility (EC class matching)</li>
              <li>Organism-level expression and stability data</li>
              <li>Literature and patent precedent for related transformations</li>
            </ul>
            <p className="text-xs">
              Candidates are ranked by confidence score. The top candidates in your kit represent the highest-probability hits for your reaction.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kit dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          {(() => {
            const kitCount   = kitIds.size;
            const kitPrice   = shareDiscount ? 4000 : 5000;
            const savings    = 1000;
            const autoSelected  = candidates.filter((c, i) =>  kitIds.has(c.id) && (i + 1) <= zz);
            const manualSelected = candidates.filter((c, i) => kitIds.has(c.id) && (i + 1) >  zz);
            // auto = green (primary), manual = amber
            const autoSet  = new Set(autoSelected.map(c => c.id));
            const kitEnzymes = [...autoSelected, ...manualSelected].sort((a, b) => b.score - a.score);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="tracking-wide text-base">
                    Custom biocatalysis kit for your reaction contains{' '}
                    <span style={{ color: 'var(--primary-500)' }}>{kitCount}</span> biocatalysts!
                  </DialogTitle>
                </DialogHeader>

                <div className="py-2 space-y-3">

                  {/* Breakdown — colored to match wells */}
                  <p className="text-sm">
                    <span className="font-medium" style={{ color: 'var(--primary-500)' }}>
                      {autoSelected.length} automatically selected
                    </span>
                    {manualSelected.length > 0 && (
                      <>
                        {' '}&amp;{' '}
                        <span className="font-medium" style={{ color: 'var(--primary-500)', opacity: 0.5 }}>
                          {manualSelected.length} manually selected
                        </span>
                      </>
                    )}
                  </p>

                  {/* Price summary */}
                  <div className="flex items-baseline gap-2">
                    {shareDiscount && (
                      <span className="text-sm text-muted-foreground line-through">$5,000</span>
                    )}
                    <span className="text-2xl font-bold text-foreground">${kitPrice.toLocaleString()}</span>
                    {shareDiscount && (
                      <span className="text-xs font-semibold" style={{ color: 'var(--primary-500)' }}>−20%</span>
                    )}
                  </div>

                  {/* Share section */}
                  {shareDiscount ? (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground flex items-center gap-3">
                      <span className="flex-1">
                        After you share your centroided mzML data from LC-MS you'll receive{' '}
                        <span className="font-semibold" style={{ color: 'var(--primary-500)' }}>${savings}</span> back.
                      </span>
                      <button
                        type="button"
                        onClick={() => setShareInfoOpen(true)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <HelpCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShareDiscount(true)}
                          className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus:outline-none"
                          role="switch"
                          aria-checked={false}
                          style={{ borderColor: 'var(--foreground)', background: 'transparent' }}
                        >
                          <span className="pointer-events-none inline-block h-3 w-3 rounded-full shadow translate-x-0 mt-0.5 ml-0.5" style={{ background: '#9ca3af' }} />
                        </button>
                        <span className="text-sm text-foreground flex-1">
                          Share your centroided mzML data from LC-MS and get back{' '}
                          <span className="font-semibold" style={{ color: 'var(--primary-500)' }}>${savings}</span>!
                        </span>
                        <button
                          type="button"
                          onClick={() => setShareInfoOpen(true)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <HelpCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Well plates */}
                  {(() => {
                    const PLATE_W = 220;

                    const wellGrid = (isTop: boolean) => (
                      <div
                        className="grid p-1.5 rounded-xl border border-border"
                        style={{
                          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                          gap: '2px',
                          width: `${PLATE_W}px`,
                          background: 'var(--bg-elevated)',
                          boxShadow: isTop
                            ? '0 6px 24px 0 rgba(0,0,0,0.22), 0 1.5px 4px 0 rgba(0,0,0,0.12)'
                            : '0 2px 8px 0 rgba(0,0,0,0.14)',
                        }}
                      >
                        {Array.from({ length: 96 }, (_, gridIdx) => {
                          const row = Math.floor(gridIdx / 12);
                          const col = gridIdx % 12;
                          const enzymeIdx = col * 8 + row;
                          const enz    = kitEnzymes[enzymeIdx];
                          const filled = enzymeIdx < kitCount;
                          const isAuto = filled && enz && autoSet.has(enz.id);
                          return (
                            <div
                              key={gridIdx}
                              title={isTop && filled && enz ? enz.name : ''}
                              className={cn(
                                'rounded-full',
                                filled ? (isTop ? 'cursor-default hover:opacity-60' : '') : 'bg-muted border border-border/40',
                              )}
                              style={{
                                aspectRatio: '1',
                                width: '100%',
                                ...(filled ? { background: 'var(--primary-500)', opacity: isAuto ? 1 : 0.5 } : {}),
                              }}
                            />
                          );
                        })}
                      </div>
                    );

                    return (
                      <div className="flex flex-col items-center gap-5">

                        {/* Label lines */}
                        <div className="text-center space-y-0.5">
                          <p className="text-xs font-semibold text-foreground">
                            96-well kit · 1 reaction per biocatalyst
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            hover over a well to see biocatalyst name
                          </p>
                        </div>

                        {wellGrid(true)}

                        {/* Action buttons — centered below the kit */}
                        <div className="flex gap-3 w-full max-w-[320px]">
                          <button
                            type="button"
                            onClick={() => { setBulkOpen(false); setOrderOpen(true); }}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer"
                            style={{ background: 'var(--primary-500)', color: '#fff', boxShadow: '0 2px 12px 0 rgba(16,185,129,0.30)' }}
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Order now
                          </button>
                          <button
                            type="button"
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer border"
                            style={{ borderColor: 'var(--primary-500)', color: 'var(--primary-500)', background: 'transparent' }}
                          >
                            <BookOpen className="w-4 h-4" />
                            Download protocol
                          </button>
                        </div>

                      </div>
                    );
                  })()}

                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Order dialog */}
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <DialogHeader>
            <DialogTitle>Order details</DialogTitle>
          </DialogHeader>
          {(() => {
            const inputCls = 'w-full px-2 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50';
            const SectionLabel = ({ text }: { text: string }) => (
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{text}</p>
            );
            return (
              <div className="py-2 space-y-5">

                {/* Shipping */}
                <div className="space-y-2">
                  <SectionLabel text="Shipping info" />
                  <input className={inputCls} placeholder="Organization"   value={shippingInfo.org}     onChange={e => setShippingInfo(p => ({ ...p, org:     e.target.value }))} />
                  <input className={inputCls} placeholder="Name"           value={shippingInfo.name}    onChange={e => setShippingInfo(p => ({ ...p, name:    e.target.value }))} />
                  <input className={inputCls} placeholder="Street"         value={shippingInfo.street}  onChange={e => setShippingInfo(p => ({ ...p, street:  e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} placeholder="City"  value={shippingInfo.city}  onChange={e => setShippingInfo(p => ({ ...p, city:  e.target.value }))} />
                    <input className={inputCls} placeholder="ZIP"   value={shippingInfo.zip}   onChange={e => setShippingInfo(p => ({ ...p, zip:   e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} placeholder="State"   value={shippingInfo.state}   onChange={e => setShippingInfo(p => ({ ...p, state:   e.target.value }))} />
                    <input className={inputCls} placeholder="Country" value={shippingInfo.country} onChange={e => setShippingInfo(p => ({ ...p, country: e.target.value }))} />
                  </div>
                </div>

                {/* Copy button */}
                <button
                  type="button"
                  onClick={() => setBillingInfo(p => ({ ...p, ...shippingInfo }))}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                  style={{ borderColor: 'var(--primary-500)', color: 'var(--primary-500)', background: 'transparent' }}
                >
                  Copy shipping info to billing
                </button>

                {/* Billing */}
                <div className="space-y-2">
                  <SectionLabel text="Billing info" />
                  <input className={inputCls} placeholder="Organization"   value={billingInfo.org}     onChange={e => setBillingInfo(p => ({ ...p, org:      e.target.value }))} />
                  <input className={inputCls} placeholder="Name"           value={billingInfo.name}    onChange={e => setBillingInfo(p => ({ ...p, name:     e.target.value }))} />
                  <input className={inputCls} placeholder="Street"         value={billingInfo.street}  onChange={e => setBillingInfo(p => ({ ...p, street:   e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} placeholder="City"  value={billingInfo.city}  onChange={e => setBillingInfo(p => ({ ...p, city:    e.target.value }))} />
                    <input className={inputCls} placeholder="ZIP"   value={billingInfo.zip}   onChange={e => setBillingInfo(p => ({ ...p, zip:     e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputCls} placeholder="State"   value={billingInfo.state}   onChange={e => setBillingInfo(p => ({ ...p, state:   e.target.value }))} />
                    <input className={inputCls} placeholder="Country" value={billingInfo.country} onChange={e => setBillingInfo(p => ({ ...p, country: e.target.value }))} />
                  </div>
                  <input className={inputCls} placeholder="Identification number" value={billingInfo.idNumber} onChange={e => setBillingInfo(p => ({ ...p, idNumber: e.target.value }))} />
                  <input className={inputCls} placeholder="VAT"                   value={billingInfo.vat}      onChange={e => setBillingInfo(p => ({ ...p, vat:      e.target.value }))} />
                </div>

                {/* Pay button */}
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer"
                  style={{ background: 'var(--primary-500)', color: '#fff', boxShadow: '0 2px 12px 0 rgba(16,185,129,0.25)' }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Pay by Stripe
                </button>

              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default TestReactionPage;
