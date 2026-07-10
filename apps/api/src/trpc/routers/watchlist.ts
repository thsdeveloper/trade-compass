import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import {
  getWatchlistByUser,
  addToWatchlist,
  updateWatchlistItem,
  removeFromWatchlist,
} from '../../data/watchlist-repository.js';
import { getAsset } from '../../data/asset-repository.js';
import { getCandlesAsync } from '../../data/candle-repository.js';
import { calculateContext } from '../../engine/context.js';
import { calculateDecisionZone } from '../../engine/decision-zone.js';
import type { DecisionZoneType } from '../../domain/types.js';

export const watchlistRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const items = await getWatchlistByUser(ctx.user.id, ctx.accessToken);

    // Enrich with asset data and decision zone
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const asset = getAsset(item.ticker);
        let zone: DecisionZoneType = 'NEUTRA';

        try {
          const candles = await getCandlesAsync(item.ticker);
          if (candles && candles.length >= 55) {
            const context = calculateContext(candles);
            const decisionZone = calculateDecisionZone({ context, setups: [] });
            zone = decisionZone.zone;
          }
        } catch {
          // Keep default zone if analysis fails
        }

        return {
          id: item.id,
          ticker: item.ticker,
          name: asset?.name || item.ticker,
          notes: item.notes,
          zone,
          created_at: item.created_at,
        };
      })
    );

    return enrichedItems;
  }),

  create: protectedProcedure
    .input(
      z.object({
        ticker: z.string().min(1, 'Ticker é obrigatório'),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedTicker = input.ticker.toUpperCase().trim();
      const asset = getAsset(normalizedTicker);

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Ativo ${normalizedTicker} não encontrado`,
        });
      }

      try {
        const item = await addToWatchlist(
          ctx.user.id,
          { ticker: normalizedTicker, notes: input.notes },
          ctx.accessToken
        );

        return {
          id: item.id,
          ticker: item.ticker,
          name: asset.name,
          notes: item.notes,
          zone: 'NEUTRA' as DecisionZoneType,
          created_at: item.created_at,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao adicionar item';
        if (message.includes('ja existe')) {
          throw new TRPCError({
            code: 'CONFLICT',
            message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const item = await updateWatchlistItem(
          input.id,
          ctx.user.id,
          { notes: input.notes },
          ctx.accessToken
        );
        const asset = getAsset(item.ticker);

        return {
          id: item.id,
          ticker: item.ticker,
          name: asset?.name || item.ticker,
          notes: item.notes,
          zone: 'NEUTRA' as DecisionZoneType,
          created_at: item.created_at,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar item';
        if (message.includes('nao encontrado')) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message,
        });
      }
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await removeFromWatchlist(input.id, ctx.user.id, ctx.accessToken);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao remover item';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message,
        });
      }
    }),
});
