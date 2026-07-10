import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { getCategoriesByUser } from '../../../data/finance/category-repository.js';
import { getAccountsByUser } from '../../../data/finance/account-repository.js';
import { getCreditCardById, getCreditCardsByUser } from '../../../data/finance/credit-card-repository.js';
import {
  getTransactionsByUser,
  createTransactionsBatch,
  createPaidTransactionsBatch,
  createTransfer,
} from '../../../data/finance/transaction-repository.js';
import type { CreateTransactionDTO } from '../../../domain/finance-types.js';
import {
  parseStatement,
  type ParsedStatementTransaction,
  type StatementFileKind,
} from '../../../services/statement-import-service.js';
import type { ConfirmImportItem } from '../../../services/import-validation-service.js';

export type { ConfirmImportItem };

interface ParseStatementBody {
  kind: StatementFileKind;
  filename: string;
  content: string;
  mime_type?: string;
  account_id?: string;
  credit_card_id?: string;
}

export interface ImportPreviewTransaction extends ParsedStatementTransaction {
  possible_duplicate: boolean;
}

interface ParseStatementResponse {
  transactions: ImportPreviewTransaction[];
}

interface ConfirmImportBody {
  account_id?: string;
  credit_card_id?: string;
  items: ConfirmImportItem[];
}

interface ConfirmImportResponse {
  transactions_created: number;
  transfers_created: number;
}

const VALID_KINDS: StatementFileKind[] = ['text', 'pdf', 'image'];

// Base64 de ~10MB de arquivo + JSON overhead
const BODY_LIMIT = 15 * 1024 * 1024;

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export async function importRoutes(app: FastifyInstance) {
  // POST /finance/import/parse - Interpreta um extrato bancario com IA
  app.post<{
    Body: ParseStatementBody;
    Reply: ParseStatementResponse | ApiError;
  }>('/finance/import/parse', { bodyLimit: BODY_LIMIT }, async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (!body.kind || !VALID_KINDS.includes(body.kind)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tipo de arquivo invalido',
        statusCode: 400,
      });
    }

    if (!body.content || typeof body.content !== 'string') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Conteudo do arquivo e obrigatorio',
        statusCode: 400,
      });
    }

    if (!body.account_id && !body.credit_card_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Informe a conta ou o cartao de destino',
        statusCode: 400,
      });
    }

    if (body.account_id && body.credit_card_id) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Informe conta OU cartao, nao ambos',
        statusCode: 400,
      });
    }

    try {
      const [categories, accounts, creditCards] = await Promise.all([
        getCategoriesByUser(user.id, accessToken),
        getAccountsByUser(user.id, accessToken),
        getCreditCardsByUser(user.id, accessToken),
      ]);

      const parsed = await parseStatement(
        {
          kind: body.kind,
          filename: body.filename || 'extrato',
          content: body.content,
          mimeType: body.mime_type,
          target: body.credit_card_id ? 'credit_card' : 'account',
          targetAccountId: body.account_id,
        },
        { categories, accounts, creditCards }
      );

      if (parsed.length === 0) {
        return { transactions: [] };
      }

      // Detectar possiveis duplicatas: mesmo destino, mesmo valor e data proxima (+-3 dias)
      const dates = parsed.map((tx) => tx.due_date).sort();
      const existing = await getTransactionsByUser(
        user.id,
        {
          account_id: body.account_id,
          credit_card_id: body.credit_card_id,
          start_date: addDays(dates[0], -3),
          end_date: addDays(dates[dates.length - 1], 3),
        },
        accessToken
      );

      const transactions: ImportPreviewTransaction[] = parsed.map((tx) => {
        const possibleDuplicate = existing.some(
          (e) =>
            e.type === tx.type &&
            Math.abs(e.amount - tx.amount) < 0.005 &&
            Math.abs(
              new Date(`${e.due_date}T00:00:00Z`).getTime() -
                new Date(`${tx.due_date}T00:00:00Z`).getTime()
            ) <=
              3 * 24 * 60 * 60 * 1000
        );
        return { ...tx, possible_duplicate: possibleDuplicate };
      });

      return { transactions };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar extrato';
      const isConfigError = message.includes('OPENAI_API_KEY');
      return reply.status(isConfigError ? 503 : 500).send({
        error: isConfigError ? 'Service Unavailable' : 'Internal Server Error',
        message,
        statusCode: isConfigError ? 503 : 500,
      });
    }
  });

  // POST /finance/import/confirm - Efetiva a importacao revisada
  // Extrato de conta: transacoes entram PAGAS (fato consumado) com ajuste de saldo;
  // transferencias internas usam o fluxo nativo de transferencia.
  // Fatura de cartao: compras entram PENDENTES com baixa no limite (fluxo padrao).
  app.post<{
    Body: ConfirmImportBody;
    Reply: ConfirmImportResponse | ApiError;
  }>('/finance/import/confirm', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;
    const items = body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Informe ao menos uma transacao',
        statusCode: 400,
      });
    }

    if (items.length > 500) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Maximo de 500 transacoes por lote',
        statusCode: 400,
      });
    }

    if ((!body.account_id && !body.credit_card_id) || (body.account_id && body.credit_card_id)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Informe conta OU cartao de destino',
        statusCode: 400,
      });
    }

    const isCardTarget = Boolean(body.credit_card_id);

    // Validar cada item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const label = `Transacao ${i + 1}`;

      if (!item.category_id || !item.type || !item.description || !item.amount || !item.due_date) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `${label}: categoria, tipo, descricao, valor e data sao obrigatorios`,
          statusCode: 400,
        });
      }

      if (isCardTarget && (item.kind !== 'NORMAL' || item.type !== 'DESPESA')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `${label}: fatura de cartao aceita apenas despesas comuns`,
          statusCode: 400,
        });
      }

      if (item.kind === 'TRANSFERENCIA_INTERNA') {
        if (!item.transfer_account_id) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `${label}: transferencia interna exige a conta contraparte`,
            statusCode: 400,
          });
        }
        if (item.transfer_account_id === body.account_id) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `${label}: conta contraparte deve ser diferente da conta do extrato`,
            statusCode: 400,
          });
        }
      }
    }

    try {
      // ===== Fatura de cartao: fluxo padrao (PENDENTE + limite) =====
      if (isCardTarget) {
        const cardId = body.credit_card_id!;
        const total = items.reduce((sum, item) => sum + item.amount, 0);
        const card = await getCreditCardById(cardId, user.id, accessToken);
        if (!card) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Cartao de credito nao encontrado',
            statusCode: 404,
          });
        }
        if (card.available_limit < total) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Limite insuficiente no cartao ${card.name}. Disponivel: R$ ${card.available_limit.toFixed(2)}, necessario: R$ ${total.toFixed(2)}`,
            statusCode: 400,
          });
        }

        const dtos: CreateTransactionDTO[] = items.map((item) => ({
          category_id: item.category_id,
          credit_card_id: cardId,
          type: item.type,
          description: item.description,
          amount: item.amount,
          due_date: item.due_date,
          notes: item.notes,
        }));
        const created = await createTransactionsBatch(user.id, dtos, accessToken);
        return reply.status(201).send({
          transactions_created: created.length,
          transfers_created: 0,
        });
      }

      // ===== Extrato de conta =====
      const accountId = body.account_id!;
      const normals = items.filter((item) => item.kind === 'NORMAL');
      const transfers = items.filter((item) => item.kind === 'TRANSFERENCIA_INTERNA');

      let transactionsCreated = 0;
      if (normals.length > 0) {
        const dtos: CreateTransactionDTO[] = normals.map((item) => ({
          category_id: item.category_id,
          account_id: accountId,
          type: item.type,
          description: item.description,
          amount: item.amount,
          due_date: item.due_date,
          notes: item.notes,
        }));
        const created = await createPaidTransactionsBatch(user.id, accountId, dtos, accessToken);
        transactionsCreated = created.length;
      }

      let transfersCreated = 0;
      for (const item of transfers) {
        // DESPESA = dinheiro saiu desta conta; RECEITA = dinheiro entrou nesta conta
        const sourceId = item.type === 'DESPESA' ? accountId : item.transfer_account_id!;
        const destinationId = item.type === 'DESPESA' ? item.transfer_account_id! : accountId;
        await createTransfer(
          user.id,
          {
            source_account_id: sourceId,
            destination_account_id: destinationId,
            category_id: item.category_id,
            description: item.description,
            amount: item.amount,
            transfer_date: item.due_date,
            notes: item.notes,
          },
          accessToken
        );
        transfersCreated++;
      }

      return reply.status(201).send({
        transactions_created: transactionsCreated,
        transfers_created: transfersCreated,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao importar transacoes';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
