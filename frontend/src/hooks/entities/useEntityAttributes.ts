import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@\/lib';
import type { Attribute, AttributeScope, AttributesByScope, EntityType } from '@/types';

const SCOPES: AttributeScope[] = ['CLIENT_SCOPE', 'SERVER_SCOPE', 'SHARED_SCOPE'];

export function useEntityAttributes(id: string, type: EntityType) {
  return useQuery({
    queryKey: ['attributes', id],
    queryFn: async (): Promise<AttributesByScope> => {
      const results = await Promise.all(
        SCOPES.map((scope) =>
          apiClient.get<Attribute[]>(`/entities/${id}/attributes?type=${type}&scope=${scope}`),
        ),
      );
      return {
        CLIENT_SCOPE: results[0],
        SERVER_SCOPE: results[1],
        SHARED_SCOPE: results[2],
      };
    },
  });
}
