import type { Enzyme } from './enzyme';

export interface Molecule {
  name: string;
  smiles: string;
  formula?: string;
}

export interface ReactionStep {
  id: string;
  startMolecule: Molecule;
  productMolecule: Molecule;
  reactionType: string;
  enzymes: Enzyme[];
}

export interface Reaction {
  id: string;
  name: string;
  description: string;
  steps: ReactionStep[];
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'analyzing' | 'complete';
}

// ── Graph-based reaction representation ──────────────────────────────────────

export interface MoleculeNodeData {
  name: string;
  smiles: string;
  formula?: string;
}

export type ReactionLabel = 'Chemical synthesis' | 'Biocatalyst found' | 'Test biocatalysis';

export interface ReactionNodeData {
  label: ReactionLabel;
  confidence?: 'high' | 'good' | 'medium' | 'low';
  enzyme?: Enzyme;
  // injected by ReactionBuilder from edge/node graph
  substrateSmiles?: string;   // dot-joined if multi-substrate
  productSmiles?: string;
  substrateName?: string;
  productName?: string;
  reactionId?: string;
}

export interface ReactionGraphNode {
  id: string;
  type: 'molecule' | 'reaction';
  data: MoleculeNodeData | ReactionNodeData;
}

export interface ReactionGraph {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'analyzing' | 'complete';
  nodes: ReactionGraphNode[];
  edges: { id: string; source: string; target: string }[];
}
