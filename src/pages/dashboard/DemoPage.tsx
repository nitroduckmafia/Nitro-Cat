// DemoPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import SmilesDrawer from 'smiles-drawer';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import demoSets from '@/data/synbiobeta_demo_sets.json';
import type { DemoReaction } from '@/types/demo';
import { cn } from '@/lib/utils';
import { joinWaitlist } from '@/lib/api/supabase';

type Phase = 'intro' | 'guess' | 'revealed';

// ── helpers ──────────────────────────────────────────────────────────────────
// ncnc = purine core (ATP, ADP, GTP, GDP, NAD+, NADH, NADP+, NADPH, FAD, CoA all share it).
// P(=O) + [nH] catches pyrimidine nucleotides (UDP, UTP, UMP, CDP) via phosphate + uracil NH.
const COFACTOR_NAME_TOKENS = [
  'ATP', 'ADP', 'AMP', 'GTP', 'GDP', 'GMP',
  'UTP', 'UDP', 'UMP', 'CTP', 'CDP', 'CMP',
  'NAD+', 'NADH', 'NADP+', 'NADPH',
  'FAD', 'FADH2', 'FMN', 'FMNH2',
  'CoA', 'acetyl-CoA', 'Pi', 'Pᵢ', 'PPi', 'PPᵢ',
];
function isCofactor(smi: string): boolean {
  if (smi.includes('ncnc')) return true;
  if (smi.includes('P(=O)') && smi.includes('[nH]')) return true;
  // inorganic phosphate / pyrophosphate: has phosphate, no C or N atoms, short
  if (smi.includes('P(=O)') && !smi.includes('C') && !smi.includes('N') && smi.length <= 25) return true;
  return false;
}
function pickMainIdx(s: string): { smiles: string; origIdx: number } {
  const parts = s.split('.');
  const pool = parts.map((smiles, origIdx) => ({ smiles, origIdx })).filter(({ smiles }) => !isCofactor(smiles));
  const candidates = pool.length > 0 ? pool : parts.map((smiles, origIdx) => ({ smiles, origIdx }));
  return candidates.reduce((a, b) => (b.smiles.length > a.smiles.length ? b : a), candidates[0]);
}
function pickMain(s: string): string {
  return pickMainIdx(s).smiles;
}
function pickLabel(fullName: string, origIdx: number): string {
  const parts = fullName.split(/\s*\+\s*/);
  if (parts.length <= 1) return fullName;
  const nonCofactorParts = parts.filter(p => !COFACTOR_NAME_TOKENS.some(t => p.trim().includes(t)));
  if (nonCofactorParts.length === 1) return nonCofactorParts[0].trim();
  return (parts[origIdx] ?? parts[0]).trim();
}
function parseSMILES(s: string, subName = '', prodName = '') {
  const [l, r] = s.split('>>');
  const subInfo = pickMainIdx(l ?? '');
  const prodInfo = pickMainIdx(r ?? '');
  return {
    substrate: subInfo.smiles,
    product: prodInfo.smiles,
    subLabel: subName ? pickLabel(subName, subInfo.origIdx) : subName,
    prodLabel: prodName ? pickLabel(prodName, prodInfo.origIdx) : prodName,
  };
}

const MOCK_ORGS = [
  // plants
  'Arabidopsis thaliana Col-0',
  'Catharanthus roseus (L.) G.Don',
  'Papaver somniferum L.',
  'Taxus brevifolia Nutt.',
  'Cannabis sativa L.',
  'Nicotiana tabacum cv. Bright Yellow 2',
  'Solanum lycopersicum cv. Heinz 1706',
  'Oryza sativa Japonica Group',
  'Glycine max cv. Williams 82',
  'Zea mays B73',
  'Mentha piperita L.',
  'Salvia rosmarinus Schleid.',
  'Vitis vinifera cv. Pinot Noir',
  'Camellia sinensis (L.) Kuntze',
  // plant-associated microbes
  'Sinorhizobium meliloti 1021',
  'Agrobacterium tumefaciens C58',
  'Streptomyces coelicolor A3(2)',
  'Pseudomonas putida KT2440',
  // workhorse expression hosts
  'Escherichia coli K-12',
  'Saccharomyces cerevisiae S288C',
  'Pichia pastoris GS115',
  'Corynebacterium glutamicum ATCC 13032',
  // thermophiles / archaea
  'Pyrococcus furiosus DSM 3638',
  'Sulfolobus acidocaldarius DSM 639',
];
function mockScore(id: string, off: number): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) & 0x7fffffff;
  return Math.max(0.55, 0.97 - off * 0.085 - (h % 80) / 1000);
}
function getMockEnzymes(rxn: DemoReaction, orgs?: string[]) {
  const base = rxn.ec_name.split('(')[0].trim();
  return [0, 1, 2].map(i => ({
    name: i === 0 ? rxn.ec_name : base + (i === 1 ? ' variant' : ' homolog'),
    org: orgs ? orgs[i] : MOCK_ORGS[(rxn.id.charCodeAt(0) * (i + 3)) % MOCK_ORGS.length],
    score: mockScore(rxn.id + i, i),
  }));
}
function buildRoundOrgs(reactions: DemoReaction[]): Map<string, string[]> {
  const counts = new Map<string, number>();
  const result = new Map<string, string[]>();
  for (const rxn of reactions) {
    const pool = [...MOCK_ORGS].sort(() => Math.random() - 0.5);
    const picked: string[] = [];
    for (const org of pool) {
      if (picked.length >= 3) break;
      if ((counts.get(org) ?? 0) < 2) {
        picked.push(org);
        counts.set(org, (counts.get(org) ?? 0) + 1);
      }
    }
    for (const org of pool) { if (picked.length >= 3) break; if (!picked.includes(org)) picked.push(org); }
    result.set(rxn.id, picked);
  }
  return result;
}
function scoreColor(s: number) {
  return s >= 0.9 ? '#3FB950' : s >= 0.7 ? '#F59E0B' : '#F87171';
}

const MAX_ROUNDS = 3;

function buildAllRounds(): DemoReaction[][] {
  const sets = demoSets as any[];
  const allImp = sets.map(s => s.reactions.find((r: any) => r.is_impossible)).filter(Boolean) as DemoReaction[];
  const allDoable = sets.flatMap((s: any) => s.reactions.filter((r: any) => !r.is_impossible)) as DemoReaction[];
  const imp = [...allImp].sort(() => Math.random() - 0.5);
  const doable = [...allDoable].sort(() => Math.random() - 0.5);

  const shownSmiles = new Set<string>();
  function molKey(rxn: DemoReaction) {
    const [l, r] = rxn.reaction_smiles.split('>>');
    return [pickMain(l ?? ''), pickMain(r ?? '')];
  }
  function pickUnique(pool: DemoReaction[], n: number): DemoReaction[] {
    const result: DemoReaction[] = [];
    for (const rxn of pool) {
      if (result.length >= n) break;
      const [sub, prod] = molKey(rxn);
      if (!shownSmiles.has(sub) && !shownSmiles.has(prod)) {
        shownSmiles.add(sub);
        shownSmiles.add(prod);
        result.push(rxn);
      }
    }
    // fallback if pool too small
    for (const rxn of pool) {
      if (result.length >= n) break;
      if (!result.includes(rxn)) result.push(rxn);
    }
    return result;
  }

  return Array.from({ length: MAX_ROUNDS }, (_, i) => {
    const impRxn = imp[i];
    if (impRxn) { const [s, p] = molKey(impRxn); shownSmiles.add(s); shownSmiles.add(p); }
    const three = pickUnique(doable, 3);
    return [...three, ...(impRxn ? [impRxn] : [])].sort(() => Math.random() - 0.5);
  });
}

// ── MolViewer ─────────────────────────────────────────────────────────────────
function MolViewer({ smiles, drawer, theme, drawerReady }: {
  smiles: string; drawer: React.MutableRefObject<any>; theme: string; drawerReady: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!drawerReady || !ref.current || !drawer.current || !smiles) return;
    const el = ref.current;
    try {
      drawer.current.draw(
        smiles, null, theme,
        (svg: SVGElement) => {
          el.innerHTML = '';
          // Make rendered SVG fluid so it scales down on mobile.
          svg.removeAttribute('width');
          svg.removeAttribute('height');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          (svg.style as any).width = '100%';
          (svg.style as any).height = '100%';
          (svg.style as any).maxWidth = '100%';
          el.appendChild(svg);
        },
        () => { el.innerHTML = ''; },
      );
    } catch { el.innerHTML = ''; }
  }, [smiles, theme, drawerReady, drawer]);
  return <div ref={ref} style={{ width: '100%', maxWidth: 240, height: 150, overflow: 'hidden' }} />;
}

// ── MolPair (shared between card and modal) ───────────────────────────────────
function MolPair({ rxn, drawer, theme, drawerReady }: {
  rxn: DemoReaction; drawer: React.MutableRefObject<any>; theme: string; drawerReady: boolean;
}) {
  const { substrate, product, subLabel, prodLabel } = parseSMILES(rxn.reaction_smiles, rxn.substrate_name, rxn.product_name);
  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex-1 min-w-0 h-[120px] sm:h-[150px] bg-background rounded-lg overflow-hidden flex items-center justify-center">
          <MolViewer smiles={substrate} drawer={drawer} theme={theme} drawerReady={drawerReady} />
        </div>
        <span className="text-xl sm:text-2xl shrink-0 text-primary opacity-65">&#x27F6;</span>
        <div className="flex-1 min-w-0 h-[120px] sm:h-[150px] bg-background rounded-lg overflow-hidden flex items-center justify-center">
          <MolViewer smiles={product} drawer={drawer} theme={theme} drawerReady={drawerReady} />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr]">
        <span className="text-sm text-muted-foreground leading-snug">{subLabel}</span>
        <span />
        <span className="text-sm text-muted-foreground leading-snug text-right">{prodLabel}</span>
      </div>
    </>
  );
}

// ── ReactionCard ──────────────────────────────────────────────────────────────
function ReactionCard({ rxn, selected, phase, onClick, onEnzymeClick, orgs, drawer, theme, drawerReady }: {
  rxn: DemoReaction; selected: boolean; phase: Phase; onClick: () => void; onEnzymeClick?: () => void;
  orgs?: string[]; drawer: React.MutableRefObject<any>; theme: string; drawerReady: boolean;
}) {
  const revealed = phase === 'revealed';
  const enzymes = getMockEnzymes(rxn, orgs);
  const handleClick = !revealed ? onClick : (revealed && !rxn.is_impossible ? onEnzymeClick : undefined);
  return (
    <div
      onClick={handleClick}
      className={cn(
        'rounded-xl border bg-secondary p-5 flex flex-col gap-3 transition-all duration-150',
        (!revealed || (revealed && !rxn.is_impossible)) && 'cursor-pointer',
        !revealed && selected && 'border-2 border-primary bg-accent ring-2 ring-primary/40',
        !revealed && !selected && 'hover:border-primary/60 hover:bg-muted',
        revealed && rxn.is_impossible && 'border-red-500 bg-red-500/5',
        revealed && !rxn.is_impossible && 'border-green-600 dark:border-green-500',
      )}
    >
      <MolPair rxn={rxn} drawer={drawer} theme={theme} drawerReady={drawerReady} />

      {/* Badge */}
      <div className="flex justify-end">
        {!revealed && selected && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary">
            ● Your pick
          </span>
        )}

        {revealed && !rxn.is_impossible && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 dark:text-green-400">
            ✓ Enzyme found
          </span>
        )}
      </div>

      {/* Revealed body */}
      {revealed && (
        <div className="pt-2.5 border-t border-border flex flex-col gap-2">
          {rxn.is_impossible ? (
            <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
              <span className="text-3xl">🚫</span>
              <p className="text-base font-bold text-red-500 leading-snug">We cannot find an enzyme for this reaction</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-green-500 dark:text-green-400">✓ NitroCat found candidate enzymes</p>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="py-0.5 text-left font-semibold uppercase tracking-wide text-muted-foreground text-[10px] pr-1">Enzyme</th>
                    <th className="py-0.5 text-left font-semibold uppercase tracking-wide text-muted-foreground text-[10px] pr-1">Organism</th>
                    <th className="py-0.5 text-right font-semibold uppercase tracking-wide text-muted-foreground text-[10px]">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {enzymes.map((e, i) => (
                    <tr key={i} className={i > 0 ? 'border-t border-border' : ''}>
                      <td className="py-1 font-medium text-foreground pr-1">{e.name}</td>
                      <td className="py-1 italic text-muted-foreground pr-1">{e.org}</td>
                      <td className="py-1 text-right font-mono font-bold" style={{ color: scoreColor(e.score) }}>
                        {e.score.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── EnzymeDetailModal ────────────────────────────────────────────────────────
function EnzymeDetailModal({ rxn, orgs, onClose }: { rxn: DemoReaction | null; orgs?: string[]; onClose: () => void }) {
  if (!rxn) return null;
  const enzymes = getMockEnzymes(rxn, orgs);
  return (
    <Dialog open={!!rxn} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[500px] w-[90vw] p-0 gap-0 border-border rounded-2xl bg-white dark:bg-[var(--bg-elevated)]">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10 text-green-500 text-lg shrink-0">🧬</div>
            <div>
              <div className="text-lg font-bold">Candidate Enzymes</div>
              <div className="text-sm text-muted-foreground">{rxn.substrate_name} → {rxn.product_name}</div>
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-3 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Organism</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score</span>
            </div>
            {enzymes.map((e, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">{e.name}</span>
                  <span className="text-xs text-muted-foreground italic">{e.org}</span>
                </div>
                <span className="font-mono text-sm font-bold shrink-0" style={{ color: scoreColor(e.score) }}>
                  {e.score.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-border text-sm text-muted-foreground cursor-pointer hover:text-foreground hover:border-primary transition-colors bg-transparent"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── WrongModal ────────────────────────────────────────────────────────────────
function WrongModal({ open, impossibleRxn, onNextRound, drawer, theme, drawerReady, onClose }: {
  open: boolean; impossibleRxn: DemoReaction | null;
  onNextRound: () => void; onClose: () => void;
  drawer: React.MutableRefObject<any>; theme: string; drawerReady: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-[780px] w-[90vw] p-0 gap-0 border-border rounded-2xl bg-white dark:bg-[var(--bg-elevated)]"
      >
        {impossibleRxn && (
          <>
            <div className="flex items-start gap-3.5 p-6 pb-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500 text-xl shrink-0">✕</div>
              <div>
                <div className="text-xl font-bold">Not quite!</div>
                <div className="text-sm text-muted-foreground">The impossible reaction was actually this one:</div>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-3.5">
              <MolPair rxn={impossibleRxn} drawer={drawer} theme={theme} drawerReady={drawerReady} />
              <div className="h-px bg-border" />
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onNextRound}
                  style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
                  className="w-full py-[11px] rounded-[9px] text-[13.5px] font-bold border-none cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Next Round →
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── CorrectModal ──────────────────────────────────────────────────────────────
function CorrectModal({ open, onNextRound, onClose }: {
  open: boolean; onNextRound: () => void; onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-[400px] w-[90vw] p-0 gap-0 border-border rounded-2xl bg-white dark:bg-[var(--bg-elevated)]"
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="text-center text-5xl pt-2">🎉</div>
          <div className="text-2xl font-bold text-center">You found it!</div>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={onNextRound}
            style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
            className="w-full py-[11px] rounded-[9px] text-[13.5px] font-bold border-none cursor-pointer hover:opacity-90 transition-opacity"
          >
            Next Round →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── GameOverModal ────────────────────────────────────────────────────────────
function GameOverModal({ open, correct, onNewGame, onJoinList, onClose }: {
  open: boolean; correct: number; onNewGame: () => void; onJoinList: () => void; onClose: () => void;
}) {
  const won = correct >= 2;
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[480px] w-[90vw] p-0 gap-0 border-border rounded-2xl bg-white dark:bg-[var(--bg-elevated)]">
        <div className="p-6 flex flex-col gap-4">
          <div className="text-center text-5xl pt-2">{won ? '🏆' : '😔'}</div>
          <div className="text-2xl font-bold text-center">
            {won ? 'You won the photo with iGEM Grand Prize!' : 'Better luck next time!'}
          </div>
          <div className="font-mono text-sm text-muted-foreground text-center">
            {correct} / {MAX_ROUNDS} correct
          </div>
          <div className="h-px bg-border" />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onJoinList}
              style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
              className="w-full py-[11px] rounded-[9px] text-[13.5px] font-bold border-none cursor-pointer hover:opacity-90 transition-opacity"
            >
              Join the waiting list
            </button>
            <button
              type="button"
              onClick={onNewGame}
              className="w-full py-[10px] rounded-[9px] bg-transparent border border-border text-foreground text-[13px] font-semibold cursor-pointer hover:border-primary hover:text-primary transition-colors"
            >
              {won ? 'Play Again' : 'Try Again'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── EmailCaptureModal ────────────────────────────────────────────────────────
function EmailCaptureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await joinWaitlist(email);
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSubmitted(false);
    setEmail('');
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm p-0 gap-0 border-border rounded-2xl bg-white dark:bg-[var(--bg-elevated)]">
        <div className="p-6 flex flex-col gap-4">
          {!submitted ? (
            <>
              <div className="text-2xl font-bold">Stay in the loop</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Be notified when NitroCat goes live and get early access to enzyme ordering.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
                  className="w-full py-[11px] rounded-[9px] text-[13.5px] font-bold border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving…" : "Notify me when live"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-xl font-bold text-center">You're on the list!</div>
              <p className="text-sm text-muted-foreground text-center">
                We'll let you know at <span className="text-foreground font-medium">{email}</span> when NitroCat launches.
              </p>
              <button
                type="button"
                onClick={handleClose}
                style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
                className="w-full py-[11px] rounded-[9px] text-[13.5px] font-bold border-none cursor-pointer hover:opacity-90 transition-opacity"
              >
                Back to game
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── WaitlistCTA ───────────────────────────────────────────────────────────────
function WaitlistCTA({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex flex-col gap-1 text-center sm:text-left">
        <div className="text-sm font-semibold text-foreground">Get early access to NitroCat</div>
        <div className="text-xs text-muted-foreground">Be the first to order enzymes when we launch.</div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
        className="shrink-0 px-5 py-2.5 rounded-lg text-[13px] font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        Join the waitlist
      </button>
    </div>
  );
}

// ── ResetOverlay ──────────────────────────────────────────────────────────────
function ResetOverlay({ countdown, onPlayNow }: { countdown: number; onPlayNow: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-xl">
        <h2 className="text-xl font-bold mb-2">Ready for the next visitor?</h2>
        <p className="text-sm text-muted-foreground mb-5">Starting a new round automatically</p>
        <div className="text-6xl font-bold font-mono text-primary mb-6">{countdown}</div>
        <Button variant="outline" onClick={onPlayNow}>Play now</Button>
      </div>
    </div>
  );
}

// ── DemoPage ──────────────────────────────────────────────────────────────────
export default function DemoPage() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const drawerRef = useRef<any>(null);
  const [drawerReady, setDrawerReady] = useState(false);
  useEffect(() => {
    drawerRef.current = new (SmilesDrawer as any).SmiDrawer({ width: 240, height: 150 });
    setDrawerReady(true);
  }, []);

  const [allRounds, setAllRounds] = useState<DemoReaction[][]>(() => buildAllRounds());
  const [roundIndex, setRoundIndex] = useState(0);
  const reactions = allRounds[roundIndex];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const hasRevealedRef = useRef(false);

  const [wrongOpen, setWrongOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [enzymeRxn, setEnzymeRxn] = useState<DemoReaction | null>(null);
  const [gameOverOpen, setGameOverOpen] = useState(false);

  const impossibleRxn = reactions.find(r => r.is_impossible) ?? null;
  const roundOrgs = useMemo(() => buildRoundOrgs(reactions), [reactions]);

  function startNextRound() {
    setWrongOpen(false);
    setCorrectOpen(false);
    setShowReset(false);
    setRoundIndex(i => Math.min(i + 1, MAX_ROUNDS - 1));
    setSelectedId(null);
    setPhase('guess');
    hasRevealedRef.current = false;
  }

  function startNewGame() {
    setScore({ correct: 0, total: 0 });
    setGameOverOpen(false);
    setWrongOpen(false);
    setCorrectOpen(false);
    setShowReset(false);
    setAllRounds(buildAllRounds());
    setRoundIndex(0);
    setSelectedId(null);
    setPhase('guess');
    hasRevealedRef.current = false;
  }

  function reveal() {
    if (!selectedId || hasRevealedRef.current) return;
    const isCorrect = reactions.find(r => r.id === selectedId)?.is_impossible ?? false;
    setPhase('revealed');
    hasRevealedRef.current = true;
    const newTotal = score.total + 1;
    const newCorrect = score.correct + (isCorrect ? 1 : 0);
    setScore({ correct: newCorrect, total: newTotal });
    if (newTotal >= MAX_ROUNDS) {
      setGameOverOpen(true);
    } else if (isCorrect) {
      setCorrectOpen(true);
    } else {
      setWrongOpen(true);
    }
  }

  function tryAgain() {
    setWrongOpen(false);
    setSelectedId(null);
    setPhase('guess');
  }

  // auto-reset idle timer
  useEffect(() => {
    if (phase !== 'revealed') return;
    let idleTimer: ReturnType<typeof setTimeout>;
    let countInterval: ReturnType<typeof setInterval>;
    let countVal = 10;

    const doReset = () => {
      setWrongOpen(false);
      setCorrectOpen(false);
      setShowReset(false);
      setAllRounds(buildAllRounds());
      setRoundIndex(0);
      setScore({ correct: 0, total: 0 });
      setSelectedId(null);
      setPhase('guess');
      hasRevealedRef.current = false;
    };

    const startCountdown = () => {
      countVal = 10;
      setCountdown(10);
      setShowReset(true);
      countInterval = setInterval(() => {
        countVal -= 1;
        setCountdown(countVal);
        if (countVal <= 0) { clearInterval(countInterval); doReset(); }
      }, 1000);
    };

    const cancel = () => {
      clearTimeout(idleTimer);
      clearInterval(countInterval);
      setShowReset(false);
    };

    idleTimer = setTimeout(startCountdown, 30_000);
    window.addEventListener('mousemove', cancel, { once: true, passive: true });
    window.addEventListener('click', cancel, { once: true });
    window.addEventListener('keydown', cancel, { once: true });

    return () => {
      clearTimeout(idleTimer);
      clearInterval(countInterval);
      window.removeEventListener('mousemove', cancel);
      window.removeEventListener('click', cancel);
      window.removeEventListener('keydown', cancel);
    };
  }, [phase]);

  return (
    phase === 'intro' ? (
      <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6 pt-16 pb-10 sm:py-16 text-center overflow-y-auto">
        <div className="max-w-2xl flex flex-col items-center gap-6 sm:gap-8 w-full">
          <div className="text-6xl sm:text-8xl">🧬</div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
              <span className="text-primary">Reaction Puzzle</span>
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground leading-relaxed">
              You'll see <strong className="text-foreground">3 reactions</strong>. One of them has
              <strong className="text-foreground"> no known enzyme</strong> — NitroCat can't find a match.
            </p>
          </div>
          <div className="bg-secondary border border-border rounded-2xl p-6 text-left flex flex-col gap-4 w-full">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🔍</span>
              <div>
                <p className="font-semibold text-foreground text-base">Study the reactions</p>
                <p className="text-sm text-muted-foreground mt-0.5">Look at the substrate and product for each reaction card.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">☝️</span>
              <div>
                <p className="font-semibold text-foreground text-base">Pick the impossible one</p>
                <p className="text-sm text-muted-foreground mt-0.5">Tap the card you think has NO enzyme in nature.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🏆</span>
              <div>
                <p className="font-semibold text-foreground text-base">Score 2 out of 3 to win</p>
                <p className="text-sm text-muted-foreground mt-0.5">Get it right and earn a photo with the iGEM Grand Prize winner!</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPhase('guess')}
            style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
            className="w-full max-w-sm py-4 rounded-[10px] text-lg font-bold border-none cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
          >
            Start Puzzle →
          </button>
        </div>
      </div>
    ) : (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Instruction bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 pt-14 pb-4 bg-secondary border-b border-border gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex flex-col min-w-0 w-full">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
                <span className="text-primary bg-primary/10 px-3 sm:px-5 py-0.5 rounded-lg">Reaction Puzzle</span>
              </h1>
              <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground border border-border rounded-full px-3 py-1 shrink-0">
                  <Trophy className="w-3 h-3" />
                  <span className="font-bold text-primary">{score.correct}/{MAX_ROUNDS}</span>
                </span>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              We have 260k enzymes to catalyze your reactions.{' '}
              <strong className="text-primary font-semibold">Find the one we have NO ENZYMES for.</strong>
              {' '}
            </p>
          </div>
        </div>
        <div className="shrink-0 self-stretch sm:self-auto">
          {phase === 'guess' && (
            <button
              type="button"
              onClick={selectedId ? reveal : undefined}
              style={selectedId ? { background: 'var(--brand-primary)', color: 'var(--bg-primary)', borderColor: 'var(--brand-primary)' } : undefined}
              className={cn(
                'w-full sm:w-auto px-5 py-2 rounded-lg text-sm font-bold border transition-all duration-200',
                selectedId
                  ? 'cursor-pointer hover:opacity-90'
                  : 'bg-background text-foreground border-border cursor-default opacity-60',
              )}
            >
              Reveal Answer
            </button>
          )}
          {phase === 'revealed' && (
            <Button size="sm" variant="outline" onClick={startNextRound} className="w-full sm:w-auto">
              Next Round →
            </Button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {reactions.map(rxn => (
            <ReactionCard
              key={rxn.id}
              rxn={rxn}
              selected={selectedId === rxn.id}
              phase={phase}
              onClick={() => setSelectedId(rxn.id)}
              onEnzymeClick={() => setEnzymeRxn(rxn)}
              orgs={roundOrgs.get(rxn.id)}
              drawer={drawerRef}
              theme={theme}
              drawerReady={drawerReady}
            />
          ))}
        </div>

        {/* Waitlist CTA */}
        <WaitlistCTA onOpen={() => setEmailOpen(true)} />
      </div>

      <WrongModal
        open={wrongOpen}
        impossibleRxn={impossibleRxn}
        onNextRound={startNextRound}
        onClose={() => setWrongOpen(false)}
        drawer={drawerRef}
        theme={theme}
        drawerReady={drawerReady}
      />
      <CorrectModal
        open={correctOpen}
        onNextRound={startNextRound}
        onClose={() => setCorrectOpen(false)}
      />
      <GameOverModal
        open={gameOverOpen}
        correct={score.correct}
        onNewGame={startNewGame}
        onJoinList={() => { setGameOverOpen(false); setEmailOpen(true); }}
        onClose={() => setGameOverOpen(false)}
      />
      <EnzymeDetailModal rxn={enzymeRxn} orgs={roundOrgs.get(enzymeRxn?.id ?? '')} onClose={() => setEnzymeRxn(null)} />
      <EmailCaptureModal open={emailOpen} onClose={() => setEmailOpen(false)} />
      {showReset && (
        <ResetOverlay countdown={countdown} onPlayNow={() => { setShowReset(false); startNextRound(); }} />
      )}
    </div>
  )
  );
}
