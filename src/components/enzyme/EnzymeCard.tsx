import type { Enzyme } from "@/types/enzyme";
import { ConfidenceScore } from "./ConfidenceScore";
import { FlaskConical } from "lucide-react";
import { formatConfidenceLabel } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils";

interface EnzymeCardProps {
  enzyme: Enzyme;
  onClick: () => void;
}

const accentColor: Record<'high' | 'good' | 'medium' | 'low', string> = {
  high:   '#25512B',
  good:   '#6CA033',
  medium: '#F69B05',
  low:    '#C00000',
};

export const EnzymeCard = ({ enzyme, onClick }: EnzymeCardProps) => {
  const confidence = formatConfidenceLabel(enzyme.score);

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-3 px-3 py-2.5 rounded-md text-left bg-secondary border border-border border-l-[3px] hover:bg-muted hover:glow-success transition-all group cursor-pointer"
      style={{ borderLeftColor: accentColor[confidence] }}
    >
      <FlaskConical className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-secondary-foreground group-hover:text-foreground whitespace-nowrap">
          {enzyme.name}
        </p>
        <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          {enzyme.ecNumber} · {enzyme.organism}
        </p>
      </div>
      <ConfidenceScore score={enzyme.score} />
    </button>
  );
};
