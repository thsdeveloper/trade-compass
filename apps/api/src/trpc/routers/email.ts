import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import { generateReportPDF } from '../../services/report-pdf-service.js';
import { sendReportEmail } from '../../services/email-service.js';
import {
  getCashFlowReport,
  getBudgetAnalysisReport,
  getCategoryBreakdownReport,
  getPaymentMethodsReport,
  getGoalsProgressReport,
  getRecurringAnalysisReport,
  getYoYComparisonReport,
} from '../../data/finance/report-repository.js';
import type { ReportType } from '../../domain/report-types.js';

const reportTypeSchema = z.enum([
  'cash-flow',
  'budget-analysis',
  'category-breakdown',
  'payment-methods',
  'goals-progress',
  'recurring-analysis',
  'yoy-comparison',
]);

const sendReportInputSchema = z.object({
  email: z.string().email('Email invalido'),
  reportType: reportTypeSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  includePending: z.boolean().default(false),
  selectedYears: z.array(z.number().min(2000).max(2100)).optional(),
});

async function fetchReportData(
  reportType: ReportType,
  userId: string,
  startDate: string,
  endDate: string,
  includePending: boolean,
  accessToken: string,
  selectedYears?: number[]
): Promise<unknown> {
  switch (reportType) {
    case 'cash-flow':
      return getCashFlowReport(userId, startDate, endDate, includePending, accessToken);
    case 'budget-analysis':
      return getBudgetAnalysisReport(userId, startDate, endDate, includePending, accessToken);
    case 'category-breakdown':
      return getCategoryBreakdownReport(userId, startDate, endDate, includePending, accessToken);
    case 'payment-methods':
      return getPaymentMethodsReport(userId, startDate, endDate, includePending, accessToken);
    case 'goals-progress':
      return getGoalsProgressReport(userId, accessToken);
    case 'recurring-analysis':
      return getRecurringAnalysisReport(userId, accessToken);
    case 'yoy-comparison':
      if (!selectedYears || selectedYears.length === 0) {
        const currentYear = new Date().getFullYear();
        selectedYears = [currentYear, currentYear - 1];
      }
      return getYoYComparisonReport(userId, selectedYears, accessToken);
    default:
      throw new Error(`Tipo de relatorio desconhecido: ${reportType}`);
  }
}

export const emailRouter = router({
  sendReport: protectedProcedure
    .input(sendReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, reportType, startDate, endDate, includePending, selectedYears } = input;

      // Fetch report data
      let reportData: unknown;
      try {
        reportData = await fetchReportData(
          reportType,
          ctx.user.id,
          startDate,
          endDate,
          includePending,
          ctx.accessToken,
          selectedYears
        );
      } catch (error) {
        console.error('Error fetching report data:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar dados do relatorio',
        });
      }

      // Generate PDF
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await generateReportPDF({
          reportType,
          startDate,
          endDate,
          data: reportData,
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
        console.error('Error details:', error instanceof Error ? error.stack : error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao gerar PDF do relatorio: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      // Send email
      const result = await sendReportEmail({
        to: email,
        reportType,
        startDate,
        endDate,
        pdfBuffer,
        userId: ctx.user.id,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Erro ao enviar email',
        });
      }

      return {
        success: true,
        message: 'Relatorio enviado com sucesso!',
        messageId: result.messageId,
      };
    }),
});
