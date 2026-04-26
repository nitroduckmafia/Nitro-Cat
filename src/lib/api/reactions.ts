import type { Reaction } from '@/types/reaction';

export async function getReactions(): Promise<Reaction[]> {
  return Promise.resolve([]);
}

export async function createReaction(data: Partial<Reaction>): Promise<Reaction> {
  const newReaction: Reaction = {
    id: Date.now().toString(),
    name: data.name ?? 'New Reaction',
    description: data.description ?? '',
    steps: data.steps ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
  };
  return Promise.resolve(newReaction);
}

export async function updateReaction(id: string, _data: Partial<Reaction>): Promise<Reaction> {
  throw new Error(`Reaction ${id} not found`);
}

export async function deleteReaction(_id: string): Promise<void> {
  return Promise.resolve();
}
