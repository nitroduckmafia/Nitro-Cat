/**
 * Molecule structure editor backed by Ketcher (EPAM).
 *
 * Communicates SMILES out via `onSmiles` (debounced 600 ms).
 * Communicates KET (Ketcher native format) out via `onKet` — use this for
 * lossless round-trip restoration between step switches.
 * External molecules can be loaded by passing a new `loadTrigger` object.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Editor } from 'ketcher-react';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import type { Ketcher } from 'ketcher-core';
import 'ketcher-react/dist/index.css';

export interface KetcherEditorProps {
  onSmiles: (smiles: string) => void;
  /** Emits the current MOL V2000 string on every edit (used for substrate→product copy). */
  onMolfile?: (molfile: string) => void;
  /** Emits the current KET string on every edit — preferred for lossless step-switch restoration. */
  onKet?: (ket: string) => void;
  height?: number;
  /** Optional label shown above the editor */
  label?: string;
  /**
   * To programmatically load a molecule, pass a new object here.
   * Accepts any format Ketcher supports: SMILES, MOL V2000, KET, etc.
   * Increment `key` to re-trigger even if the same struct is passed.
   */
  loadTrigger?: { molfile: string; key: number };
}

const structServiceProvider = new StandaloneStructServiceProvider();

export default function KetcherEditor({ onSmiles, onMolfile, onKet, height = 320, label, loadTrigger }: KetcherEditorProps) {
  const ketcherRef = useRef<Ketcher | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSmilesRef = useRef(onSmiles);
  const onMolfileRef = useRef(onMolfile);
  const onKetRef = useRef(onKet);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Keep refs current so callbacks always call the latest versions
  useEffect(() => { onSmilesRef.current = onSmiles; }, [onSmiles]);
  useEffect(() => { onMolfileRef.current = onMolfile; }, [onMolfile]);
  useEffect(() => { onKetRef.current = onKet; }, [onKet]);

  // Emit SMILES + MOL + KET on structure change (debounced)
  const emitStructure = useCallback(() => {
    const ketcher = ketcherRef.current;
    if (!ketcher) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const smiles = await ketcher.getSmiles();
        if (smiles) onSmilesRef.current(smiles);
        if (onMolfileRef.current) {
          const molfile = await ketcher.getMolfile();
          if (molfile) onMolfileRef.current(molfile);
        }
        if (onKetRef.current) {
          const ket = await ketcher.getKet();
          if (ket) onKetRef.current(ket);
        }
      } catch {
        /* empty canvas or conversion error */
      }
    }, 600);
  }, []);

  // Called by Ketcher once the editor is fully initialized
  const handleInit = useCallback((ketcher: Ketcher) => {
    ketcherRef.current = ketcher;
    setStatus('ready');

    // ketcher.changeEvent is a Subscription — use .add() to listen for edits
    ketcher.changeEvent.add(() => {
      emitStructure();
    });
  }, [emitStructure]);

  // Load external molecule when loadTrigger changes
  useEffect(() => {
    if (!loadTrigger?.molfile || !ketcherRef.current || status !== 'ready') return;
    ketcherRef.current.setMolecule(loadTrigger.molfile).catch((err) => {
      console.error('KetcherEditor: failed to load molecule', err);
    });
  }, [loadTrigger, status]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="rounded-xl border border-border overflow-hidden relative">
      {label && (
        <p className="text-xs uppercase tracking-widest text-muted-foreground px-3 pt-3 pb-1">{label}</p>
      )}

      {status === 'loading' && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/60 z-10"
          style={{ minHeight: height }}
        >
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div style={{ width: '100%', height: `${height}px` }}>
        <Editor
          staticResourcesUrl="/ketcher/"
          structServiceProvider={structServiceProvider}
          onInit={handleInit}
          errorHandler={(message: string) => {
            console.error('KetcherEditor error:', message);
          }}
        />
      </div>

      {status === 'error' && (
        <div
          className="flex items-center justify-center text-sm text-destructive"
          style={{ minHeight: height }}
        >
          Structure editor failed to load.
        </div>
      )}
    </div>
  );
}
