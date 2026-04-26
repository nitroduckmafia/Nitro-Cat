import type { Reaction, ReactionGraph, ReactionGraphNode } from '@/types/reaction';

/** Convert a linear Reaction (step-based) to a graph ReactionGraph (node/edge). */
export function reactionToGraph(r: Reaction): ReactionGraph {
  const nodes: ReactionGraphNode[] = [];
  const edges: { id: string; source: string; target: string }[] = [];

  // First molecule node
  nodes.push({ id: 'm0', type: 'molecule', data: r.steps[0].startMolecule });

  r.steps.forEach((step, idx) => {
    const rId = `r${idx + 1}`;
    const mId = `m${idx + 1}`;
    const prevMId = idx === 0 ? 'm0' : `m${idx}`;

    nodes.push({
      id: rId,
      type: 'reaction',
      data: {
        label: step.reactionType as 'Chemical synthesis' | 'Suggested biocatalysis',
        enzyme: step.enzymes[0],
      },
    });

    nodes.push({ id: mId, type: 'molecule', data: step.productMolecule });

    edges.push({ id: `e${idx * 2 + 1}`, source: prevMId, target: rId });
    edges.push({ id: `e${idx * 2 + 2}`, source: rId, target: mId });
  });

  return {
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    nodes,
    edges,
  };
}
