import { jsPDF } from 'jspdf';
import type {
  ReportType,
  CashFlowReportData,
  BudgetAnalysisReportData,
  CategoryBreakdownReportData,
  PaymentMethodsReportData,
  GoalsProgressReportData,
  RecurringAnalysisReportData,
  YoYComparisonReportData,
} from '../domain/report-types.js';

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  'cash-flow': 'Fluxo de Caixa',
  'budget-analysis': 'Analise de Orcamento',
  'category-breakdown': 'Gastos por Categoria',
  'payment-methods': 'Formas de Pagamento',
  'goals-progress': 'Progresso dos Objetivos',
  'recurring-analysis': 'Gastos Fixos vs Variaveis',
  'yoy-comparison': 'Comparativo Anual',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDateBR(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateTime(): string {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR');
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

interface PDFGenerationParams {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  data: unknown;
}

export async function generateReportPDF(params: PDFGenerationParams): Promise<Buffer> {
  const { reportType, startDate, endDate, data } = params;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, pageWidth, 25, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42);
  pdf.text(REPORT_TYPE_LABELS[reportType], margin, 12);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Periodo: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`, margin, 19);

  let yPos = 35;

  // Render content based on report type
  switch (reportType) {
    case 'cash-flow':
      yPos = renderCashFlowReport(pdf, data as CashFlowReportData, margin, yPos, contentWidth);
      break;
    case 'budget-analysis':
      yPos = renderBudgetAnalysisReport(pdf, data as BudgetAnalysisReportData, margin, yPos, contentWidth);
      break;
    case 'category-breakdown':
      yPos = renderCategoryBreakdownReport(pdf, data as CategoryBreakdownReportData, margin, yPos, contentWidth);
      break;
    case 'payment-methods':
      yPos = renderPaymentMethodsReport(pdf, data as PaymentMethodsReportData, margin, yPos, contentWidth);
      break;
    case 'goals-progress':
      yPos = renderGoalsProgressReport(pdf, data as GoalsProgressReportData, margin, yPos, contentWidth);
      break;
    case 'recurring-analysis':
      yPos = renderRecurringAnalysisReport(pdf, data as RecurringAnalysisReportData, margin, yPos, contentWidth);
      break;
    case 'yoy-comparison':
      yPos = renderYoYComparisonReport(pdf, data as YoYComparisonReportData, margin, yPos, contentWidth);
      break;
  }

  // Footer
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Gerado em ${formatDateTime()}`, margin, pageHeight - 6);

  const pageText = 'Trade Compass';
  const pageTextWidth = pdf.getTextWidth(pageText);
  pdf.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 6);

  // Convert to Buffer
  const arrayBuffer = pdf.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function renderCashFlowReport(
  pdf: jsPDF,
  data: CashFlowReportData,
  margin: number,
  startY: number,
  contentWidth: number
): number {
  let yPos = startY;

  // Summary section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Resumo', margin, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const summaryItems = [
    { label: 'Total Receitas:', value: formatCurrency(data.totals.total_income) },
    { label: 'Total Despesas:', value: formatCurrency(data.totals.total_expenses) },
    { label: 'Saldo Liquido:', value: formatCurrency(data.totals.net_balance) },
    { label: 'Media Mensal Receitas:', value: formatCurrency(data.totals.average_monthly_income) },
    { label: 'Media Mensal Despesas:', value: formatCurrency(data.totals.average_monthly_expenses) },
  ];

  for (const item of summaryItems) {
    pdf.setTextColor(100, 116, 139);
    pdf.text(item.label, margin, yPos);
    pdf.setTextColor(15, 23, 42);
    pdf.text(item.value, margin + 55, yPos);
    yPos += 6;
  }

  yPos += 10;

  // Monthly data table
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Dados Mensais', margin, yPos);
  yPos += 8;

  // Table header
  const colWidths = [25, 35, 35, 35, 40];
  const headers = ['Mes', 'Receitas', 'Despesas', 'Saldo', 'Saldo Acum.'];

  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);

  let xPos = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.text(headers[i], xPos + 2, yPos);
    xPos += colWidths[i];
  }
  yPos += 8;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  for (const row of data.data) {
    xPos = margin;
    pdf.setTextColor(15, 23, 42);
    pdf.text(row.month_label, xPos + 2, yPos);
    xPos += colWidths[0];

    pdf.setTextColor(34, 197, 94);
    pdf.text(formatCurrency(row.income), xPos + 2, yPos);
    xPos += colWidths[1];

    pdf.setTextColor(239, 68, 68);
    pdf.text(formatCurrency(row.expenses), xPos + 2, yPos);
    xPos += colWidths[2];

    pdf.setTextColor(row.balance >= 0 ? 34 : 239, row.balance >= 0 ? 197 : 68, row.balance >= 0 ? 94 : 68);
    pdf.text(formatCurrency(row.balance), xPos + 2, yPos);
    xPos += colWidths[3];

    pdf.setTextColor(row.cumulative_balance >= 0 ? 34 : 239, row.cumulative_balance >= 0 ? 197 : 68, row.cumulative_balance >= 0 ? 94 : 68);
    pdf.text(formatCurrency(row.cumulative_balance), xPos + 2, yPos);

    yPos += 6;
  }

  return yPos;
}

function renderBudgetAnalysisReport(
  pdf: jsPDF,
  data: BudgetAnalysisReportData,
  margin: number,
  startY: number,
  contentWidth: number
): number {
  let yPos = startY;

  // Summary section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Medias do Periodo', margin, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const categories = [
    { label: 'Essenciais (ideal 50%):', value: formatPercentage(data.average.essencial) },
    { label: 'Estilo de Vida (ideal 30%):', value: formatPercentage(data.average.estilo_vida) },
    { label: 'Investimentos (ideal 20%):', value: formatPercentage(data.average.investimento) },
  ];

  for (const cat of categories) {
    pdf.setTextColor(100, 116, 139);
    pdf.text(cat.label, margin, yPos);
    pdf.setTextColor(15, 23, 42);
    pdf.text(cat.value, margin + 60, yPos);
    yPos += 6;
  }

  const trendLabels: Record<string, string> = {
    improving: 'Melhorando',
    stable: 'Estavel',
    worsening: 'Piorando',
  };
  pdf.setTextColor(100, 116, 139);
  pdf.text('Tendencia:', margin, yPos);
  pdf.setTextColor(15, 23, 42);
  pdf.text(trendLabels[data.trend], margin + 60, yPos);
  yPos += 10;

  // Monthly breakdown
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Detalhamento Mensal', margin, yPos);
  yPos += 8;

  const colWidths = [20, 30, 35, 35, 35];
  const headers = ['Mes', 'Renda', 'Essencial', 'Est. Vida', 'Invest.'];

  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);

  let xPos = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.text(headers[i], xPos + 2, yPos);
    xPos += colWidths[i];
  }
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  for (const month of data.months) {
    xPos = margin;
    pdf.setTextColor(15, 23, 42);
    pdf.text(month.month_label, xPos + 2, yPos);
    xPos += colWidths[0];

    pdf.text(formatCurrency(month.total_income), xPos + 2, yPos);
    xPos += colWidths[1];

    pdf.text(`${formatPercentage(month.allocations.essencial.percentage)}`, xPos + 2, yPos);
    xPos += colWidths[2];

    pdf.text(`${formatPercentage(month.allocations.estilo_vida.percentage)}`, xPos + 2, yPos);
    xPos += colWidths[3];

    pdf.text(`${formatPercentage(month.allocations.investimento.percentage)}`, xPos + 2, yPos);

    yPos += 6;
  }

  return yPos;
}

function renderCategoryBreakdownReport(
  pdf: jsPDF,
  data: CategoryBreakdownReportData,
  margin: number,
  startY: number,
  contentWidth: number
): number {
  let yPos = startY;

  // Summary
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Resumo', margin, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Total de Despesas:', margin, yPos);
  pdf.setTextColor(15, 23, 42);
  pdf.text(formatCurrency(data.total_expenses), margin + 45, yPos);
  yPos += 6;

  if (data.comparison) {
    pdf.setTextColor(100, 116, 139);
    pdf.text('Periodo anterior:', margin, yPos);
    pdf.setTextColor(15, 23, 42);
    pdf.text(formatCurrency(data.comparison.previous_period_total), margin + 45, yPos);
    yPos += 6;

    const changeColor = data.comparison.change_percentage <= 0 ? [34, 197, 94] : [239, 68, 68];
    pdf.setTextColor(100, 116, 139);
    pdf.text('Variacao:', margin, yPos);
    pdf.setTextColor(changeColor[0], changeColor[1], changeColor[2]);
    pdf.text(`${data.comparison.change_percentage > 0 ? '+' : ''}${formatPercentage(data.comparison.change_percentage)}`, margin + 45, yPos);
    yPos += 6;
  }

  yPos += 10;

  // Categories table
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Categorias', margin, yPos);
  yPos += 8;

  const colWidths = [60, 45, 30, 30];
  const headers = ['Categoria', 'Total', '%', 'Qtd'];

  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);

  let xPos = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.text(headers[i], xPos + 2, yPos);
    xPos += colWidths[i];
  }
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  for (const cat of data.categories.slice(0, 15)) {
    xPos = margin;
    pdf.setTextColor(15, 23, 42);
    pdf.text(cat.category_name.substring(0, 25), xPos + 2, yPos);
    xPos += colWidths[0];

    pdf.text(formatCurrency(cat.total), xPos + 2, yPos);
    xPos += colWidths[1];

    pdf.text(formatPercentage(cat.percentage), xPos + 2, yPos);
    xPos += colWidths[2];

    pdf.text(String(cat.transaction_count), xPos + 2, yPos);

    yPos += 6;
  }

  return yPos;
}

function renderPaymentMethodsReport(
  pdf: jsPDF,
  data: PaymentMethodsReportData,
  margin: number,
  startY: number,
  contentWidth: number
): number {
  let yPos = startY;

  // Summary
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Resumo', margin, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const summaryItems = [
    { label: 'Total Contas:', value: `${formatCurrency(data.summary.total_account_payments)} (${formatPercentage(data.summary.account_percentage)})` },
    { label: 'Total Cartoes:', value: `${formatCurrency(data.summary.total_card_payments)} (${formatPercentage(data.summary.card_percentage)})` },
  ];

  for (const item of summaryItems) {
    pdf.setTextColor(100, 116, 139);
    pdf.text(item.label, margin, yPos);
    pdf.setTextColor(15, 23, 42);
    pdf.text(item.value, margin + 35, yPos);
    yPos += 6;
  }

  yPos += 10;

  // Accounts table
  if (data.accounts.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Contas', margin, yPos);
    yPos += 8;

    const colWidths = [70, 50, 25, 25];
    const headers = ['Conta', 'Total', '%', 'Qtd'];

    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);

    let xPos = margin;
    for (let i = 0; i < headers.length; i++) {
      pdf.text(headers[i], xPos + 2, yPos);
      xPos += colWidths[i];
    }
    yPos += 8;

    pdf.setFont('helvetica', 'normal');
    for (const acc of data.accounts) {
      xPos = margin;
      pdf.setTextColor(15, 23, 42);
      pdf.text(acc.name.substring(0, 30), xPos + 2, yPos);
      xPos += colWidths[0];

      pdf.text(formatCurrency(acc.total), xPos + 2, yPos);
      xPos += colWidths[1];

      pdf.text(formatPercentage(acc.percentage), xPos + 2, yPos);
      xPos += colWidths[2];

      pdf.text(String(acc.transaction_count), xPos + 2, yPos);

      yPos += 6;
    }

    yPos += 10;
  }

  // Credit cards table
  if (data.credit_cards.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Cartoes de Credito', margin, yPos);
    yPos += 8;

    const colWidths = [50, 45, 45, 30];
    const headers = ['Cartao', 'Utilizado', 'Limite', 'Uso %'];

    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);

    let xPos = margin;
    for (let i = 0; i < headers.length; i++) {
      pdf.text(headers[i], xPos + 2, yPos);
      xPos += colWidths[i];
    }
    yPos += 8;

    pdf.setFont('helvetica', 'normal');
    for (const card of data.credit_cards) {
      xPos = margin;
      pdf.setTextColor(15, 23, 42);
      pdf.text(card.name.substring(0, 22), xPos + 2, yPos);
      xPos += colWidths[0];

      pdf.text(formatCurrency(card.used_amount), xPos + 2, yPos);
      xPos += colWidths[1];

      pdf.text(formatCurrency(card.total_limit), xPos + 2, yPos);
      xPos += colWidths[2];

      pdf.text(formatPercentage(card.usage_percentage), xPos + 2, yPos);

      yPos += 6;
    }
  }

  return yPos;
}

function renderGoalsProgressReport(
  pdf: jsPDF,
  data: GoalsProgressReportData,
  margin: number,
  startY: number,
  contentWidth: number
): number {
  let yPos = startY;

  // Summary
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Resumo', margin, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const summaryItems = [
    { label: 'Total de Objetivos:', value: String(data.summary.total_goals) },
    { label: 'Objetivos Ativos:', value: String(data.summary.active_goals) },
    { label: 'Objetivos Concluidos:', value: String(data.summary.completed_goals) },
    { label: 'Objetivos em Risco:', value: String(data.summary.at_risk_goals) },
    { label: 'Meta Total:', value: formatCurrency(data.summary.total_target) },
    { label: 'Total Contribuido:', value: formatCurrency(data.summary.total_contributed) },
    { label: 'Progresso Geral:', value: formatPercentage(data.summary.overall_progress) },
  ];

  for (const item of summaryItems) {
    pdf.setTextColor(100, 116, 139);
    pdf.text(item.label, margin, yPos);
    pdf.setTextColor(15, 23, 42);
    pdf.text(item.value, margin + 55, yPos);
    yPos += 6;
  }

  yPos += 10;

  // Goals table
  if (data.goals.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Objetivos', margin, yPos);
    yPos += 8;

    const colWidths = [50, 40, 40, 30];
    const headers = ['Nome', 'Meta', 'Atual', 'Progresso'];

    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);

    let xPos = margin;
    for (let i = 0; i < headers.length; i++) {
      pdf.text(headers[i], xPos + 2, yPos);
      xPos += colWidths[i];
    }
    yPos += 8;

    pdf.setFont('helvetica', 'normal');
    for (const goal of data.goals) {
      xPos = margin;
      pdf.setTextColor(15, 23, 42);
      pdf.text(goal.name.substring(0, 22), xPos + 2, yPos);
      xPos += colWidths[0];

      pdf.text(formatCurrency(goal.target_amount), xPos + 2, yPos);
      xPos += colWidths[1];

      pdf.text(formatCurrency(goal.current_amount), xPos + 2, yPos);
      xPos += colWidths[2];

      const progressColor = goal.is_at_risk ? [239, 68, 68] : [34, 197, 94];
      pdf.setTextColor(progressColor[0], progressColor[1], progressColor[2]);
      pdf.text(formatPercentage(goal.progress_percentage), xPos + 2, yPos);

      yPos += 6;
    }
  }

  return yPos;
}

function renderRecurringAnalysisReport(
  pdf: jsPDF,
  data: RecurringAnalysisReportData,
  margin: number,
  startY: number,
  contentWidth: number
): number {
  let yPos = startY;

  // Summary
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Resumo', margin, yPos);
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const summaryItems = [
    { label: 'Total Gastos Fixos:', value: `${formatCurrency(data.summary.total_fixed)} (${formatPercentage(data.summary.fixed_percentage)})` },
    { label: 'Total Gastos Variaveis:', value: `${formatCurrency(data.summary.total_variable)} (${formatPercentage(data.summary.variable_percentage)})` },
    { label: 'Total Recorrencias:', value: String(data.summary.total_recurrences) },
    { label: 'Recorrencias Ativas:', value: String(data.summary.active_recurrences) },
    { label: 'Comprometimento da Renda:', value: formatPercentage(data.income_commitment) },
  ];

  for (const item of summaryItems) {
    pdf.setTextColor(100, 116, 139);
    pdf.text(item.label, margin, yPos);
    pdf.setTextColor(15, 23, 42);
    pdf.text(item.value, margin + 60, yPos);
    yPos += 6;
  }

  yPos += 10;

  // Recurrences table
  if (data.recurrences.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Recorrencias', margin, yPos);
    yPos += 8;

    const colWidths = [60, 45, 40, 25];
    const headers = ['Descricao', 'Categoria', 'Valor', 'Ativo'];

    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);

    let xPos = margin;
    for (let i = 0; i < headers.length; i++) {
      pdf.text(headers[i], xPos + 2, yPos);
      xPos += colWidths[i];
    }
    yPos += 8;

    pdf.setFont('helvetica', 'normal');
    for (const rec of data.recurrences.slice(0, 20)) {
      xPos = margin;
      pdf.setTextColor(15, 23, 42);
      pdf.text(rec.description.substring(0, 25), xPos + 2, yPos);
      xPos += colWidths[0];

      pdf.text(rec.category_name.substring(0, 18), xPos + 2, yPos);
      xPos += colWidths[1];

      pdf.text(formatCurrency(rec.amount), xPos + 2, yPos);
      xPos += colWidths[2];

      pdf.text(rec.is_active ? 'Sim' : 'Nao', xPos + 2, yPos);

      yPos += 6;
    }
  }

  return yPos;
}

function renderYoYComparisonReport(
  pdf: jsPDF,
  data: YoYComparisonReportData,
  margin: number,
  startY: number,
  contentWidth: number
): number {
  let yPos = startY;

  // Yearly totals
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Totais Anuais', margin, yPos);
  yPos += 8;

  for (const yearData of data.yearly_totals) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${yearData.year}:`, margin, yPos);
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    pdf.setTextColor(100, 116, 139);
    pdf.text('Receitas:', margin + 5, yPos);
    pdf.setTextColor(34, 197, 94);
    pdf.text(formatCurrency(yearData.total_income), margin + 30, yPos);

    pdf.setTextColor(100, 116, 139);
    pdf.text('Despesas:', margin + 80, yPos);
    pdf.setTextColor(239, 68, 68);
    pdf.text(formatCurrency(yearData.total_expenses), margin + 105, yPos);
    yPos += 5;

    pdf.setTextColor(100, 116, 139);
    pdf.text('Saldo:', margin + 5, yPos);
    const balanceColor = yearData.total_balance >= 0 ? [34, 197, 94] : [239, 68, 68];
    pdf.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
    pdf.text(formatCurrency(yearData.total_balance), margin + 30, yPos);
    yPos += 8;
  }

  yPos += 5;

  // Monthly comparison table
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Comparativo Mensal', margin, yPos);
  yPos += 8;

  const years = data.years;
  const colWidth = contentWidth / (years.length + 1);

  // Table header
  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, yPos - 4, contentWidth, 8, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);

  let xPos = margin;
  pdf.text('Mes', xPos + 2, yPos);
  xPos += colWidth;

  for (const year of years) {
    pdf.text(String(year), xPos + 2, yPos);
    xPos += colWidth;
  }
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  for (const monthData of data.monthly_comparison) {
    xPos = margin;
    pdf.setTextColor(15, 23, 42);
    pdf.text(monthData.month_label, xPos + 2, yPos);
    xPos += colWidth;

    for (const year of years) {
      const yearValues = monthData.data[year];
      if (yearValues) {
        const balanceColor = yearValues.balance >= 0 ? [34, 197, 94] : [239, 68, 68];
        pdf.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
        pdf.text(formatCurrency(yearValues.balance), xPos + 2, yPos);
      }
      xPos += colWidth;
    }

    yPos += 5;
  }

  return yPos;
}
