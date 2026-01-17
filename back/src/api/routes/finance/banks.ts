import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type { Bank } from '../../../domain/finance-types.js';
import {
  getAllBanks,
  searchBanks,
  getBankById,
  getPopularBanks,
} from '../../../data/finance/bank-repository.js';

export async function bankRoutes(app: FastifyInstance) {
  // GET /finance/banks - Listar todos os bancos (com busca opcional)
  app.get<{
    Querystring: { q?: string };
    Reply: Bank[] | ApiError;
  }>('/finance/banks', async (request, reply) => {
    try {
      const { q } = request.query;

      let banksList;
      if (q && q.length >= 2) {
        banksList = await searchBanks(q);
      } else {
        banksList = await getAllBanks();
      }

      return banksList;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar bancos';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/banks/popular - Listar bancos populares
  app.get<{
    Reply: Bank[] | ApiError;
  }>('/finance/banks/popular', async (_request, reply) => {
    try {
      const banksList = await getPopularBanks();
      return banksList;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar bancos populares';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/banks/:id - Buscar banco por ID
  app.get<{
    Params: { id: string };
    Reply: Bank | ApiError;
  }>('/finance/banks/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const bank = await getBankById(id);

      if (!bank) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Banco nao encontrado',
          statusCode: 404,
        });
      }

      return bank;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar banco';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
