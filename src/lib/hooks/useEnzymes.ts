import { useQuery } from '@tanstack/react-query';
import { searchEnzymes, getEnzyme } from '@/lib/api/enzymes';
import type { ReactionStep } from '@/types/reaction';

export function useEnzymeSearch(step: Pick<ReactionStep, 'reactionType'> | null) {
  return useQuery({
    queryKey: ['enzymes', 'search', step?.reactionType],
    queryFn: () => searchEnzymes(step!),
    enabled: !!step,
  });
}

export function useEnzyme(id: string) {
  return useQuery({
    queryKey: ['enzymes', id],
    queryFn: () => getEnzyme(id),
    enabled: !!id,
  });
}
