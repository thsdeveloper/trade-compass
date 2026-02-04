// ==================== ENUMS ====================

export type FinanceCategoryType = 'DESPESA' | 'RECEITA';

export type FinanceAccountType =
  | 'CONTA_CORRENTE'
  | 'POUPANCA'
  | 'CARTEIRA'
  | 'INVESTIMENTO'
  | 'BENEFICIO';

export type CreditCardBrand =
  | 'VISA'
  | 'MASTERCARD'
  | 'ELO'
  | 'AMEX'
  | 'HIPERCARD'
  | 'OUTROS';

export type TransactionType = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';

export type TransactionStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';

// Filters for transaction page
export interface TransactionFilters {
  status: TransactionStatus | 'all';
  type: TransactionType | 'all';
  category: string;
  tag: string;
  account: string;
  creditCard: string;
  urgent: boolean;
  search: string;
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

export type InvoicePaymentType = 'TOTAL' | 'PARCIAL' | 'MINIMO';

export type BudgetCategory = 'ESSENCIAL' | 'ESTILO_VIDA' | 'INVESTIMENTO';

// ==================== ENTITIES ====================

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
  user_id: string;
  name: string;
  type: FinanceCategoryType;
  color: string;
  icon: string;
  is_system: boolean;
  is_active: boolean;
  budget_category: BudgetCategory | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceTag {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
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
}

export interface AccountWithBank extends FinanceAccount {
  bank: Bank | null;
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

export interface FinanceRecurrence {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
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

// Tipos parciais para JOINs de recorrencia
export interface RecurrenceCategoryDetails {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: FinanceCategoryType;
}

export interface RecurrenceAccountDetails {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface RecurrenceCreditCardDetails {
  id: string;
  name: string;
  brand: CreditCardBrand;
  color: string;
}

// Recorrencia com detalhes de categoria, conta e cartao
export interface RecurrenceWithDetails extends FinanceRecurrence {
  category: RecurrenceCategoryDetails;
  account: RecurrenceAccountDetails | null;
  credit_card: RecurrenceCreditCardDetails | null;
}

export interface FinanceInvoicePayment {
  id: string;
  user_id: string;
  credit_card_id: string;
  account_id: string;
  transaction_id: string | null;
  invoice_month: string;
  amount: number;
  payment_date: string;
  payment_type: InvoicePaymentType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== FORM DATA ====================

export interface CategoryFormData {
  name: string;
  type: FinanceCategoryType;
  color: string;
  icon: string;
  budget_category?: BudgetCategory;
}

export interface AccountFormData {
  name: string;
  type: FinanceAccountType;
  bank_id: string;
  initial_balance: number;
  color: string;
  icon: string;
}

export interface CreditCardFormData {
  name: string;
  brand: CreditCardBrand;
  total_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
}

export interface TransactionFormData {
  category_id: string;
  account_id?: string;
  credit_card_id?: string;
  goal_id?: string;
  type: TransactionType;
  description: string;
  amount: number;
  due_date: string;
  notes?: string;
  // Parcelamento
  is_installment?: boolean;
  total_installments?: number;
  // Tags
  tag_ids?: string[];
}

export interface TagFormData {
  name: string;
}

export interface RecurrenceFormData {
  category_id: string;
  account_id?: string;
  credit_card_id?: string;
  description: string;
  amount: number;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date?: string;
}

export interface PayInvoiceFormData {
  account_id: string;
  amount: number;
  invoice_month: string;
  payment_type: InvoicePaymentType;
  payment_date?: string;
  notes?: string;
}

export interface TransferFormData {
  source_account_id: string;
  destination_account_id: string;
  category_id: string;
  description: string;
  amount: number;
  transfer_date: string;
  notes?: string;
  goal_id?: string; // Vincular transferencia a um objetivo
}

export interface PayTransactionData {
  paid_amount: number;
  payment_date: string;
  account_id?: string;
}

export interface TransferResult {
  transfer_id: string;
  source_transaction: FinanceTransaction;
  destination_transaction: FinanceTransaction;
}

// ==================== RESPONSES ====================

export interface TransactionWithDetails extends FinanceTransaction {
  category: FinanceCategory;
  account?: FinanceAccount;
  credit_card?: FinanceCreditCard;
  transfer_counterpart_account?: FinanceAccount;
  tags?: FinanceTag[];
}

export interface CreditCardInvoice {
  credit_card: FinanceCreditCard;
  month: string;
  transactions: TransactionWithDetails[];
  total: number;
  paid_amount: number;
  remaining_amount: number;
  closing_date: string;
  due_date: string;
}

export interface InvoicePaymentResult {
  invoice_payment: FinanceInvoicePayment;
  updated_card: FinanceCreditCard;
  updated_account: FinanceAccount;
}

export interface InvoicePaymentWithDetails extends FinanceInvoicePayment {
  account: FinanceAccount;
  credit_card: FinanceCreditCard;
}

// ==================== DASHBOARD ====================

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

export interface CashFlowPoint {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface UpcomingPayment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  days_until_due: number;
  category: FinanceCategory;
  credit_card?: FinanceCreditCard;
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

export interface YearSummary {
  year: number;
  total_balance: number;
  total_income: number;
  total_expenses: number;
  year_result: number;
  monthly_breakdown: Array<{
    month: string;
    income: number;
    expenses: number;
    result: number;
  }>;
}

// ==================== LABELS ====================

export const CATEGORY_TYPE_LABELS: Record<FinanceCategoryType, string> = {
  DESPESA: 'Despesa',
  RECEITA: 'Receita',
};

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  ESSENCIAL: 'Essenciais',
  ESTILO_VIDA: 'Estilo de Vida',
  INVESTIMENTO: 'Investimentos',
};

export const BUDGET_CATEGORY_IDEAL: Record<BudgetCategory, number> = {
  ESSENCIAL: 50,
  ESTILO_VIDA: 30,
  INVESTIMENTO: 20,
};

export const BUDGET_CATEGORY_COLORS: Record<BudgetCategory, string> = {
  ESSENCIAL: '#3b82f6',
  ESTILO_VIDA: '#22c55e',
  INVESTIMENTO: '#f59e0b',
};

export const ACCOUNT_TYPE_LABELS: Record<FinanceAccountType, string> = {
  CONTA_CORRENTE: 'Conta Corrente',
  POUPANCA: 'Poupanca',
  CARTEIRA: 'Carteira',
  INVESTIMENTO: 'Investimento',
  BENEFICIO: 'Beneficio',
};

export const CREDIT_CARD_BRAND_LABELS: Record<CreditCardBrand, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  ELO: 'Elo',
  AMEX: 'American Express',
  HIPERCARD: 'Hipercard',
  OUTROS: 'Outros',
};

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

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  DIARIA: 'Diaria',
  SEMANAL: 'Semanal',
  QUINZENAL: 'Quinzenal',
  MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
};

// ==================== HELPERS ====================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function getStatusColor(status: TransactionStatus): string {
  switch (status) {
    case 'PAGO':
      return 'text-emerald-600';
    case 'PENDENTE':
      return 'text-amber-600';
    case 'VENCIDO':
      return 'text-red-600';
    case 'CANCELADO':
      return 'text-gray-400';
    default:
      return 'text-gray-600';
  }
}

export function getTypeColor(type: TransactionType): string {
  switch (type) {
    case 'RECEITA':
      return 'text-emerald-600';
    case 'DESPESA':
      return 'text-red-600';
    case 'TRANSFERENCIA':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

// ==================== DEBT TYPES ====================

export type DebtType =
  | 'BANCO'
  | 'CARTAO_CREDITO'
  | 'EMPRESTIMO_PESSOAL'
  | 'FINANCIAMENTO'
  | 'CHEQUE_ESPECIAL'
  | 'BOLETO'
  | 'FORNECEDOR'
  | 'OUTROS';

export type DebtStatus =
  | 'EM_ABERTO'
  | 'EM_NEGOCIACAO'
  | 'NEGOCIADA'
  | 'QUITADA'
  | 'CANCELADA';

export type NegotiationPaymentMethod = 'A_VISTA' | 'PARCELADO';

export type NegotiationStatus = 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CONCLUIDA';

// ==================== DEBT ENTITIES ====================

export interface FinanceDebt {
  id: string;
  user_id: string;
  creditor_name: string;
  debt_type: DebtType;
  original_amount: number;
  updated_amount: number;
  original_due_date: string;
  status: DebtStatus;
  contract_number: string | null;
  creditor_document: string | null;
  creditor_contact_phone: string | null;
  creditor_contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceDebtNegotiation {
  id: string;
  user_id: string;
  debt_id: string;
  payment_method: NegotiationPaymentMethod;
  total_installments: number;
  negotiated_value: number;
  installment_value: number;
  first_payment_date: string;
  protocol_number: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  status: NegotiationStatus;
  is_active: boolean;
  transactions_generated: boolean;
  transaction_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DebtWithNegotiation extends FinanceDebt {
  active_negotiation?: FinanceDebtNegotiation | null;
}

// ==================== DEBT FORM DATA ====================

export interface DebtFormData {
  creditor_name: string;
  debt_type: DebtType;
  original_amount: number;
  updated_amount: number;
  original_due_date: string;
  contract_number?: string;
  creditor_document?: string;
  creditor_contact_phone?: string;
  creditor_contact_email?: string;
  notes?: string;
}

export interface NegotiationFormData {
  payment_method: NegotiationPaymentMethod;
  total_installments: number;
  negotiated_value: number;
  first_payment_date: string;
  protocol_number?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
}

export interface GenerateTransactionsFormData {
  category_id: string;
  account_id: string;
}

// ==================== DEBT RESPONSES ====================

export interface DebtSummary {
  total_debts: number;
  total_open_amount: number;
  total_negotiated_amount: number;
  debts_by_status: { status: DebtStatus; count: number; total: number }[];
}

// ==================== DEBT LABELS ====================

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  BANCO: 'Banco',
  CARTAO_CREDITO: 'Cartao de Credito',
  EMPRESTIMO_PESSOAL: 'Emprestimo Pessoal',
  FINANCIAMENTO: 'Financiamento',
  CHEQUE_ESPECIAL: 'Cheque Especial',
  BOLETO: 'Boleto',
  FORNECEDOR: 'Fornecedor',
  OUTROS: 'Outros',
};

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  EM_ABERTO: 'Em Aberto',
  EM_NEGOCIACAO: 'Em Negociacao',
  NEGOCIADA: 'Negociada',
  QUITADA: 'Quitada',
  CANCELADA: 'Cancelada',
};

export const NEGOTIATION_PAYMENT_METHOD_LABELS: Record<NegotiationPaymentMethod, string> = {
  A_VISTA: 'A Vista',
  PARCELADO: 'Parcelado',
};

export const NEGOTIATION_STATUS_LABELS: Record<NegotiationStatus, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  CONCLUIDA: 'Concluida',
};

// ==================== DEBT HELPERS ====================

export function getDebtStatusColor(status: DebtStatus): string {
  switch (status) {
    case 'QUITADA':
      return 'text-emerald-600';
    case 'EM_ABERTO':
      return 'text-red-600';
    case 'EM_NEGOCIACAO':
      return 'text-amber-600';
    case 'NEGOCIADA':
      return 'text-blue-600';
    case 'CANCELADA':
      return 'text-gray-400';
    default:
      return 'text-gray-600';
  }
}

export function getDebtStatusBgColor(status: DebtStatus): string {
  switch (status) {
    case 'QUITADA':
      return 'bg-emerald-100 text-emerald-800';
    case 'EM_ABERTO':
      return 'bg-red-100 text-red-800';
    case 'EM_NEGOCIACAO':
      return 'bg-amber-100 text-amber-800';
    case 'NEGOCIADA':
      return 'bg-blue-100 text-blue-800';
    case 'CANCELADA':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

// ==================== GOAL TYPES ====================

export type FinanceGoalCategory =
  | 'VEICULO'
  | 'IMOVEL'
  | 'VIAGEM'
  | 'EDUCACAO'
  | 'RESERVA_EMERGENCIA'
  | 'INVESTIMENTO'
  | 'OUTROS';

export type FinanceGoalPriority = 'BAIXA' | 'MEDIA' | 'ALTA';

export type FinanceGoalStatus = 'ATIVO' | 'PAUSADO' | 'CONCLUIDO' | 'CANCELADO';

// ==================== GOAL ENTITIES ====================

export interface FinanceGoal {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  goal_category: FinanceGoalCategory;
  target_amount: number;
  deadline: string | null;
  priority: FinanceGoalPriority;
  status: FinanceGoalStatus;
  linked_account_id: string | null;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface GoalWithProgress extends FinanceGoal {
  current_amount: number;
  progress_percentage: number;
  contributions_count: number;
  linked_account?: FinanceAccount | null;
}

// ==================== GOAL FORM DATA ====================

export interface GoalFormData {
  name: string;
  description?: string;
  goal_category: FinanceGoalCategory;
  target_amount: number;
  deadline?: string;
  priority: FinanceGoalPriority;
  linked_account_id?: string;
  icon: string;
  color: string;
}

// ==================== GOAL RESPONSES ====================

export interface GoalSummary {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  total_target: number;
  total_contributed: number;
  overall_progress: number;
}

export interface GoalSelectItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// ==================== GOAL CONTRIBUTIONS ====================

export interface FinanceGoalContribution {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  contribution_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalContributionFormData {
  amount: number;
  contribution_date: string;
  description?: string;
}

// Item unificado do histórico (transação, manual ou investimento)
export interface GoalContributionItem {
  id: string;
  type: 'transaction' | 'manual' | 'investment';
  amount: number;
  date: string;
  description: string;
  status?: string; // Para transações e investimentos
}

// ==================== GOAL LABELS ====================

export const GOAL_CATEGORY_LABELS: Record<FinanceGoalCategory, string> = {
  VEICULO: 'Veiculo',
  IMOVEL: 'Imovel',
  VIAGEM: 'Viagem',
  EDUCACAO: 'Educacao',
  RESERVA_EMERGENCIA: 'Reserva de Emergencia',
  INVESTIMENTO: 'Investimento',
  OUTROS: 'Outros',
};

export const GOAL_PRIORITY_LABELS: Record<FinanceGoalPriority, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Media',
  ALTA: 'Alta',
};

export const GOAL_STATUS_LABELS: Record<FinanceGoalStatus, string> = {
  ATIVO: 'Ativo',
  PAUSADO: 'Pausado',
  CONCLUIDO: 'Concluido',
  CANCELADO: 'Cancelado',
};

export const GOAL_CATEGORY_ICONS: Record<FinanceGoalCategory, string> = {
  VEICULO: 'Car',
  IMOVEL: 'Home',
  VIAGEM: 'Plane',
  EDUCACAO: 'GraduationCap',
  RESERVA_EMERGENCIA: 'Shield',
  INVESTIMENTO: 'TrendingUp',
  OUTROS: 'Target',
};

// ==================== GOAL HELPERS ====================

export function getGoalStatusColor(status: FinanceGoalStatus): string {
  switch (status) {
    case 'ATIVO':
      return 'text-blue-600';
    case 'PAUSADO':
      return 'text-amber-600';
    case 'CONCLUIDO':
      return 'text-emerald-600';
    case 'CANCELADO':
      return 'text-gray-400';
    default:
      return 'text-gray-600';
  }
}

export function getGoalStatusBgColor(status: FinanceGoalStatus): string {
  switch (status) {
    case 'ATIVO':
      return 'bg-blue-100 text-blue-800';
    case 'PAUSADO':
      return 'bg-amber-100 text-amber-800';
    case 'CONCLUIDO':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELADO':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function getPriorityColor(priority: FinanceGoalPriority): string {
  switch (priority) {
    case 'ALTA':
      return 'text-red-600';
    case 'MEDIA':
      return 'text-amber-600';
    case 'BAIXA':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

// ==================== PLANNING (50/30/20) TYPES ====================

export type PlanningStatus = 'on_track' | 'at_risk' | 'over_budget' | 'under_budget';

export type PlanningTrend = 'increasing' | 'stable' | 'decreasing';

export type RecommendationType = 'warning' | 'suggestion' | 'achievement';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface PlanningProjection {
  category: BudgetCategory;
  current_amount: number;
  projected_end_of_month: number;
  ideal_amount: number;
  daily_average: number;
  days_remaining: number;
  trend: PlanningTrend;
  status: PlanningStatus;
}

export interface PlanningRecommendation {
  id: string;
  category: BudgetCategory;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
}

export interface CategoryByBucket {
  category: FinanceCategory;
  amount: number;
  percentage: number;
}

export interface BucketBreakdown {
  budget_category: BudgetCategory;
  total: number;
  ideal: number;
  percentage: number;
  categories: CategoryByBucket[];
  status: PlanningStatus;
}

// ==================== PLANNING LABELS ====================

export const PLANNING_STATUS_LABELS: Record<PlanningStatus, string> = {
  on_track: 'No limite',
  at_risk: 'Em risco',
  over_budget: 'Acima do limite',
  under_budget: 'Abaixo do limite',
};

export const PLANNING_TREND_LABELS: Record<PlanningTrend, string> = {
  increasing: 'Aumentando',
  stable: 'Estavel',
  decreasing: 'Diminuindo',
};

export const RECOMMENDATION_TYPE_LABELS: Record<RecommendationType, string> = {
  warning: 'Alerta',
  suggestion: 'Sugestao',
  achievement: 'Conquista',
};

// ==================== PLANNING HELPERS ====================

export function getPlanningStatusColor(status: PlanningStatus): string {
  switch (status) {
    case 'on_track':
      return 'text-emerald-600';
    case 'at_risk':
      return 'text-amber-600';
    case 'over_budget':
      return 'text-red-600';
    case 'under_budget':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

export function getPlanningStatusBgColor(status: PlanningStatus): string {
  switch (status) {
    case 'on_track':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'at_risk':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'over_budget':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'under_budget':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export function getRecommendationIcon(type: RecommendationType): string {
  switch (type) {
    case 'warning':
      return 'AlertTriangle';
    case 'suggestion':
      return 'Lightbulb';
    case 'achievement':
      return 'Trophy';
    default:
      return 'Info';
  }
}

export function getRecommendationColor(type: RecommendationType): string {
  switch (type) {
    case 'warning':
      return 'text-amber-600';
    case 'suggestion':
      return 'text-blue-600';
    case 'achievement':
      return 'text-emerald-600';
    default:
      return 'text-gray-600';
  }
}

// ==================== FIXED INCOME TYPES ====================

export type FixedIncomeType =
  | 'CDB'
  | 'LCI'
  | 'LCA'
  | 'TESOURO_SELIC'
  | 'TESOURO_PREFIXADO'
  | 'TESOURO_IPCA'
  | 'DEBENTURE'
  | 'CRI'
  | 'CRA'
  | 'LC'
  | 'OUTROS';

export type FixedIncomeRateType = 'PRE_FIXADO' | 'POS_FIXADO' | 'HIBRIDO';

export type FixedIncomeRateIndex = 'CDI' | 'SELIC' | 'IPCA' | 'IGPM' | 'NENHUM';

export type FixedIncomeLiquidity =
  | 'NO_VENCIMENTO'
  | 'DIARIA'
  | 'D_PLUS_1'
  | 'D_PLUS_30'
  | 'D_PLUS_90'
  | 'OUTROS';

export type FixedIncomeStatus = 'ATIVO' | 'VENCIDO' | 'RESGATADO' | 'CANCELADO';

export type FixedIncomeMarket = 'PRIMARIO' | 'SECUNDARIO';

// ==================== FIXED INCOME ENTITIES ====================

export interface FinanceFixedIncome {
  id: string;
  user_id: string;
  investment_type: FixedIncomeType;
  name: string;
  issuer: string;
  rate_type: FixedIncomeRateType;
  rate_value: number;
  rate_index: FixedIncomeRateIndex;
  rate_spread: number;
  amount_invested: number;
  current_value: number | null;
  minimum_investment: number | null;
  purchase_date: string;
  maturity_date: string;
  liquidity_type: FixedIncomeLiquidity;
  market: FixedIncomeMarket;
  status: FixedIncomeStatus;
  broker: string | null;
  custody_account: string | null;
  notes: string | null;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FixedIncomeWithYield extends FinanceFixedIncome {
  days_to_maturity: number;
  days_elapsed: number;
  total_days: number;
  gross_yield: number;
  gross_yield_percentage: number;
  estimated_final_value: number;
  progress_percentage: number;
}

// ==================== FIXED INCOME FORM DATA ====================

export interface FixedIncomeFormData {
  investment_type: FixedIncomeType;
  name: string;
  issuer: string;
  rate_type: FixedIncomeRateType;
  rate_value: number;
  rate_index?: FixedIncomeRateIndex;
  rate_spread?: number;
  amount_invested: number;
  current_value?: number;
  minimum_investment?: number;
  purchase_date: string;
  maturity_date: string;
  liquidity_type?: FixedIncomeLiquidity;
  market?: FixedIncomeMarket;
  broker?: string;
  custody_account?: string;
  notes?: string;
  goal_id?: string;
}

// ==================== FIXED INCOME RESPONSES ====================

export interface FixedIncomeSummary {
  total_invested: number;
  total_current_value: number;
  total_gross_yield: number;
  total_yield_percentage: number;
  active_investments: number;
  by_type: {
    type: FixedIncomeType;
    count: number;
    total_invested: number;
    total_current_value: number;
  }[];
  by_rate_type: {
    rate_type: FixedIncomeRateType;
    count: number;
    total_invested: number;
  }[];
  upcoming_maturities: {
    id: string;
    name: string;
    maturity_date: string;
    days_to_maturity: number;
    amount_invested: number;
    estimated_final_value: number;
  }[];
}

// ==================== FIXED INCOME CONTRIBUTIONS ====================

export interface FixedIncomeContribution {
  id: string;
  user_id: string;
  fixed_income_id: string;
  amount: number;
  contribution_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FixedIncomeContributionFormData {
  amount: number;
  contribution_date: string;
  description?: string;
}

export interface FixedIncomeWithContributions extends FixedIncomeWithYield {
  contributions_count: number;
  total_contributions: number;
}

// ==================== FIXED INCOME LABELS ====================

export const FIXED_INCOME_TYPE_LABELS: Record<FixedIncomeType, string> = {
  CDB: 'CDB',
  LCI: 'LCI',
  LCA: 'LCA',
  TESOURO_SELIC: 'Tesouro Selic',
  TESOURO_PREFIXADO: 'Tesouro Prefixado',
  TESOURO_IPCA: 'Tesouro IPCA+',
  DEBENTURE: 'Debenture',
  CRI: 'CRI',
  CRA: 'CRA',
  LC: 'LC',
  OUTROS: 'Outros',
};

export const FIXED_INCOME_RATE_TYPE_LABELS: Record<FixedIncomeRateType, string> = {
  PRE_FIXADO: 'Pre-fixado',
  POS_FIXADO: 'Pos-fixado',
  HIBRIDO: 'Hibrido',
};

export const FIXED_INCOME_RATE_INDEX_LABELS: Record<FixedIncomeRateIndex, string> = {
  CDI: 'CDI',
  SELIC: 'Selic',
  IPCA: 'IPCA',
  IGPM: 'IGP-M',
  NENHUM: 'Nenhum',
};

export const FIXED_INCOME_LIQUIDITY_LABELS: Record<FixedIncomeLiquidity, string> = {
  NO_VENCIMENTO: 'No vencimento',
  DIARIA: 'Liquidez diaria',
  D_PLUS_1: 'D+1',
  D_PLUS_30: 'D+30',
  D_PLUS_90: 'D+90',
  OUTROS: 'Outros',
};

export const FIXED_INCOME_STATUS_LABELS: Record<FixedIncomeStatus, string> = {
  ATIVO: 'Ativo',
  VENCIDO: 'Vencido',
  RESGATADO: 'Resgatado',
  CANCELADO: 'Cancelado',
};

export const FIXED_INCOME_MARKET_LABELS: Record<FixedIncomeMarket, string> = {
  PRIMARIO: 'Primario',
  SECUNDARIO: 'Secundario',
};

// ==================== FIXED INCOME HELPERS ====================

export function getFixedIncomeStatusColor(status: FixedIncomeStatus): string {
  switch (status) {
    case 'ATIVO':
      return 'text-emerald-600';
    case 'VENCIDO':
      return 'text-amber-600';
    case 'RESGATADO':
      return 'text-blue-600';
    case 'CANCELADO':
      return 'text-gray-400';
    default:
      return 'text-gray-600';
  }
}

export function getFixedIncomeStatusBgColor(status: FixedIncomeStatus): string {
  switch (status) {
    case 'ATIVO':
      return 'bg-emerald-100 text-emerald-800';
    case 'VENCIDO':
      return 'bg-amber-100 text-amber-800';
    case 'RESGATADO':
      return 'bg-blue-100 text-blue-800';
    case 'CANCELADO':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function formatRateDisplay(
  rateType: FixedIncomeRateType,
  rateValue: number,
  rateIndex: FixedIncomeRateIndex,
  rateSpread: number
): string {
  const formattedRate = rateValue.toFixed(2).replace('.', ',');

  switch (rateType) {
    case 'PRE_FIXADO':
      return `${formattedRate}% a.a.`;
    case 'POS_FIXADO':
      return `${formattedRate}% do ${rateIndex}`;
    case 'HIBRIDO':
      const formattedSpread = rateSpread.toFixed(2).replace('.', ',');
      return `${rateIndex} + ${formattedSpread}% a.a.`;
    default:
      return `${formattedRate}%`;
  }
}

// ==================== MORTGAGE TYPES ====================

export type MortgageAmortizationSystem = 'SAC' | 'PRICE' | 'SACRE';

export type MortgageRateIndex = 'TR' | 'IPCA' | 'IGPM' | 'FIXO';

export type MortgageModality = 'SFH' | 'SFI' | 'FGTS' | 'SBPE' | 'OUTROS';

export type MortgageStatus = 'ATIVO' | 'QUITADO' | 'ATRASADO' | 'CANCELADO';

export type MortgageInstallmentStatus = 'PENDENTE' | 'PAGA' | 'VENCIDA' | 'PARCIAL';

export type MortgageExtraPaymentType = 'REDUCE_TERM' | 'REDUCE_INSTALLMENT';

export type MortgageDocumentCategory =
  | 'CONTRATO'
  | 'MATRICULA'
  | 'EXTRATO'
  | 'COMPROVANTE'
  | 'SEGURO'
  | 'ESCRITURA'
  | 'IPTU'
  | 'OUTROS';

// ==================== MORTGAGE ENTITIES ====================

export interface FinanceMortgage {
  id: string;
  user_id: string;
  contract_number: string;
  institution_name: string;
  institution_bank_id: string | null;
  modality: MortgageModality;
  amortization_system: MortgageAmortizationSystem;
  property_value: number;
  financed_amount: number;
  down_payment: number;
  current_balance: number | null;
  base_annual_rate: number;
  reduced_annual_rate: number | null;
  rate_index: MortgageRateIndex;
  is_reduced_rate_active: boolean;
  total_installments: number;
  paid_installments: number;
  contract_start_date: string;
  first_installment_date: string;
  mip_rate: number | null;
  dfi_rate: number | null;
  admin_fee: number;
  status: MortgageStatus;
  alert_days_before: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MortgageWithBank extends FinanceMortgage {
  institution_bank?: Bank | null;
}

export interface MortgageInstallment {
  id: string;
  user_id: string;
  mortgage_id: string;
  installment_number: number;
  due_date: string;
  installment_type: string;
  amortization_amount: number;
  interest_amount: number;
  mip_insurance: number;
  dfi_insurance: number;
  admin_fee: number;
  government_subsidy: number;
  interest_differential: number;
  tr_adjustment: number;
  fgts_amount: number;
  mora_amount: number;
  fine_amount: number;
  total_amount: number;
  balance_before: number;
  balance_after: number;
  status: MortgageInstallmentStatus;
  payment_date: string | null;
  paid_amount: number | null;
  payment_difference: number;
  days_late: number;
  receipt_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MortgageExtraPayment {
  id: string;
  user_id: string;
  mortgage_id: string;
  payment_date: string;
  amount: number;
  payment_type: MortgageExtraPaymentType;
  balance_before: number;
  balance_after: number;
  remaining_installments_before: number;
  remaining_installments_after: number;
  installment_value_before: number;
  installment_value_after: number;
  interest_saved: number | null;
  months_reduced: number | null;
  receipt_path: string | null;
  notes: string | null;
  created_at: string;
}

export interface MortgageDocument {
  id: string;
  user_id: string;
  mortgage_id: string;
  category: MortgageDocumentCategory;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  reference_year: number | null;
  notes: string | null;
  created_at: string;
}

export interface TRRate {
  id: string;
  reference_date: string;
  rate: number;
  created_at: string;
}

// ==================== MORTGAGE WITH PROGRESS ====================

export interface MortgageWithProgress extends MortgageWithBank {
  remaining_installments: number;
  progress_percentage: number;
  next_installment?: MortgageInstallment | null;
  total_paid: number;
  total_interest_paid: number;
  total_amortization_paid: number;
}

// ==================== MORTGAGE FORM DATA ====================

export interface MortgageFormData {
  contract_number: string;
  institution_name: string;
  institution_bank_id?: string;
  modality: MortgageModality;
  amortization_system: MortgageAmortizationSystem;
  property_value: number;
  financed_amount: number;
  down_payment: number;
  base_annual_rate: number;
  reduced_annual_rate?: number;
  rate_index: MortgageRateIndex;
  is_reduced_rate_active: boolean;
  total_installments: number;
  contract_start_date: string;
  first_installment_date: string;
  mip_rate?: number;
  dfi_rate?: number;
  admin_fee: number;
  alert_days_before: number;
  notes?: string;
}

export interface PayInstallmentFormData {
  paid_amount?: number;
  payment_date?: string;
  notes?: string;
}

export interface ExtraPaymentFormData {
  payment_date: string;
  amount: number;
  payment_type: MortgageExtraPaymentType;
  notes?: string;
}

export interface SimulateExtraPaymentFormData {
  amount: number;
  payment_type: MortgageExtraPaymentType;
}

export interface MortgageDocumentFormData {
  category: MortgageDocumentCategory;
  name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  reference_year?: number;
  notes?: string;
}

// ==================== MORTGAGE RESPONSES ====================

export interface MortgageSummary {
  total_mortgages: number;
  active_mortgages: number;
  total_financed: number;
  total_current_balance: number;
  total_paid: number;
  overall_progress: number;
}

export interface ExtraPaymentSimulation {
  payment_type: MortgageExtraPaymentType;
  amount: number;
  current_balance: number;
  new_balance: number;
  current_remaining_installments: number;
  new_remaining_installments: number;
  current_installment_value: number;
  new_installment_value: number;
  interest_saved: number;
  months_reduced: number;
  total_saved: number;
}

export interface EarlyPayoffSimulation {
  current_balance: number;
  remaining_installments: number;
  total_remaining_payments: number;
  total_interest_remaining: number;
  payoff_amount: number;
  total_savings: number;
}

export interface AnnualMortgageReport {
  year: number;
  mortgage_id: string;
  mortgage_name: string;
  institution_name: string;
  contract_number: string;
  balance_start_of_year: number;
  balance_end_of_year: number;
  total_paid: number;
  total_amortization: number;
  total_interest: number;
  total_insurance: number;
  total_admin_fee: number;
  extra_payments_total: number;
  installments: MortgageInstallment[];
  extra_payments: MortgageExtraPayment[];
}

// ==================== MORTGAGE LABELS ====================

export const MORTGAGE_STATUS_LABELS: Record<MortgageStatus, string> = {
  ATIVO: 'Ativo',
  QUITADO: 'Quitado',
  ATRASADO: 'Atrasado',
  CANCELADO: 'Cancelado',
};

export const MORTGAGE_INSTALLMENT_STATUS_LABELS: Record<MortgageInstallmentStatus, string> = {
  PENDENTE: 'Pendente',
  PAGA: 'Paga',
  VENCIDA: 'Vencida',
  PARCIAL: 'Parcial',
};

export const MORTGAGE_AMORTIZATION_LABELS: Record<MortgageAmortizationSystem, string> = {
  SAC: 'SAC',
  PRICE: 'Price',
  SACRE: 'SACRE',
};

export const MORTGAGE_RATE_INDEX_LABELS: Record<MortgageRateIndex, string> = {
  TR: 'TR',
  IPCA: 'IPCA',
  IGPM: 'IGP-M',
  FIXO: 'Fixo',
};

export const MORTGAGE_MODALITY_LABELS: Record<MortgageModality, string> = {
  SFH: 'SFH',
  SFI: 'SFI',
  FGTS: 'FGTS',
  SBPE: 'SBPE',
  OUTROS: 'Outros',
};

export const MORTGAGE_EXTRA_PAYMENT_TYPE_LABELS: Record<MortgageExtraPaymentType, string> = {
  REDUCE_TERM: 'Reduzir prazo',
  REDUCE_INSTALLMENT: 'Reduzir parcela',
};

export const MORTGAGE_DOCUMENT_CATEGORY_LABELS: Record<MortgageDocumentCategory, string> = {
  CONTRATO: 'Contrato',
  MATRICULA: 'Matricula',
  EXTRATO: 'Extrato',
  COMPROVANTE: 'Comprovante',
  SEGURO: 'Seguro',
  ESCRITURA: 'Escritura',
  IPTU: 'IPTU',
  OUTROS: 'Outros',
};

// ==================== MORTGAGE HELPERS ====================

export function getMortgageStatusColor(status: MortgageStatus): string {
  switch (status) {
    case 'ATIVO':
      return 'text-blue-600';
    case 'QUITADO':
      return 'text-emerald-600';
    case 'ATRASADO':
      return 'text-red-600';
    case 'CANCELADO':
      return 'text-gray-400';
    default:
      return 'text-gray-600';
  }
}

export function getMortgageStatusBgColor(status: MortgageStatus): string {
  switch (status) {
    case 'ATIVO':
      return 'bg-blue-100 text-blue-800';
    case 'QUITADO':
      return 'bg-emerald-100 text-emerald-800';
    case 'ATRASADO':
      return 'bg-red-100 text-red-800';
    case 'CANCELADO':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function getMortgageInstallmentStatusColor(status: MortgageInstallmentStatus): string {
  switch (status) {
    case 'PAGA':
      return 'text-emerald-600';
    case 'PENDENTE':
      return 'text-amber-600';
    case 'VENCIDA':
      return 'text-red-600';
    case 'PARCIAL':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

export function getMortgageInstallmentStatusBgColor(status: MortgageInstallmentStatus): string {
  switch (status) {
    case 'PAGA':
      return 'bg-emerald-100 text-emerald-800';
    case 'PENDENTE':
      return 'bg-amber-100 text-amber-800';
    case 'VENCIDA':
      return 'bg-red-100 text-red-800';
    case 'PARCIAL':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

// ==================== AMORTIZATION SIMULATION ====================

export interface ExtraPaymentConfig {
  id: string;
  type: 'ONE_TIME' | 'RECURRING';
  amount: number;
  start_month?: number;
  end_month?: number | null;
  payment_type: MortgageExtraPaymentType;
}

export interface AmortizationSimulationRequest {
  extra_payments?: ExtraPaymentConfig[];
  include_current_schedule?: boolean;
}

export interface CalculatedInstallment {
  installment_number: number;
  due_date: string;
  amortization_amount: number;
  interest_amount: number;
  mip_insurance: number;
  dfi_insurance: number;
  admin_fee: number;
  tr_adjustment: number;
  total_amount: number;
  balance_before: number;
  balance_after: number;
}

export interface AmortizationScenarioSummary {
  total_paid: number;
  total_interest: number;
  total_amortization: number;
  final_installment_number: number;
  estimated_end_date: string;
}

export interface AmortizationScenario {
  name: string;
  installments: CalculatedInstallment[];
  summary: AmortizationScenarioSummary;
}

export interface AmortizationComparison {
  interest_saved: number;
  months_reduced: number;
  total_saved: number;
  roi_percentage: number;
}

export interface AmortizationSimulationResponse {
  scenarios: AmortizationScenario[];
  comparison?: AmortizationComparison;
}
