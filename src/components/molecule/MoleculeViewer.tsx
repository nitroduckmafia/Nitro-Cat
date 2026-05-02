import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import SmilesDrawer from 'smiles-drawer';
import { MOLECULE_THEMES } from '@/design/tokens';

interface MoleculeViewerProps {
  smiles: string;
  width?: number;
  height?: number;
  renderWidth?: number;
  renderHeight?: number;
  name?: string;
}

const NITRO_THEMES = {
  'nitro-light': MOLECULE_THEMES.light,
  'nitro-dark':  MOLECULE_THEMES.dark,
};

export const MoleculeViewer = ({ smiles, width = 240, height = 160, renderWidth, renderHeight }: MoleculeViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();

  const rw = renderWidth ?? width;
  const rh = renderHeight ?? height;

  useEffect(() => {
    if (!canvasRef.current || !smiles) return;

    const themeName = resolvedTheme === 'dark' ? 'nitro-dark' : 'nitro-light';

    const drawer = new SmilesDrawer.Drawer({
      width: rw,
      height: rh,
      bondThickness: 1.0,
      shortBondWidth: 0.85,
      themes: NITRO_THEMES,
    });

    setLoading(true);
    setError(false);

    SmilesDrawer.parse(
      smiles,
      (tree: any) => {
        drawer.draw(tree, canvasRef.current, themeName, false);
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );
  }, [smiles, rw, rh, resolvedTheme]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-muted/40 text-xs text-muted-foreground font-mono"
        style={{ width, height }}
      >
        Invalid SMILES
      </div>
    );
  }

  return (
    <div
      className="relative rounded-lg overflow-hidden bg-muted/20"
      style={{ width, height }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={rw}
        height={rh}
        className="block"
        style={{ width, height, opacity: loading ? 0 : 1, transition: 'opacity 0.2s' }}
      />
    </div>
  );
};
