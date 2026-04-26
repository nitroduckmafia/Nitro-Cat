import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReaction, getReactions, createReaction, updateReaction, deleteReaction } from '@/lib/api/reactions';
import type { Reaction } from '@/types/reaction';

export function useReactions() {
  return useQuery({
    queryKey: ['reactions'],
    queryFn: getReactions,
  });
}

export function useReaction(id: string) {
  return useQuery({
    queryKey: ['reactions', id],
    queryFn: () => getReaction(id),
    enabled: !!id,
  });
}

export function useCreateReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Reaction>) => createReaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}

export function useUpdateReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Reaction> }) => updateReaction(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['reactions', id] });
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}

export function useDeleteReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
}
