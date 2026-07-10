import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceCreditCard,
  FinanceInvoicePayment,
  CreateCreditCardDTO,
  UpdateCreditCardDTO,
  CreditCardInvoice,
  PayInvoiceDTO,
  InvoicePaymentResult,
  InvoicePaymentWithDetails,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getCreditCardsByUser,
  getCreditCardById,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
} from '../../../data/finance/credit-card-repository.js';
import { getTransactionsByCreditCardAndPeriod } from '../../../data/finance/transaction-repository.js';
import {
  payInvoice,
  getInvoicePaymentsByCard,
  getInvoicePaymentsByMonth,
} from '../../../data/finance/invoice-payment-repository.js';

export async function creditCardRoutes(app: FastifyInstance) {
  // GET /finance/credit-cards - List user credit cards
  app.get<{
    Reply: FinanceCreditCard[] | ApiError;
  }>('/finance/credit-cards', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const cards = await getCreditCardsByUser(user.id, accessToken);
      return cards;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar cartoes';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/credit-cards/:id - Get credit card by ID
  app.get<{
    Params: { id: string };
    Reply: FinanceCreditCard | ApiError;
  }>('/finance/credit-cards/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const card = await getCreditCardById(id, user.id, accessToken);

      if (!card) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Cartao nao encontrado',
          statusCode: 404,
        });
      }

      return card;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar cartao';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/credit-cards/:id/invoice - Get credit card invoice for a month
  app.get<{
    Params: { id: string };
    Querystring: { month: string };
    Reply: CreditCardInvoice | ApiError;
  }>('/finance/credit-cards/:id/invoice', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const { month } = request.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Mes deve estar no formato YYYY-MM',
        statusCode: 400,
      });
    }

    try {
      const card = await getCreditCardById(id, user.id, accessToken);

      if (!card) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Cartao nao encontrado',
          statusCode: 404,
        });
      }

      // Calcular periodo da fatura baseado no dia de fechamento
      const [year, monthNum] = month.split('-').map(Number);
      const closingDay = card.closing_day;
      const dueDay = card.due_day;

      // Periodo da fatura: do dia de fechamento do mes anterior ao dia de fechamento do mes atual
      const startDate = new Date(year, monthNum - 2, closingDay + 1);
      const endDate = new Date(year, monthNum - 1, closingDay);

      // Data de fechamento da fatura
      const closingDateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`;

      // Data de vencimento da fatura
      // Se o vencimento e antes ou igual ao fechamento, e do mes seguinte
      let dueYear = year;
      let dueMonth = monthNum;
      if (dueDay <= closingDay) {
        dueMonth = monthNum + 1;
        if (dueMonth > 12) {
          dueMonth = 1;
          dueYear = year + 1;
        }
      }
      const dueDateStr = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

      // Formatar datas do período para a query
      const formatDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const [transactions, payments] = await Promise.all([
        getTransactionsByCreditCardAndPeriod(
          id,
          user.id,
          formatDate(startDate),
          formatDate(endDate),
          accessToken
        ),
        getInvoicePaymentsByMonth(id, month, user.id, accessToken),
      ]);

      const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remainingAmount = Math.max(0, total - paidAmount);

      return {
        credit_card: card,
        month,
        transactions,
        total,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        closing_date: closingDateStr,
        due_date: dueDateStr,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar fatura';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/credit-cards - Create credit card
  app.post<{
    Body: CreateCreditCardDTO;
    Reply: FinanceCreditCard | ApiError;
  }>('/finance/credit-cards', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (!body.name || !body.brand || !body.total_limit || !body.closing_day || !body.due_day) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Nome, bandeira, limite, dia de fechamento e dia de vencimento sao obrigatorios',
        statusCode: 400,
      });
    }

    if (body.closing_day < 1 || body.closing_day > 31) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Dia de fechamento deve estar entre 1 e 31',
        statusCode: 400,
      });
    }

    if (body.due_day < 1 || body.due_day > 31) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Dia de vencimento deve estar entre 1 e 31',
        statusCode: 400,
      });
    }

    try {
      const card = await createCreditCard(user.id, body, accessToken);
      return reply.status(201).send(card);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar cartao';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // PATCH /finance/credit-cards/:id - Update credit card
  app.patch<{
    Params: { id: string };
    Body: UpdateCreditCardDTO;
    Reply: FinanceCreditCard | ApiError;
  }>('/finance/credit-cards/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const updates = request.body;

    try {
      const card = await updateCreditCard(id, user.id, updates, accessToken);
      return card;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar cartao';
      const status = message.includes('nao encontrado') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // DELETE /finance/credit-cards/:id - Delete credit card (soft delete)
  app.delete<{
    Params: { id: string };
    Reply: { success: boolean } | ApiError;
  }>('/finance/credit-cards/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await deleteCreditCard(id, user.id, accessToken);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover cartao';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/credit-cards/:id/pay-invoice - Pay credit card invoice
  app.post<{
    Params: { id: string };
    Body: PayInvoiceDTO;
    Reply: InvoicePaymentResult | ApiError;
  }>('/finance/credit-cards/:id/pay-invoice', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const body = request.body;

    if (!body.account_id || !body.amount || !body.invoice_month || !body.payment_type) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Conta, valor, mes da fatura e tipo de pagamento sao obrigatorios',
        statusCode: 400,
      });
    }

    if (!/^\d{4}-\d{2}$/.test(body.invoice_month)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Mes da fatura deve estar no formato YYYY-MM',
        statusCode: 400,
      });
    }

    if (!['TOTAL', 'PARCIAL', 'MINIMO'].includes(body.payment_type)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Tipo de pagamento deve ser TOTAL, PARCIAL ou MINIMO',
        statusCode: 400,
      });
    }

    if (body.amount <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor do pagamento deve ser maior que zero',
        statusCode: 400,
      });
    }

    try {
      const result = await payInvoice(user.id, id, body, accessToken);
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao pagar fatura';
      const status = message.includes('nao encontrad') ? 404 : 500;
      return reply.status(status).send({
        error: status === 404 ? 'Not Found' : 'Internal Server Error',
        message,
        statusCode: status,
      });
    }
  });

  // GET /finance/credit-cards/:id/payments - Get invoice payments history
  app.get<{
    Params: { id: string };
    Reply: InvoicePaymentWithDetails[] | ApiError;
  }>('/finance/credit-cards/:id/payments', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const card = await getCreditCardById(id, user.id, accessToken);

      if (!card) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Cartao nao encontrado',
          statusCode: 404,
        });
      }

      const payments = await getInvoicePaymentsByCard(id, user.id, accessToken);
      return payments;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar pagamentos';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/credit-cards/:id/invoice-payments - Get invoice payments by month
  app.get<{
    Params: { id: string };
    Querystring: { month: string };
    Reply: FinanceInvoicePayment[] | ApiError;
  }>('/finance/credit-cards/:id/invoice-payments', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const { month } = request.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Mes deve estar no formato YYYY-MM',
        statusCode: 400,
      });
    }

    try {
      const card = await getCreditCardById(id, user.id, accessToken);

      if (!card) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Cartao nao encontrado',
          statusCode: 404,
        });
      }

      const payments = await getInvoicePaymentsByMonth(id, month, user.id, accessToken);
      return payments;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar pagamentos da fatura';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
