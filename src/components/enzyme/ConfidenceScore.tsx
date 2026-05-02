import { formatScore, formatConfidenceLabel, CONFIDENCE_COLORS } from "@/lib/utils/formatting";

interface ConfidenceScoreProps {
  score: number;
}

export const ConfidenceScore = ({ score }: ConfidenceScoreProps) => {
  const label = formatConfidenceLabel(score);
  const color = CONFIDENCE_COLORS[label];

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold"
      style={{
        color,
        backgroundColor: color + '1a', // ~10% opacity
        border: `1px solid ${color}66`, // ~40% opacity
      }}
    >
      {formatScore(score)}
    </span>
  );
};
