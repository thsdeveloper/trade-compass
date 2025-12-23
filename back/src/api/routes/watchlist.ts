import type { FastifyInstance } from 'fastify';
import type {
  ApiError,
  CreateWatchlistItemDTO,
  UpdateWatchlistItemDTO,
  WatchlistItemResponse,
  DecisionZoneType,
} from '../../domain/types.js';
import { authPlugin, type AuthenticatedRequest } from '../middleware/auth.js';
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

export async function watchlistRoutes(app: FastifyInstance) {
  // Apply auth middleware to all routes in this plugin
  await app.register(authPlugin);

  // GET /watchlist - Get user's watchlist with enriched data
  app.get<{
    Reply: WatchlistItemResponse[] | ApiError;
  }>('/watchlist', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const items = await getWatchlistByUser(user.id, accessToken);

      // Enrich with asset data and decision zone
      const enrichedItems: WatchlistItemResponse[] = await Promise.all(
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar watchlist';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /watchlist - Add item to watchlist
  app.post<{
    Body: CreateWatchlistItemDTO;
    Reply: WatchlistItemResponse | ApiError;
  }>('/watchlist', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { ticker, notes } = request.body;

    if (!ticker || typeof ticker !== 'string') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Ticker e obrigatorio',
        statusCode: 400,
      });
    }

    const normalizedTicker = ticker.toUpperCase().trim();
    const asset = getAsset(normalizedTicker);

    if (!asset) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Ativo ${normalizedTicker} nao encontrado`,
        statusCode: 404,
      });
    }

    try {
      const item = await addToWatchlist(
        user.id,
        { ticker: normalizedTicker, notes },
        accessToken
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
      const status = message.includes('ja existe') ? 409 : 500;
      return reply.status(status).send({
        error: status === 409 ? 'Conflict' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // PATCH /watchlist/:id - Update item notes
  app.patch<{
    Params: { id: string };
    Body: UpdateWatchlistItemDTO;
    Reply: WatchlistItemResponse | ApiError;
  }>('/watchlist/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const { notes } = request.body;

    try {
      const item = await updateWatchlistItem(id, user.id, { notes }, accessToken);
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
      const status = message.includes('nao encontrado') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /watchlist/:id - Remove item from watchlist
  app.delete<{
    Params: { id: string };
    Reply: { success: boolean } | ApiError;
  }>('/watchlist/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await removeFromWatchlist(id, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover item';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
