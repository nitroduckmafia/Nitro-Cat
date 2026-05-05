import React, { useEffect, useState } from 'react';
import { getConfidenceColor } from '@/lib/utils/formatting';
import { FlaskConical, Beaker, BookOpen, ExternalLink, Dna, HelpCircle, GitCompareArrows, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Enzyme, GroupStats } from '@/types/enzyme';
import { MoleculeViewer } from '@/components/molecule/MoleculeViewer';
import {
  fetchPubChemMolecularWeight,
  fetchPubChemMolecularWeightBySmiles,
  fetchUniProtMolecularWeight,
} from '@/lib/api/externalData';
import {
  reactionTimeForMassProduct,
  massProductAtTime,
  type YieldParams,
} from '@/lib/utils/yieldCalculation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Simi types ────────────────────────────────────────────────────────────────

export type SimiPublication = {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
};

export type SimiResult = {
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

function parseReactionSmiles(rxn: string): { reactants: string[]; products: string[] } {
  const parts = rxn.split('>>');
  return {
    reactants: (parts[0] ?? '').split('.').filter(Boolean),
    products:  (parts[1] ?? '').split('.').filter(Boolean),
  };
}

function primaryOrganic(frags: string[]): string {
  const organic = frags.filter(f => /[CNOS]/.test(f) && f.length > 2);
  if (!organic.length) return frags[0] ?? '';
  return organic.reduce((a, b) => b.length > a.length ? b : a);
}

const simiScoreColor = getConfidenceColor;

// ── Constants ─────────────────────────────────────────────────────────────────
const SUBSTRATE_MASS_UG = 10;        // µg   — m_S
const REACTION_VOLUME_L = 20e-6;     // L    — V  (20 µL)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface YieldCardProps {
  enzyme: Enzyme;
  substrateCid?: number | null;
  productCid?: number | null;
  substrateSmiles?: string;
  productSmiles?: string;
  enzymeMassMg: number;
  accentColor: string;
  onExploreBiocatalysts: () => void;
  groupStats?: GroupStats | null;
  simiResults?: SimiResult[];
  simiLoading?: boolean;
  simiError?: string | null;
  onLoadSimi?: () => void;
}


// ── Helpers ───────────────────────────────────────────────────────────────────

const formatMass = (grams: number | null): string => {
  if (grams == null || !isFinite(grams) || grams <= 0) return '—';
  const mg = grams * 1000;
  if (mg >= 1) return `${mg.toFixed(2)} mg`;
  return `${(mg * 1000).toFixed(1)} µg`;
};

const formatTimeHours = (seconds: number | null): string => {
  if (seconds == null || !isFinite(seconds) || seconds <= 0) return '—';
  const h = seconds / 3600;
  if (h >= 1) return `${h.toFixed(2)} h`;
  return `${(seconds / 60).toFixed(1)} min`;
};

// ── Component ─────────────────────────────────────────────────────────────────

export const YieldCard = ({
  enzyme,
  substrateCid,
  productCid,
  substrateSmiles,
  productSmiles,
  enzymeMassMg,
  accentColor,
  onExploreBiocatalysts,
  groupStats,
  simiResults = [],
  simiLoading = false,
  simiError = null,
  onLoadSimi,
}: YieldCardProps) => {
  const [mwE, setMwE] = useState<number | null>(null);
  const [mwS, setMwS] = useState<number | null>(null);
  const [mwP, setMwP] = useState<number | null>(null);
  const [substrateAddedUg, setSubstrateAddedUg] = useState(10);
  const [conversionPct, setConversionPct]       = useState(99);
  const [substrateInfoOpen, setSubstrateInfoOpen] = useState(false);
  const [yieldInfoOpen, setYieldInfoOpen] = useState(false);
  const [simiInfoOpen, setSimiInfoOpen] = useState(false);
  const [simiIdx, setSimiIdx] = useState(0);

  useEffect(() => { setSimiIdx(0); }, [simiResults]);

  useEffect(() => {
    let cancelled = false;
    if (!enzyme.id || enzyme.id === 'unknown') { setMwE(null); return; }
    fetchUniProtMolecularWeight(enzyme.id).then(v => { if (!cancelled) setMwE(v); });
    return () => { cancelled = true; };
  }, [enzyme.id]);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      if (substrateCid) {
        const v = await fetchPubChemMolecularWeight(substrateCid);
        if (!cancelled) setMwS(v);
      } else if (substrateSmiles) {
        const v = await fetchPubChemMolecularWeightBySmiles(substrateSmiles);
        if (!cancelled) setMwS(v);
      } else {
        setMwS(null);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [substrateCid, substrateSmiles]);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      if (productCid) {
        const v = await fetchPubChemMolecularWeight(productCid);
        if (!cancelled) setMwP(v);
      } else if (productSmiles) {
        const v = await fetchPubChemMolecularWeightBySmiles(productSmiles);
        if (!cancelled) setMwP(v);
      } else {
        setMwP(null);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [productCid, productSmiles]);

  // Derive kcat (s⁻¹) and km (mol/L) from enzyme fields, falling back to group medians
  const kcatRaw = enzyme.kcat && enzyme.kcat !== 'Unavailable' ? parseFloat(enzyme.kcat) : NaN;
  const kmRaw   = enzyme.km   && enzyme.km   !== 'Unavailable' ? parseFloat(enzyme.km)   : NaN;

  const kcat: number | null = isFinite(kcatRaw) && kcatRaw > 0
    ? kcatRaw
    : (groupStats?.kcat_per_s?.median ?? null);

  const kmMM: number | null = isFinite(kmRaw) && kmRaw > 0
    ? kmRaw
    : (groupStats?.km_mM?.median ?? null);
  const km: number | null = kmMM != null ? kmMM / 1000 : null; // mM → mol/L

  const paramsForTarget: YieldParams | null =
    (mwE && mwS && mwP && kcat != null && km != null)
      ? {
          mwE,
          mwS,
          mwP,
          kcat,
          km,
          mE: enzymeMassMg * 1e-3,
          mS: substrateAddedUg * 1e-6,
          V:  REACTION_VOLUME_L,
        }
      : null;

  // Product mass at chosen conversion: mS × (mwP/mwS) × conversion
  const targetProductG: number | null = (paramsForTarget && mwS && mwP)
    ? (substrateAddedUg * 1e-6) * (mwP / mwS) * (conversionPct / 100)
    : null;

  // Q1/Q3 kcat from group stats for range + conservative time
  const kcatQ1 = groupStats?.kcat_per_s?.q1 ?? null;
  const kcatQ3 = groupStats?.kcat_per_s?.q3 ?? null;

  const paramsQ1: YieldParams | null = (paramsForTarget && kcatQ1 != null)
    ? { ...paramsForTarget, kcat: kcatQ1 }
    : paramsForTarget;

  const paramsQ3: YieldParams | null = (paramsForTarget && kcatQ3 != null)
    ? { ...paramsForTarget, kcat: kcatQ3 }
    : paramsForTarget;

  // Time uses Q1 kcat (conservative lower percentile) × 2 safety factor
  const timeForTarget: number | null = (paramsQ1 && targetProductG != null)
    ? reactionTimeForMassProduct(targetProductG, paramsQ1) * 2
    : null;

  // Yield range: what Q1 and Q3 enzymes produce at the median-kcat raw time
  const rawTimeMedian: number | null = (paramsForTarget && targetProductG != null)
    ? reactionTimeForMassProduct(targetProductG, paramsForTarget)
    : null;

  const yieldLow: number | null = (rawTimeMedian != null && paramsQ1 != null)
    ? massProductAtTime(rawTimeMedian, paramsQ1)
    : targetProductG != null ? targetProductG * 0.55 : null;

  const yieldHigh: number | null = (rawTimeMedian != null && paramsQ3 != null)
    ? massProductAtTime(rawTimeMedian, paramsQ3)
    : targetProductG != null ? targetProductG * 0.95 : null;

  // ── UI ──
  return (
    <div className="w-full rounded-xl border border-border bg-muted/20 px-7 py-8">

      <div className="grid grid-cols-1 md:grid-cols-[calc(16.67%_+_1cm)_calc(16.67%_+_1cm)_1fr_1fr] gap-5 min-h-[280px]">

        {/* ── 1. REACTION CONDITIONS ─────────────────────────────────────── */}
        <section className="flex flex-col gap-3 md:border-r md:border-border/50 md:pr-4">
          <header className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4" style={{ color: accentColor }} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Reaction conditions
            </h3>
            <button
              type="button"
              onClick={() => setSubstrateInfoOpen(true)}
              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="About substrate mass needed"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </header>
          <dl className="flex flex-col gap-2">

            {/* ── Substrate added slider ── */}
            {paramsForTarget ? (
              <div className="px-3 py-2.5 rounded-lg bg-muted/40 border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted-foreground">substrate added</dt>
                  <dd className="text-base font-mono font-bold" style={{ color: accentColor }}>
                    {substrateAddedUg} µg
                  </dd>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={substrateAddedUg}
                  onChange={e => setSubstrateAddedUg(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: accentColor, height: '18px' }}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>10 µg</span><span>100 µg</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40 border border-border/40">
                <dt className="text-sm text-muted-foreground">substrate added</dt>
                <dd className="text-sm font-mono font-semibold" style={{ color: accentColor }}>10 µg</dd>
              </div>
            )}

            {/* ── Substrate conversion slider ── */}
            {paramsForTarget ? (
              <div className="px-3 py-2.5 rounded-lg bg-muted/40 border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted-foreground">substrate conversion</dt>
                  <dd className="text-base font-mono font-bold" style={{ color: accentColor }}>
                    {conversionPct}%
                  </dd>
                </div>
                <input
                  type="range"
                  min={10}
                  max={99}
                  step={1}
                  value={conversionPct}
                  onChange={e => setConversionPct(Number(e.target.value))}
                  className="w-full cursor-pointer"
                  style={{ accentColor: accentColor, height: '18px' }}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>10%</span><span>99%</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40 border border-border/40">
                <dt className="text-sm text-muted-foreground">substrate conversion</dt>
                <dd className="text-sm font-mono font-semibold" style={{ color: accentColor }}>99%</dd>
              </div>
            )}

            {/* ── Remaining rows ── */}
            {([
              (() => {
                const individual = enzyme.optimalTemp && enzyme.optimalTemp !== 'Unavailable';
                const fallback   = !individual && groupStats?.temperature;
                const value      = individual
                  ? `${Math.round(parseFloat(enzyme.optimalTemp))}°C`
                  : fallback
                    ? `${Math.round(groupStats!.temperature!.median)}°C`
                    : '—';
                return { label: 'temperature', value, placeholder: !individual && !fallback };
              })(),
              (() => {
                const individual = enzyme.optimalPh && enzyme.optimalPh !== 'Unavailable';
                const fallback   = !individual && groupStats?.ph;
                const value      = individual
                  ? parseFloat(enzyme.optimalPh).toFixed(1)
                  : fallback
                    ? groupStats!.ph!.median.toFixed(1)
                    : '—';
                return { label: 'pH', value, placeholder: !individual && !fallback };
              })(),
              {
                label: 'time',
                value: paramsForTarget ? formatTimeHours(timeForTarget) : '1 h',
                placeholder: !paramsForTarget,
              },
              { label: 'solvent', value: <span>H<sub>2</sub>O</span>, placeholder: false },
              (() => {
                const cofs = groupStats?.cofactors?.filter(c => c.name !== 'more') ?? [];
                const value = cofs.length > 0
                  ? cofs.map(c => c.name).join(', ')
                  : 'not needed';
                return { label: 'co-factors', value, placeholder: cofs.length === 0 };
              })(),
            ] as { label: string; value: React.ReactNode; placeholder: boolean }[]).map(({ label, value, placeholder }) => {
              const stacked = label === 'co-factors' && !placeholder;
              return (
                <div
                  key={label}
                  className={`px-3 py-2.5 rounded-lg bg-muted/40 border border-border/40 ${stacked ? 'flex flex-col gap-1' : 'flex items-start justify-between gap-3'}`}
                >
                  <dt className="text-sm text-muted-foreground shrink-0">{label}</dt>
                  <dd className={stacked ? 'w-full' : 'min-w-0 flex-1 text-right'}>
                    <span
                      className="text-sm font-mono font-semibold"
                      style={{ color: placeholder ? undefined : accentColor }}
                    >
                      {value}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        {/* ── 2. PREDICTED YIELD ────────────────────────────────────────── */}
        <section className="space-y-3 md:border-r md:border-border/50 md:px-4 flex flex-col">
          <header className="flex items-center gap-2">
            <Beaker className="w-4 h-4" style={{ color: accentColor }} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Predicted yield
            </h3>
            <button
              type="button"
              onClick={() => setYieldInfoOpen(true)}
              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="About predicted yield"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </header>
          <p className="text-xs text-muted-foreground/70 leading-snug">
            for biocatalysts expected to catalyze your reaction (20th–80th percentile based on kinetic data from similar reactions)
          </p>
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-1">
            {paramsForTarget && targetProductG != null ? (
              <>
                <p className="text-3xl font-bold font-mono leading-tight" style={{ color: accentColor }}>
                  {formatMass(yieldLow)}
                  <span className="mx-2 text-muted-foreground/50">–</span>
                  {formatMass(yieldHigh)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  of product at {conversionPct}% conversion under optimal conditions
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground leading-snug">
                Yield unknown due to lower kinetic confidence.<br />
                For reliable LC-MS detection, please use recommended conditions.
              </p>
            )}
          </div>
        </section>

        {/* ── 3. SIMILAR REACTIONS ────────────────────────────────── */}
        <section className="flex flex-col gap-3 md:border-r md:border-border/50 md:px-5">
          <header className="flex items-center gap-2">
            <GitCompareArrows className="w-4 h-4" style={{ color: accentColor }} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Similar reactions
            </h3>
            <button
              type="button"
              onClick={() => setSimiInfoOpen(true)}
              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="About similar reactions"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </header>
          {simiResults.length === 0 && !simiLoading && !simiError && (
            <div className="flex-1 flex items-center justify-center">
              <button
                type="button"
                onClick={onLoadSimi}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors"
                style={{ borderColor: accentColor, color: accentColor, background: 'transparent' }}
              >
                <Search className="w-3.5 h-3.5" /> Load
              </button>
            </div>
          )}
          {simiLoading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {simiError && !simiLoading && (
            <p className="text-xs text-destructive">{simiError}</p>
          )}
          {simiResults.length > 0 && (() => {
            const cur = simiResults[simiIdx];
            const { reactants, products } = parseReactionSmiles(cur.reaction);
            const mainReactant = primaryOrganic(reactants);
            const mainProduct  = primaryOrganic(products);
            return (
              <div className="flex flex-col gap-2">
                {/* Metadata row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold font-mono text-foreground">RHEA:{cur.rhea_id}</span>
                  {cur.ec.slice(0, 2).map(ec => (
                    <span key={ec} className="text-[10px] bg-muted border border-border rounded-full px-1.5 py-0.5 font-mono text-muted-foreground">
                      EC {ec}
                    </span>
                  ))}
                  <span className="ml-auto text-xs font-mono font-bold" style={{ color: simiScoreColor(cur.score) }}>
                    {Math.round(cur.score * 100)}%
                  </span>
                </div>

                {/* Substrate → Product (vertical), with hover nav arrows */}
                <div className="relative group flex flex-col items-center gap-0.5">
                  {simiResults.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSimiIdx(i => (i - 1 + simiResults.length) % simiResults.length)}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-muted/80 border border-border text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground hover:bg-muted"
                        aria-label="Previous reaction"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimiIdx(i => (i + 1) % simiResults.length)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-muted/80 border border-border text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground hover:bg-muted"
                        aria-label="Next reaction"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {mainReactant && <MoleculeViewer smiles={mainReactant} width={220} height={150} />}
                  <span className="text-xl leading-none opacity-60" style={{ color: accentColor }}>↓</span>
                  {mainProduct && <MoleculeViewer smiles={mainProduct} width={220} height={150} />}
                </div>

                {/* Counter + RHEA link */}
                <div className="flex items-center">
                  {simiResults.length > 1 && (
                    <span className="text-[10px] text-muted-foreground/60">{simiIdx + 1} / {simiResults.length}</span>
                  )}
                  <a
                    href={cur.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors text-sky-500 border-sky-400/40 bg-sky-500/5 hover:bg-sky-500/15 ml-auto"
                  >
                    View on RHEA <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })()}
        </section>

        {/* ── 4. REFERENCES ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3 md:pl-5">
          <header className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              References
            </h3>
          </header>
          {simiResults.length === 0 && !simiLoading && !simiError && (
            <div className="flex-1 flex items-center justify-center">
              <button
                type="button"
                onClick={onLoadSimi}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors"
                style={{ borderColor: accentColor, color: accentColor, background: 'transparent' }}
              >
                <BookOpen className="w-3.5 h-3.5" /> Load
              </button>
            </div>
          )}
          {simiLoading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {simiError && !simiLoading && (
            <p className="text-xs text-destructive">{simiError}</p>
          )}
          {simiResults.length > 0 && (
            <ul className="space-y-2.5 pr-1 overflow-y-auto max-h-[260px]">
              {simiResults[simiIdx].publications.length === 0 && (
                <li className="text-sm text-muted-foreground">No publications found.</li>
              )}
              {simiResults[simiIdx].publications.map(pub => (
                <li key={pub.pmid}>
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-2 group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                        "{pub.title}"
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {pub.authors} · <em>{pub.journal}</em> ({pub.year})
                      </p>
                    </div>
                    <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>

      {/* ── Substrate info dialog ─────────────────────────────────────────── */}
      <Dialog open={substrateInfoOpen} onOpenChange={setSubstrateInfoOpen}>
        <DialogContent className="max-w-sm rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              Substrate amount per well
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <span className="font-semibold text-foreground">10 µg</span> of substrate per well is recommended to ensure reliable detection of your desired transformation, even at low yields or under suboptimal conditions.
            </p>
            <p>
              This produces at least <span className="font-semibold text-foreground">1 µg of product</span> in a 20 µL volume, allowing you to inject 2 µL (100 ng) into LC-MS while staying well above the detection limit.
            </p>
            <p>
              This enables you to clearly determine whether the transformation occurred. If successful, you can optimize further. If not, you can confidently conclude that the biocatalyst cannot perform the desired reaction on your substrate.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Predicted yield info dialog ───────────────────────────────────── */}
      <Dialog open={yieldInfoOpen} onOpenChange={setYieldInfoOpen}>
        <DialogContent className="max-w-sm rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="w-4 h-4 text-primary" />
              Predicted Yield
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Shows the <span className="font-semibold text-foreground">20th–80th percentile</span> of reported yields for enzymes in your kit that have recorded kinetic parameters on any substrates.
            </p>
            <p>
              Part of biocatalysts in your custom kit give <span className="font-semibold text-foreground">no yield</span>, indicating they do not accept your substrate. Among those that do show activity, most will give lower yields, while only a few will display higher predicted yields — these are the best candidates for further optimization and scale-up.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Similar reactions info dialog */}
      <Dialog open={simiInfoOpen} onOpenChange={setSimiInfoOpen}>
        <DialogContent className="max-w-sm rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompareArrows className="w-4 h-4 text-primary" />
              Similar reactions
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Shows biochemically similar reactions retrieved from the <span className="font-semibold text-foreground">RHEA</span> reaction database, ranked by structural similarity to your substrate and product.
            </p>
            <p>
              Similarity is computed using <span className="font-semibold text-foreground">Morgan fingerprints</span> and <span className="font-semibold text-foreground">DRFP reaction fingerprints</span>. Higher scores indicate closer structural matches and are more likely to share enzyme compatibility.
            </p>
            <p className="text-xs">
              Each result links to the full RHEA entry and its associated literature references.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bottom action ─────────────────────────────────────────────────── */}
      <div className="mt-7 pt-5 border-t border-border/50">
        <button
          type="button"
          onClick={onExploreBiocatalysts}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all cursor-pointer"
          style={{ background: 'var(--primary-500)', color: '#fff', boxShadow: 'none' }}
        >
          <Dna className="w-4 h-4" />
          Explore selected biocatalysts
        </button>
      </div>
    </div>
  );
};
