// demo.ts — stub layer, swap fetch calls for real API when backend is ready
import type { DemoSet } from "@/types/demo";
import rawSets from "@/data/synbiobeta_demo_sets.json";

const DEMO_API = import.meta.env.VITE_API_URL;
const USE_BACKEND = false; // flip to true once demo_server.py is reachable

const localSets = rawSets as unknown as DemoSet[];

export async function getDemoSets(): Promise<DemoSet[]> {
  if (USE_BACKEND) {
    const r = await fetch(`${DEMO_API}/sets`);
    return r.json();
  }
  return localSets;
}

export async function getDemoSet(setId: number): Promise<DemoSet> {
  if (USE_BACKEND) {
    const r = await fetch(`${DEMO_API}/sets/${setId}`);
    return r.json();
  }
  const s = localSets.find((s) => s.set_id === setId);
  if (!s) throw new Error(`Set ${setId} not found`);
  return { ...s, impossible_position: undefined as unknown as number }; // hide until reveal
}

export async function revealDemoSet(setId: number): Promise<DemoSet> {
  if (USE_BACKEND) {
    const r = await fetch(`${DEMO_API}/sets/${setId}/reveal`);
    return r.json();
  }
  const s = localSets.find((s) => s.set_id === setId);
  if (!s) throw new Error(`Set ${setId} not found`);
  return s; // includes impossible_position
}
