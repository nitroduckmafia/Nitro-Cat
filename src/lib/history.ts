export interface HistoryEntry {
  id: string;
  type: 'reaction';
  name: string;       // "Substrate → Product"
  subtitle: string;   // enzyme name or citation
  visitedAt: number;
}

const MAX = 50;

// In-memory only — cleared on page refresh, no persistence
const _entries: HistoryEntry[] = [];

export function addHistoryEntry(entry: Omit<HistoryEntry, 'visitedAt'>) {
  const idx = _entries.findIndex(e => e.id === entry.id);
  if (idx !== -1) _entries.splice(idx, 1);
  _entries.unshift({ ...entry, visitedAt: Date.now() });
  if (_entries.length > MAX) _entries.length = MAX;
}

export function getHistory(): HistoryEntry[] {
  return [..._entries];
}

export function clearHistory(): void {
  _entries.length = 0;
}
