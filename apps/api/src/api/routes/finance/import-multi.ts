import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { getAccountsByUser } from '../../../data/finance/account-repository.js';
import {
  createPaidTransactionsBatch,
  createTransfer,
} from '../../../data/finance/transaction-repository.js';
import type { CreateTransactionDTO } from '../../../domain/finance-types.js';
import {
  detectStatementAccount,
  type DetectedDocumentKind,
  type StatementFileKind,
} from '../../../services/statement-import-service.js';
import {
  matchTransfers,
  type MatchStatementInput,
  type MatchedTransferPair,
  type TransferPairRef,
} from '../../../services/transfer-matching-service.js';
import {
  validateConfirmMultiBody,
  type ConfirmMultiImportBody,
} from '../../../services/import-validation-service.js';
import { createRateLimiter } from '../../middleware/simple-rate-limit.js';

// ============================================================================
// Importacao multi-arquivo: detect -> (parse existente por arquivo) -> match
// -> confirm-multi. O fluxo single-file em import.ts permanece intocado.
// ============================================================================

interface DetectStatementBody {
  kind: StatementFileKind;
  filename: string;
  content: string;
  mime_type?: string;
}

interface DetectStatementResponse {
  document_kind: DetectedDocumentKind;
  detected_account_id: string | null;
  bank_name: string | null;
}

interface MatchTransfersBody {
  statements: MatchStatementInput[];
}

interface MatchTransfersResponse {
  pairs: MatchedTransferPair[];
  intra_batch_duplicates: TransferPairRef[];
}

interface ConfirmMultiImportResponse {
  transactions_created: number;
  transfers_created: number;
}

const VALID_KINDS: StatementFileKind[] = ['text', 'pdf', 'image'];

// Base64 de ~10MB de arquivo + JSON overhead (mesmo limite do parse)
const BODY_LIMIT = 15 * 1024 * 1024;

const MAX_STATEMENTS = 12;

// Detect usa LLM (chamada leve, mas com custo) — limite mais folgado que o parse
const checkDetectLimit = createRateLimiter(12, 60 * 1000);

export async function importMultiRoutes(app: FastifyInstance) {
  // POST /finance/import/detect - Identifica a conta/tipo de documento de um arquivo
  app.post<{
    Body: DetectStatementBody;
    Reply: DetectStatementResponse | ApiError;
  }>('/finance/import/detect', { bodyLimit: BODY_LIMIT }, async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (!checkDetectLimit(user.id)) {
      return reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Muitas analises de arquivo em sequencia. Aguarde um minuto e tente novamente.',
        statusCode: 429,
      });
    }

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

    try {
      const accounts = await getAccountsByUser(user.id, accessToken);
      const result = await detectStatementAccount(
        {
          kind: body.kind,
          filename: body.filename || 'extrato',
          content: body.content,
          mimeType: body.mime_type,
        },
        accounts
      );

      const detectedAccount =
        result.detectedAccountIndex !== null ? accounts[result.detectedAccountIndex] : null;

      return {
        document_kind: result.documentKind,
        detected_account_id: detectedAccount?.id ?? null,
        bank_name: result.bankName,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao analisar arquivo';
      const isConfigError = message.includes('OPENAI_API_KEY');
      return reply.status(isConfigError ? 503 : 500).send({
        error: isConfigError ? 'Service Unavailable' : 'Internal Server Error',
        message,
        statusCode: isConfigError ? 503 : 500,
      });
    }
  });

  // POST /finance/import/match - Casa transferencias entre extratos do lote (deterministico)
  app.post<{
    Body: MatchTransfersBody;
    Reply: MatchTransfersResponse | ApiError;
  }>('/finance/import/match', async (request, reply) => {
    const statements = request.body?.statements;

    if (!Array.isArray(statements) || statements.length === 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Informe ao menos um extrato',
        statusCode: 400,
      });
    }

    if (statements.length > MAX_STATEMENTS) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: `Maximo de ${MAX_STATEMENTS} extratos por lote`,
        statusCode: 400,
      });
    }

    for (const statement of statements) {
      if (!statement.account_id || !Array.isArray(statement.transactions)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Cada extrato precisa de account_id e transactions',
          statusCode: 400,
        });
      }
    }

    return matchTransfers(statements);
  });

  // POST /finance/import/confirm-multi - Efetiva a importacao de multiplos extratos
  // groups: transacoes por conta (NORMAL em lote PAGO; TRANSFERENCIA_INTERNA nao-pareada
  // via fluxo nativo). transfers: pares casados — cada um vira UMA transferencia.
  app.post<{
    Body: ConfirmMultiImportBody;
    Reply: ConfirmMultiImportResponse | ApiError;
  }>('/finance/import/confirm-multi', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    try {
      const accounts = await getAccountsByUser(user.id, accessToken);
      const userAccountIds = new Set(accounts.map((a) => a.id));

      const validationError = validateConfirmMultiBody(body, userAccountIds);
      if (validationError) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: validationError,
          statusCode: 400,
        });
      }

      let transactionsCreated = 0;
      let transfersCreated = 0;

      // 1) Transacoes normais de cada conta (lote PAGO com ajuste de saldo)
      for (const group of body.groups) {
        const normals = group.items.filter((item) => item.kind === 'NORMAL');
        if (normals.length > 0) {
          const dtos: CreateTransactionDTO[] = normals.map((item) => ({
            category_id: item.category_id,
            account_id: group.account_id,
            type: item.type,
            description: item.description,
            amount: item.amount,
            due_date: item.due_date,
            notes: item.notes,
          }));
          const created = await createPaidTransactionsBatch(
            user.id,
            group.account_id,
            dtos,
            accessToken
          );
          transactionsCreated += created.length;
        }
      }

      // 2) Transferencias internas nao-pareadas (contraparte sem extrato no lote)
      for (const group of body.groups) {
        const internals = group.items.filter((item) => item.kind === 'TRANSFERENCIA_INTERNA');
        for (const item of internals) {
          // DESPESA = dinheiro saiu desta conta; RECEITA = dinheiro entrou nesta conta
          const sourceId = item.type === 'DESPESA' ? group.account_id : item.transfer_account_id!;
          const destinationId =
            item.type === 'DESPESA' ? item.transfer_account_id! : group.account_id;
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
      }

      // 3) Pares casados entre extratos do lote: UMA transferencia por par
      for (const transfer of body.transfers) {
        await createTransfer(
          user.id,
          {
            source_account_id: transfer.source_account_id,
            destination_account_id: transfer.destination_account_id,
            category_id: transfer.category_id,
            description: transfer.description,
            amount: transfer.amount,
            transfer_date: transfer.transfer_date,
            notes: transfer.notes,
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
