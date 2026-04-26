import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHistory, clearHistory } from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";
import { cn } from "@/lib/utils";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60)  return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)  return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return `${hours} h ago`;
  return new Date(ts).toLocaleDateString();
}

export const HistoryPage = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<HistoryEntry[]>(() => getHistory());

  const handleClear = () => {
    clearHistory();
    setEntries([]);
  };

  const handleClick = (_entry: HistoryEntry) => {
    navigate('/reactions/new');
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Reactions you've run this session</p>
        </div>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleClear}>
            Clear history
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <History className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-base font-semibold text-foreground">No history yet</p>
          <p className="text-sm text-muted-foreground">Reactions you run will appear here for this session</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <button
              key={entry.id + entry.visitedAt}
              onClick={() => handleClick(entry)}
              className={cn(
                'bg-secondary border border-border rounded-xl p-5',
                'hover:border-primary hover:bg-primary/5 cursor-pointer transition-all',
                'flex items-center gap-4 text-left w-full',
              )}
            >
              <span className="shrink-0">
                <FlaskConical className="w-4 h-4 text-primary" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground truncate">{entry.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{entry.subtitle}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {relativeTime(entry.visitedAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
