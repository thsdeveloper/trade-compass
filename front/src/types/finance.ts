// ==================== ENUMS ====================

export type FinanceCategoryType =
  | 'MORADIA'
  | 'ALIMENTACAO'
  | 'TRANSPORTE'
  | 'SAUDE'
  | 'LAZER'
  | 'EDUCACAO'
  | 'VESTUARIO'
  | 'SERVICOS'
  | 'INVESTIMENTOS'
  | 'SALARIO'
  | 'FREELANCE'
  | 'DIVIDA'
  | 'BENEFICIO'
  | 'OUTROS';

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
  MORADIA: 'Moradia',
  ALIMENTACAO: 'Alimentacao',
  TRANSPORTE: 'Transporte',
  SAUDE: 'Saude',
  LAZER: 'Lazer',
  EDUCACAO: 'Educacao',
  VESTUARIO: 'Vestuario',
  SERVICOS: 'Servicos',
  INVESTIMENTOS: 'Investimentos',
  SALARIO: 'Salario',
  FREELANCE: 'Freelance',
  DIVIDA: 'Divida',
  BENEFICIO: 'Beneficio',
  OUTROS: 'Outros',
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

// Item unificado do histórico (transação ou manual)
export interface GoalContributionItem {
  id: string;
  type: 'transaction' | 'manual';
  amount: number;
  date: string;
  description: string;
  status?: string; // Apenas para transações
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
