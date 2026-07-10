import { resend, EMAIL_CONFIG } from '../lib/resend.js';
import type { ReportType } from '../domain/report-types.js';

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  'cash-flow': 'Fluxo de Caixa',
  'budget-analysis': 'Analise de Orcamento',
  'category-breakdown': 'Gastos por Categoria',
  'payment-methods': 'Formas de Pagamento',
  'goals-progress': 'Progresso dos Objetivos',
  'recurring-analysis': 'Gastos Fixos vs Variaveis',
  'yoy-comparison': 'Comparativo Anual',
};

interface SendReportEmailParams {
  to: string;
  reportType: ReportType;
  startDate: string;
  endDate: string;
  pdfBuffer: Buffer;
  userId: string;
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function generateIdempotencyKey(params: SendReportEmailParams): string {
  const hourTimestamp = Math.floor(Date.now() / (1000 * 60 * 60));
  return `${params.userId}:${params.reportType}:${params.startDate}:${params.endDate}:${hourTimestamp}`;
}

function generateEmailHTML(params: SendReportEmailParams): string {
  const reportLabel = REPORT_TYPE_LABELS[params.reportType];
  const period = `${formatDateBR(params.startDate)} a ${formatDateBR(params.endDate)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatorio ${reportLabel}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border-radius: 12px 12px 0 0; padding: 32px;">
          <tr>
            <td style="text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Trade Compass</h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">Seu relatorio financeiro</p>
            </td>
          </tr>
        </table>

        <!-- Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <tr>
            <td>
              <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 600;">
                ${reportLabel}
              </h2>
              <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.6;">
                Segue em anexo o relatorio de <strong>${reportLabel}</strong> referente ao periodo de <strong>${period}</strong>.
              </p>

              <!-- Info Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; color: #0f172a; font-size: 14px;">
                      <strong>Tipo:</strong> ${reportLabel}
                    </p>
                    <p style="margin: 0; color: #0f172a; font-size: 14px;">
                      <strong>Periodo:</strong> ${period}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                O arquivo PDF esta anexado a este e-mail. Caso tenha dificuldades para visualizar, verifique se o seu cliente de e-mail permite o download de anexos.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 0 0 12px 12px; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 12px;">
                Este e-mail foi enviado automaticamente pelo Trade Compass.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generateFilename(reportType: ReportType, startDate: string, endDate: string): string {
  const reportName = REPORT_TYPE_LABELS[reportType]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
  return `relatorio-${reportName}-${startDate}-a-${endDate}.pdf`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendReportEmail(params: SendReportEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: 'Servico de email nao configurado. Verifique a variavel RESEND_API_KEY.',
    };
  }

  const { to, reportType, startDate, endDate, pdfBuffer } = params;
  const reportLabel = REPORT_TYPE_LABELS[reportType];
  const idempotencyKey = generateIdempotencyKey(params);
  const filename = generateFilename(reportType, startDate, endDate);

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        ...(EMAIL_CONFIG.replyTo && { replyTo: EMAIL_CONFIG.replyTo }),
        to,
        subject: `Relatorio de ${reportLabel} - Trade Compass`,
        html: generateEmailHTML(params),
        attachments: [
          {
            filename,
            content: pdfBuffer,
          },
        ],
        headers: {
          'X-Entity-Ref-ID': idempotencyKey,
        },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry (5xx or 429 errors)
      const shouldRetry =
        lastError.message.includes('429') ||
        lastError.message.includes('5') ||
        lastError.message.toLowerCase().includes('rate limit') ||
        lastError.message.toLowerCase().includes('server error');

      if (shouldRetry && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Email send attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      break;
    }
  }

  console.error('Failed to send report email:', lastError);
  return {
    success: false,
    error: lastError?.message || 'Erro desconhecido ao enviar email',
  };
}
