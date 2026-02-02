import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { TRPCError } from '@trpc/server';
import { algoliaAdmin, ALGOLIA_INDICES, type AlgoliaIndexName } from '../../lib/algolia.js';

// Schema para busca
const searchSchema = z.object({
  query: z.string().min(1),
  hitsPerPage: z.number().min(1).max(20).optional().default(5),
  indices: z.array(z.string()).optional(),
});

export const algoliaRouter = router({
  // Busca server-side com filtro de user_id aplicado automaticamente
  search: protectedProcedure.input(searchSchema).mutation(async ({ ctx, input }) => {
    if (!algoliaAdmin) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Algolia não está configurado',
      });
    }

    const { query, hitsPerPage, indices } = input;
    const userId = ctx.user.id;

    // Índices a buscar
    const targetIndices = indices?.length
      ? indices.filter((i): i is AlgoliaIndexName =>
          Object.values(ALGOLIA_INDICES).includes(i as AlgoliaIndexName)
        )
      : Object.values(ALGOLIA_INDICES);

    // Construir queries para cada índice com filtro de user_id
    // API v5: parâmetros ficam no nível raiz, não em "params"
    const queries = targetIndices.map((indexName) => ({
      indexName,
      query,
      hitsPerPage,
      filters: `user_id:"${userId}"`,
      attributesToHighlight: ['*'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    }));

    try {
      const { results } = await algoliaAdmin.search({ requests: queries });

      // Processar resultados
      const processedResults: Array<{
        index: string;
        indexLabel: string;
        hits: Array<{
          objectID: string;
          [key: string]: unknown;
          _highlightResult?: Record<string, { value: string }>;
        }>;
        nbHits: number;
      }> = [];

      const indexLabels: Record<string, string> = {
        tc_transactions: 'Transações',
        tc_accounts: 'Contas',
        tc_credit_cards: 'Cartões',
        tc_goals: 'Metas',
        tc_debts: 'Dívidas',
        tc_daytrades: 'Day Trades',
      };

      for (let i = 0; i < results.length; i++) {
        const result = results[i] as any;
        const indexName = targetIndices[i];

        if (result.hits && result.hits.length > 0) {
          processedResults.push({
            index: indexName,
            indexLabel: indexLabels[indexName] || indexName,
            hits: result.hits.map((hit: any) => {
              // Remover user_id dos resultados por segurança
              const { user_id, ...rest } = hit;
              return rest;
            }),
            nbHits: result.nbHits || result.hits.length,
          });
        }
      }

      return {
        results: processedResults,
        totalHits: processedResults.reduce((acc, r) => acc + r.nbHits, 0),
      };
    } catch (error) {
      console.error('Algolia search error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao realizar busca',
      });
    }
  }),

  // Retorna os índices disponíveis
  getIndices: protectedProcedure.query(() => {
    return {
      indices: ALGOLIA_INDICES,
    };
  }),
});
