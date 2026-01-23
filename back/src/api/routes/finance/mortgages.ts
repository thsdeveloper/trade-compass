import type { FastifyInstance } from 'fastify';
import type { ApiError } from '../../../domain/types.js';
import type {
  FinanceMortgage,
  MortgageWithBank,
  MortgageWithProgress,
  MortgageInstallment,
  MortgageExtraPayment,
  MortgageDocument,
  CreateMortgageDTO,
  UpdateMortgageDTO,
  PayInstallmentDTO,
  CreateExtraPaymentDTO,
  SimulateExtraPaymentDTO,
  CreateMortgageDocumentDTO,
  MortgageFilters,
  MortgageInstallmentFilters,
  MortgageSummary,
  ExtraPaymentSimulation,
  EarlyPayoffSimulation,
  AnnualMortgageReport,
  TRRate,
  AmortizationSimulationRequest,
  AmortizationSimulationResponse,
} from '../../../domain/finance-types.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import {
  getMortgagesByUser,
  getMortgageById,
  getMortgageWithProgress,
  createMortgage,
  updateMortgage,
  deleteMortgage,
  getInstallmentsByMortgage,
  generateInstallments,
  payInstallment,
  getExtraPaymentsByMortgage,
  createExtraPayment,
  simulateExtraPaymentForMortgage,
  simulateEarlyPayoffForMortgage,
  simulateAmortizationForMortgage,
  getDocumentsByMortgage,
  createDocument,
  deleteDocument,
  getMortgageSummary,
  getAnnualReport,
} from '../../../data/finance/mortgage-repository.js';
import { syncTRRates, getTRRatesHistory, getLatestTRRate } from '../../../services/tr-service.js';

export async function mortgageRoutes(app: FastifyInstance) {
  // ==================== MORTGAGE CRUD ====================

  // GET /finance/mortgages/summary - Get mortgage summary
  app.get<{
    Reply: MortgageSummary | ApiError;
  }>('/finance/mortgages/summary', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;

    try {
      const summary = await getMortgageSummary(user.id, accessToken);
      return summary;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar resumo';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/mortgages - List mortgages
  app.get<{
    Querystring: MortgageFilters;
    Reply: MortgageWithBank[] | ApiError;
  }>('/finance/mortgages', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const filters = request.query;

    try {
      const mortgages = await getMortgagesByUser(user.id, filters, accessToken);
      return mortgages;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar financiamentos';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // GET /finance/mortgages/:id - Get mortgage by ID
  app.get<{
    Params: { id: string };
    Reply: MortgageWithProgress | ApiError;
  }>('/finance/mortgages/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const mortgage = await getMortgageWithProgress(id, user.id, accessToken);

      if (!mortgage) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Financiamento não encontrado',
          statusCode: 404,
        });
      }

      return mortgage;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar financiamento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/mortgages - Create mortgage
  app.post<{
    Body: CreateMortgageDTO;
    Reply: FinanceMortgage | ApiError;
  }>('/finance/mortgages', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const body = request.body;

    if (
      !body.contract_number ||
      !body.institution_name ||
      !body.property_value ||
      !body.financed_amount ||
      !body.base_annual_rate ||
      !body.total_installments ||
      !body.contract_start_date ||
      !body.first_installment_date
    ) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Campos obrigatórios: contract_number, institution_name, property_value, financed_amount, base_annual_rate, total_installments, contract_start_date, first_installment_date',
        statusCode: 400,
      });
    }

    if (body.financed_amount <= 0 || body.property_value <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valores devem ser maiores que zero',
        statusCode: 400,
      });
    }

    if (body.total_installments < 1 || body.total_installments > 600) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Prazo deve ser entre 1 e 600 parcelas',
        statusCode: 400,
      });
    }

    try {
      const mortgage = await createMortgage(user.id, body, accessToken);
      return reply.status(201).send(mortgage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar financiamento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // PATCH /finance/mortgages/:id - Update mortgage
  app.patch<{
    Params: { id: string };
    Body: UpdateMortgageDTO;
    Reply: FinanceMortgage | ApiError;
  }>('/finance/mortgages/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const body = request.body;

    try {
      const mortgage = await updateMortgage(id, user.id, body, accessToken);
      return mortgage;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar financiamento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // DELETE /finance/mortgages/:id - Cancel mortgage
  app.delete<{
    Params: { id: string };
    Reply: { message: string } | ApiError;
  }>('/finance/mortgages/:id', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      await deleteMortgage(id, user.id, accessToken);
      return { message: 'Financiamento cancelado com sucesso' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar financiamento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // ==================== INSTALLMENTS ====================

  // GET /finance/mortgages/:id/installments - List installments
  app.get<{
    Params: { id: string };
    Querystring: MortgageInstallmentFilters;
    Reply: MortgageInstallment[] | ApiError;
  }>('/finance/mortgages/:id/installments', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const filters = request.query;

    try {
      const installments = await getInstallmentsByMortgage(id, user.id, filters, accessToken);
      return installments;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar parcelas';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/mortgages/:id/installments/generate - Generate installments
  app.post<{
    Params: { id: string };
    Reply: MortgageInstallment[] | ApiError;
  }>('/finance/mortgages/:id/installments/generate', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const installments = await generateInstallments(id, user.id, accessToken);
      return reply.status(201).send(installments);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar parcelas';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // PATCH /finance/mortgages/:id/installments/:num/pay - Pay installment
  app.patch<{
    Params: { id: string; num: string };
    Body: PayInstallmentDTO;
    Reply: MortgageInstallment | ApiError;
  }>('/finance/mortgages/:id/installments/:num/pay', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id, num } = request.params;
    const body = request.body;

    const installmentNumber = parseInt(num, 10);
    if (isNaN(installmentNumber) || installmentNumber < 1) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Número da parcela inválido',
        statusCode: 400,
      });
    }

    try {
      const installment = await payInstallment(id, installmentNumber, user.id, body, accessToken);
      return installment;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao pagar parcela';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // ==================== EXTRA PAYMENTS ====================

  // GET /finance/mortgages/:id/extra-payments - List extra payments
  app.get<{
    Params: { id: string };
    Reply: MortgageExtraPayment[] | ApiError;
  }>('/finance/mortgages/:id/extra-payments', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const payments = await getExtraPaymentsByMortgage(id, user.id, accessToken);
      return payments;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar amortizações';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/mortgages/:id/extra-payments - Create extra payment
  app.post<{
    Params: { id: string };
    Body: CreateExtraPaymentDTO;
    Reply: MortgageExtraPayment | ApiError;
  }>('/finance/mortgages/:id/extra-payments', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const body = request.body;

    if (!body.payment_date || !body.amount || !body.payment_type) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Data, valor e tipo de pagamento são obrigatórios',
        statusCode: 400,
      });
    }

    if (body.amount <= 0) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor deve ser maior que zero',
        statusCode: 400,
      });
    }

    try {
      const payment = await createExtraPayment(id, user.id, body, accessToken);
      return reply.status(201).send(payment);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar amortização';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/mortgages/:id/extra-payments/simulate - Simulate extra payment
  app.post<{
    Params: { id: string };
    Body: SimulateExtraPaymentDTO;
    Reply: ExtraPaymentSimulation | ApiError;
  }>('/finance/mortgages/:id/extra-payments/simulate', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const body = request.body;

    if (!body.amount || !body.payment_type) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Valor e tipo de pagamento são obrigatórios',
        statusCode: 400,
      });
    }

    try {
      const simulation = await simulateExtraPaymentForMortgage(
        id,
        user.id,
        body.amount,
        body.payment_type,
        accessToken
      );
      return simulation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao simular amortização';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/mortgages/:id/simulations/early-payoff - Simulate early payoff
  app.post<{
    Params: { id: string };
    Reply: EarlyPayoffSimulation | ApiError;
  }>('/finance/mortgages/:id/simulations/early-payoff', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const simulation = await simulateEarlyPayoffForMortgage(id, user.id, accessToken);
      return simulation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao simular quitação';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/mortgages/:id/simulations/amortization - Simulate multiple extra payments
  app.post<{
    Params: { id: string };
    Body: AmortizationSimulationRequest;
    Reply: AmortizationSimulationResponse | ApiError;
  }>('/finance/mortgages/:id/simulations/amortization', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const body = request.body || {};

    try {
      const simulation = await simulateAmortizationForMortgage(id, user.id, body, accessToken);
      return simulation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao simular amortização';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // ==================== DOCUMENTS ====================

  // GET /finance/mortgages/:id/documents - List documents
  app.get<{
    Params: { id: string };
    Reply: MortgageDocument[] | ApiError;
  }>('/finance/mortgages/:id/documents', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;

    try {
      const documents = await getDocumentsByMortgage(id, user.id, accessToken);
      return documents;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar documentos';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/mortgages/:id/documents - Create document
  app.post<{
    Params: { id: string };
    Body: CreateMortgageDocumentDTO;
    Reply: MortgageDocument | ApiError;
  }>('/finance/mortgages/:id/documents', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id } = request.params;
    const body = request.body;

    if (!body.category || !body.name || !body.file_path) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Categoria, nome e caminho do arquivo são obrigatórios',
        statusCode: 400,
      });
    }

    try {
      const document = await createDocument(id, user.id, body, accessToken);
      return reply.status(201).send(document);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar documento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // DELETE /finance/mortgages/:id/documents/:docId - Delete document
  app.delete<{
    Params: { id: string; docId: string };
    Reply: { message: string } | ApiError;
  }>('/finance/mortgages/:id/documents/:docId', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id, docId } = request.params;

    try {
      await deleteDocument(id, docId, user.id, accessToken);
      return { message: 'Documento excluído com sucesso' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir documento';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // ==================== REPORTS ====================

  // GET /finance/mortgages/:id/reports/annual/:year - Get annual report
  app.get<{
    Params: { id: string; year: string };
    Reply: AnnualMortgageReport | ApiError;
  }>('/finance/mortgages/:id/reports/annual/:year', async (request, reply) => {
    const { user, accessToken } = request as AuthenticatedRequest;
    const { id, year } = request.params;

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Ano inválido',
        statusCode: 400,
      });
    }

    try {
      const report = await getAnnualReport(id, yearNum, user.id, accessToken);
      return report;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatório';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // ==================== TR RATES ====================

  // GET /finance/tr-rates - Get TR rates history
  app.get<{
    Querystring: { start_date?: string; end_date?: string };
    Reply: TRRate[] | ApiError;
  }>('/finance/tr-rates', async (request, reply) => {
    const { accessToken } = request as AuthenticatedRequest;
    const { start_date, end_date } = request.query;

    try {
      if (start_date && end_date) {
        const rates = await getTRRatesHistory(start_date, end_date, accessToken);
        return rates;
      } else {
        const latest = await getLatestTRRate(accessToken);
        return latest ? [latest] : [];
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar taxas TR';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });

  // POST /finance/tr-rates/sync - Sync TR rates from BCB
  app.post<{
    Body: { start_date?: string; end_date?: string };
    Reply: { synced: number } | ApiError;
  }>('/finance/tr-rates/sync', async (request, reply) => {
    const body = request.body || {};

    try {
      const synced = await syncTRRates(body.start_date, body.end_date);
      return { synced };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao sincronizar taxas TR';
      return reply.status(500).send({
        error: 'Internal Server Error',
        message,
        statusCode: 500,
      });
    }
  });
}
