import type { IconSymbolName } from '@/components/atoms/icon-symbol';

// ==================== ENUMS ====================

export type FinanceCategoryType = 'DESPESA' | 'RECEITA';

export type FinanceAccountType =
  | 'CONTA_CORRENTE'
  | 'POUPANCA'
  | 'CARTEIRA'
  | 'INVESTIMENTO'
  | 'BENEFICIO';

export type TransactionType = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';

export type TransactionStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';

export type BudgetCategory = 'ESSENCIAL' | 'ESTILO_VIDA' | 'INVESTIMENTO';

export type CreditCardBrand =
  | 'VISA'
  | 'MASTERCARD'
  | 'ELO'
  | 'AMEX'
  | 'HIPERCARD'
  | 'OUTROS';

// ==================== ENTITIES ====================

/** Banco do catálogo público (public.banks) — fonte da verdade do bank_id. */
export interface Bank {
  id: string;
  ispb: string;
  code: number | null;
  name: string;
  full_name: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  is_active: boolean;
  is_benefit_provider: boolean;
  created_at: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: FinanceCategoryType;
  color: string;
  icon: string;
  /** null = categoria-mãe; caso contrário, referência à mãe (catálogo global) */
  parent_id: string | null;
  is_active: boolean;
  budget_category: BudgetCategory | null;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface FinanceAccount {
  id: string;
  user_id: string;
  bank_id: string | null;
  name: string;
  type: FinanceAccountType;
  initial_balance: number;
  current_balance: number;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Join que o GET /finance/accounts já retorna (bank:banks(*)) */
  bank?: Bank | null;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string;
  credit_card_id: string | null;
  recurrence_id: string | null;
  installment_group_id: string | null;
  invoice_payment_id: string | null;
  transfer_id: string | null;
  goal_id: string | null;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amount: number;
  paid_amount: number | null;
  due_date: string;
  payment_date: string | null;
  installment_number: number | null;
  total_installments: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithDetails extends FinanceTransaction {
  category: FinanceCategory;
  account?: FinanceAccount;
  /** Cartão da compra (o GET /finance/transactions já retorna embutido) */
  credit_card?: FinanceCreditCard | null;
  /** Tags da transação (o GET /finance/transactions já retorna enriquecido) */
  tags?: FinanceTag[];
}

/** Tag de transação — sempre do usuário (finance_tags tem user_id) */
export interface FinanceTag {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export type RecurrenceFrequency =
  | 'DIARIA'
  | 'SEMANAL'
  | 'QUINZENAL'
  | 'MENSAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL';

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  DIARIA: 'Diária',
  SEMANAL: 'Semanal',
  QUINZENAL: 'Quinzenal',
  MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
};

export interface FinanceRecurrence {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  /** Conta de destino — apenas em recorrências de TRANSFERENCIA */
  destination_account_id: string | null;
  credit_card_id: string | null;
  description: string;
  amount: number;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date: string | null;
  next_occurrence: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== FORM DATA ====================

export interface TransactionFormData {
  category_id: string;
  account_id?: string;
  credit_card_id?: string;
  type: TransactionType;
  description: string;
  amount: number;
  due_date: string;
  notes?: string;
  tag_ids?: string[];
  /**
   * 'PAGO' cria a transação já efetuada (saldo da conta ajustado na hora).
   * Default do backend: 'PENDENTE'. Ignorado em despesa de cartão (fatura).
   */
  status?: 'PENDENTE' | 'PAGO';
}

/**
 * Transferência entre contas: o backend cria as duas pernas (DESPESA na origem,
 * RECEITA no destino) já PAGAS, move os saldos e usa a categoria de sistema
 * "Transferências entre contas" — por isso não há category_id aqui.
 */
export interface CreateTransferInput {
  source_account_id: string;
  destination_account_id: string;
  description: string;
  amount: number;
  transfer_date: string;
  notes?: string;
}

/**
 * Recorrência: para RECEITA/DESPESA a categoria é obrigatória; para
 * TRANSFERENCIA o backend resolve a categoria e exige origem + destino.
 * O POST já cria a primeira ocorrência (PENDENTE, ou a transferência PAGA
 * quando a data de início é hoje/passada).
 */
export interface CreateRecurrenceInput {
  category_id?: string;
  account_id?: string;
  destination_account_id?: string;
  credit_card_id?: string;
  description: string;
  amount: number;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date?: string;
}

export interface AccountFormData {
  name: string;
  type: FinanceAccountType;
  /** UUID de public.banks; null/ausente para contas sem banco (carteira, investimento) */
  bank_id?: string | null;
  /** Saldo inicial em REAIS (não em centavos) */
  initial_balance?: number;
  color?: string;
  icon?: string;
}

/**
 * Uso da conta nas demais entidades, para bloquear a exclusão.
 * Transações CANCELADO não entram na contagem (não bloqueiam).
 */
export interface AccountUsage {
  transactions: number;
  recurrences: number;
  invoice_payments: number;
  goals: number;
  can_delete: boolean;
}

export interface FinanceCreditCard {
  id: string;
  user_id: string;
  name: string;
  brand: CreditCardBrand;
  total_limit: number;
  available_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditCardFormData {
  name: string;
  brand: CreditCardBrand;
  /** Limite total em REAIS (não em centavos) */
  total_limit: number;
  closing_day: number;
  due_day: number;
  color?: string;
}

/** Dados do cartão extraídos de uma fatura por IA (extract-invoice). */
export interface ExtractedCreditCard {
  name: string;
  brand: CreditCardBrand;
  /** Limite total em reais; null quando a fatura não informa */
  total_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  /** Emissor (banco) identificado, para a identidade visual no app */
  bank_name: string | null;
}

export interface CreditCardExtractionResult {
  found: boolean;
  /** Resposta curta em PT-BR: o que foi identificado ou o que faltou */
  message: string;
  card: ExtractedCreditCard | null;
}

/**
 * Fatura de um mês (GET /finance/credit-cards/:id/invoice). A resposta traz
 * também as transações do período; aqui só tipamos o resumo que o app usa.
 */
export interface CreditCardInvoiceSummary {
  month: string;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  closing_date: string;
  due_date: string;
}

// ==================== LABELS ====================

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
  TRANSFERENCIA: 'Transferencia',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
};

export const CREDIT_CARD_BRAND_LABELS: Record<CreditCardBrand, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  ELO: 'Elo',
  AMEX: 'American Express',
  HIPERCARD: 'Hipercard',
  OUTROS: 'Outros',
};

export const ACCOUNT_TYPE_LABELS: Record<FinanceAccountType, string> = {
  CONTA_CORRENTE: 'Conta Corrente',
  POUPANCA: 'Poupanca',
  CARTEIRA: 'Carteira',
  INVESTIMENTO: 'Investimento',
  BENEFICIO: 'Beneficio',
};

// ==================== PALETA DE CORES ====================

// Mesma paleta usada pela web (COLOR_PALETTE em CategoryIcon.tsx), para a
// identidade visual da conta ficar coerente entre app e web.
export const ACCOUNT_COLOR_PALETTE = [
  // Cinzas
  '#1e293b', '#475569', '#64748b', '#94a3b8',
  // Cores saturadas
  '#dc2626', '#ea580c', '#d97706', '#ca8a04',
  '#65a30d', '#16a34a', '#059669', '#0d9488',
  '#0891b2', '#0284c7', '#2563eb', '#4f46e5',
  '#7c3aed', '#9333ea', '#c026d3', '#db2777',
  // Cores pastel
  '#f87171', '#fb923c', '#fbbf24', '#facc15',
  '#a3e635', '#4ade80', '#34d399', '#2dd4bf',
  '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8',
  '#a78bfa', '#c084fc', '#e879f9', '#f472b6',
] as const;

// ==================== DASHBOARD TYPES ====================

export interface FinanceSummary {
  total_balance: number;
  benefit_balance: number;
  total_pending_expenses: number;
  total_pending_income: number;
  month_result: number;
  month_expenses: number;
  month_income: number;
}

export interface ExpensesByCategory {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  total: number;
  percentage: number;
}

export interface UpcomingPayment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  days_until_due: number;
  /** null nas faturas de cartão agregadas (não têm categoria única) */
  category: FinanceCategory | null;
  credit_card?: {
    id: string;
    name: string;
    brand: string;
    color: string;
  };
}

export interface BudgetAllocation {
  category: BudgetCategory;
  label: string;
  ideal_percentage: number;
  actual_amount: number;
  paid_amount: number;
  pending_amount: number;
  actual_percentage: number;
  paid_percentage: number;
  pending_percentage: number;
  status: 'on_track' | 'over_budget' | 'under_budget';
  difference: number;
}

export interface BudgetSummary {
  total_income: number;
  allocations: BudgetAllocation[];
  month: string;
}

export interface BudgetBreakdownTransaction {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'PAGO' | 'PENDENTE';
  is_credit_card: boolean;
}

export interface BudgetBreakdownCategory {
  category_id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  paid: number;
  pending: number;
  count: number;
  transactions: BudgetBreakdownTransaction[];
}

export interface BudgetBreakdownBucket {
  category: BudgetCategory;
  label: string;
  total: number;
  paid: number;
  pending: number;
  categories: BudgetBreakdownCategory[];
}

export interface BudgetBreakdown {
  month: string;
  buckets: BudgetBreakdownBucket[];
}

/** Item da lista paginada de transações de um bucket de orçamento. */
export interface BudgetTransactionItem {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'PAGO' | 'PENDENTE';
  is_credit_card: boolean;
  /** Nome da conta ou do cartão de origem (quando houver). */
  source_name: string | null;
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
}

/** Página de transações de um bucket (busca sob demanda). */
export interface BudgetTransactionsPage {
  bucket: BudgetCategory;
  month: string;
  total_count: number;
  total_amount: number;
  has_more: boolean;
  items: BudgetTransactionItem[];
}

// Budget category colors and labels
export const BUDGET_CATEGORY_COLORS: Record<BudgetCategory, string> = {
  ESSENCIAL: '#3b82f6',
  ESTILO_VIDA: '#22c55e',
  INVESTIMENTO: '#f59e0b',
};

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  ESSENCIAL: 'Essenciais',
  ESTILO_VIDA: 'Estilo de Vida',
  INVESTIMENTO: 'Investimentos',
};

// Ícone único de cada bucket 50-30-20 — usar SEMPRE este registro, em
// qualquer superfície que exiba um bucket (cards, listas, telas, sheets).
export const BUDGET_CATEGORY_ICONS: Record<BudgetCategory, IconSymbolName> = {
  ESSENCIAL: 'house.fill',
  ESTILO_VIDA: 'bag.fill',
  INVESTIMENTO: 'chart.line.uptrend.xyaxis',
};

/** Percentual ideal de cada bucket na regra 50-30-20. */
export const BUDGET_CATEGORY_IDEALS: Record<BudgetCategory, number> = {
  ESSENCIAL: 50,
  ESTILO_VIDA: 30,
  INVESTIMENTO: 20,
};

/** Explicação de cada bucket para o usuário (info sheet do orçamento). */
export const BUDGET_CATEGORY_DESCRIPTIONS: Record<BudgetCategory, string> = {
  ESSENCIAL:
    'O que você precisa para viver: moradia, mercado, contas de casa, transporte e saúde.',
  ESTILO_VIDA:
    'O que você quer, mas não precisa: restaurantes, lazer, compras e assinaturas.',
  INVESTIMENTO:
    'Dinheiro para o futuro: aportes, reserva de emergência e previdência.',
};

export const BUDGET_STATUS_LABELS: Record<BudgetAllocation['status'], string> = {
  on_track: 'No limite',
  over_budget: 'Acima',
  under_budget: 'Abaixo',
};

// ==================== HELPERS ====================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Uma conta em aberto (PENDENTE/VENCIDO) cujo vencimento já passou. Compras de
 * cartão não contam: liquidam pela fatura, não vencem individualmente.
 */
export function isTransactionOverdue(
  status: TransactionStatus,
  dueDate: string,
  isCard = false
): boolean {
  if (isCard) return false;
  if (status !== 'PENDENTE' && status !== 'VENCIDO') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate.split('T')[0] + 'T00:00:00');
  return due < today;
}

/**
 * Status para exibição: o sistema não reescreve PENDENTE→VENCIDO por data, então
 * uma pendente com vencimento passado é mostrada como "Vencido" (label/cor).
 */
export function effectiveTransactionStatus(
  status: TransactionStatus,
  dueDate: string,
  isCard = false
): TransactionStatus {
  return isTransactionOverdue(status, dueDate, isCard) ? 'VENCIDO' : status;
}

// Hex colors for React Native (not Tailwind classes)
export function getStatusColor(status: TransactionStatus): string {
  switch (status) {
    case 'PAGO':
      return '#059669'; // emerald-600
    case 'PENDENTE':
      return '#d97706'; // amber-600
    case 'VENCIDO':
      return '#dc2626'; // red-600
    case 'CANCELADO':
      return '#9ca3af'; // gray-400
    default:
      return '#4b5563'; // gray-600
  }
}

export function getTypeColor(type: TransactionType): string {
  switch (type) {
    case 'RECEITA':
      return '#059669'; // emerald-600
    case 'DESPESA':
      return '#dc2626'; // red-600
    case 'TRANSFERENCIA':
      return '#2563eb'; // blue-600
    default:
      return '#4b5563'; // gray-600
  }
}

export function getStatusBackgroundColor(status: TransactionStatus): string {
  switch (status) {
    case 'PAGO':
      return '#d1fae5'; // emerald-100
    case 'PENDENTE':
      return '#fef3c7'; // amber-100
    case 'VENCIDO':
      return '#fee2e2'; // red-100
    case 'CANCELADO':
      return '#f3f4f6'; // gray-100
    default:
      return '#f3f4f6'; // gray-100
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

/** Primeiro dia do mês da fatura que recebe uma compra feita em `purchaseDate`. */
function invoiceMonthStart(card: FinanceCreditCard, purchaseDate: Date): Date {
  // Primeiro dia do mês evita overflow (31 de jan + 1 mês viraria 3 de mar)
  return new Date(
    purchaseDate.getFullYear(),
    purchaseDate.getMonth() + (purchaseDate.getDate() > card.closing_day ? 1 : 0),
    1
  );
}

/** Mês da fatura que recebe uma compra feita em `purchaseDate` no cartão. */
export function invoiceMonthLabel(
  card: FinanceCreditCard,
  purchaseDate: Date
): string {
  return invoiceMonthStart(card, purchaseDate).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

/** Chave estável (YYYY-MM) do mês de fatura — para agrupar compras por fatura. */
export function invoiceMonthKey(card: FinanceCreditCard, purchaseDate: Date): string {
  const invoice = invoiceMonthStart(card, purchaseDate);
  return `${invoice.getFullYear()}-${String(invoice.getMonth() + 1).padStart(2, '0')}`;
}

/** Rótulo "julho de 2026" a partir de uma chave YYYY-MM de fatura. */
export function invoiceMonthKeyLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

// Group transactions by date
export function groupTransactionsByDate(
  transactions: TransactionWithDetails[]
): Record<string, TransactionWithDetails[]> {
  return transactions.reduce(
    (groups, transaction) => {
      const date = transaction.due_date.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    },
    {} as Record<string, TransactionWithDetails[]>
  );
}

// ==================== GLOBAL CATEGORIES ====================

export type GlobalCategoryType = 'DESPESA' | 'RECEITA';

export interface GlobalCategory {
  id: string;
  parent_id: string | null;
  name: string;
  icon: string;
  color: string;
  type: GlobalCategoryType;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GlobalCategoryWithChildren extends GlobalCategory {
  children: GlobalCategory[];
}
