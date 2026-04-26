import type { Enzyme } from '@/types/enzyme';
import type { ReactionStep } from '@/types/reaction';

export async function searchEnzymes(_step: Pick<ReactionStep, 'reactionType'>): Promise<Enzyme[]> {
  return Promise.resolve([]);
}

export async function getEnzyme(id: string): Promise<Enzyme> {
  throw new Error(`Enzyme ${id} not found`);
}
