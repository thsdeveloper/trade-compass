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
  | 'OUTROS';

export type FinanceAccountType =
  | 'CONTA_CORRENTE'
  | 'POUPANCA'
  | 'CARTEIRA'
  | 'INVESTIMENTO';

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
  debt_id: string | null;
  debt_negotiation_id: string | null;
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

// Tipo parcial de categoria para JOINs
export interface RecurrenceCategoryDetails {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: FinanceCategoryType;
}

// Tipo parcial de conta para JOINs
export interface RecurrenceAccountDetails {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// Tipo parcial de cartao para JOINs
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

// ==================== DTOs ====================

// Category DTOs
export interface CreateCategoryDTO {
  name: string;
  type: FinanceCategoryType;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  budget_category?: BudgetCategory;
}

// Tag DTOs
export interface CreateTagDTO {
  name: string;
}

export interface UpdateTagDTO {
  name?: string;
  is_active?: boolean;
}

// Account DTOs
export interface CreateAccountDTO {
  name: string;
  type: FinanceAccountType;
  bank_id: string;
  initial_balance?: number;
  color?: string;
  icon?: string;
}

export interface UpdateAccountDTO {
  name?: string;
  bank_id?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
}

// Credit Card DTOs
export interface CreateCreditCardDTO {
  name: string;
  brand: CreditCardBrand;
  total_limit: number;
  closing_day: number;
  due_day: number;
  color?: string;
}

export interface UpdateCreditCardDTO {
  name?: string;
  brand?: CreditCardBrand;
  total_limit?: number;
  closing_day?: number;
  due_day?: number;
  color?: string;
  is_active?: boolean;
}

// Transaction DTOs
export interface CreateTransactionDTO {
  category_id: string;
  account_id?: string;
  credit_card_id?: string;
  goal_id?: string;
  type: TransactionType;
  description: string;
  amount: number;
  due_date: string;
  notes?: string;
  tag_ids?: string[];
}

export interface CreateInstallmentTransactionDTO {
  category_id: string;
  account_id?: string;
  credit_card_id?: string;
  type: TransactionType;
  description: string;
  total_amount: number;
  total_installments: number;
  first_due_date: string;
  notes?: string;
  tag_ids?: string[];
}

export interface UpdateTransactionDTO {
  category_id?: string;
  account_id?: string;
  credit_card_id?: string;
  goal_id?: string | null;
  description?: string;
  amount?: number;
  due_date?: string;
  notes?: string;
  tag_ids?: string[];
}

export interface PayTransactionDTO {
  paid_amount?: number;
  payment_date?: string;
  account_id?: string;
}

// Transfer DTOs
export interface CreateTransferDTO {
  source_account_id: string;
  destination_account_id: string;
  category_id: string;
  description: string;
  amount: number;
  transfer_date: string;
  notes?: string;
  goal_id?: string; // Vincular transferencia a um objetivo
}

export interface TransferResult {
  transfer_id: string;
  source_transaction: FinanceTransaction;
  destination_transaction: FinanceTransaction;
}

// Recurrence DTOs
export interface CreateRecurrenceDTO {
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

export interface UpdateRecurrenceDTO {
  category_id?: string;
  account_id?: string;
  credit_card_id?: string;
  description?: string;
  amount?: number;
  frequency?: RecurrenceFrequency;
  end_date?: string;
  is_active?: boolean;
}

// Invoice Payment DTOs
export interface PayInvoiceDTO {
  account_id: string;
  amount: number;
  invoice_month: string;
  payment_type: InvoicePaymentType;
  payment_date?: string;
  notes?: string;
}

// ==================== QUERY PARAMS ====================

export interface TransactionFilters {
  start_date?: string;
  end_date?: string;
  category_id?: string;
  account_id?: string;
  credit_card_id?: string;
  tag_id?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  limit?: number;
  offset?: number;
}

export interface InvoiceFilters {
  month: string; // YYYY-MM format
}

// ==================== RESPONSES ====================

export interface TransactionWithCategory extends FinanceTransaction {
  category: FinanceCategory;
  account?: FinanceAccount;
  credit_card?: FinanceCreditCard;
  transfer_counterpart_account?: FinanceAccount;
  tags?: FinanceTag[];
}

export interface CreditCardInvoice {
  credit_card: FinanceCreditCard;
  month: string;
  transactions: TransactionWithCategory[];
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

// ==================== DEBT ENUMS ====================

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

// ==================== DEBT DTOs ====================

export interface CreateDebtDTO {
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

export interface UpdateDebtDTO {
  creditor_name?: string;
  debt_type?: DebtType;
  original_amount?: number;
  updated_amount?: number;
  original_due_date?: string;
  status?: DebtStatus;
  contract_number?: string;
  creditor_document?: string;
  creditor_contact_phone?: string;
  creditor_contact_email?: string;
  notes?: string;
}

export interface CreateNegotiationDTO {
  payment_method: NegotiationPaymentMethod;
  total_installments?: number;
  negotiated_value: number;
  first_payment_date: string;
  protocol_number?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
}

export interface UpdateNegotiationDTO {
  payment_method?: NegotiationPaymentMethod;
  total_installments?: number;
  negotiated_value?: number;
  first_payment_date?: string;
  protocol_number?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  status?: NegotiationStatus;
}

export interface GenerateTransactionsDTO {
  category_id: string;
  account_id: string;
}

// ==================== DEBT FILTERS ====================

export interface DebtFilters {
  status?: DebtStatus;
  debt_type?: DebtType;
  creditor_name?: string;
  limit?: number;
  offset?: number;
}

// ==================== DEBT RESPONSES ====================

export interface DebtWithNegotiation extends FinanceDebt {
  active_negotiation?: FinanceDebtNegotiation | null;
}

export interface NegotiationWithDebt extends FinanceDebtNegotiation {
  debt: FinanceDebt;
}

export interface DebtSummary {
  total_debts: number;
  total_open_amount: number;
  total_negotiated_amount: number;
  debts_by_status: { status: DebtStatus; count: number; total: number }[];
}

// ==================== GOAL ENUMS ====================

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

// ==================== GOAL DTOs ====================

export interface CreateGoalDTO {
  name: string;
  description?: string;
  goal_category: FinanceGoalCategory;
  target_amount: number;
  deadline?: string;
  priority?: FinanceGoalPriority;
  linked_account_id?: string;
  icon?: string;
  color?: string;
}

export interface UpdateGoalDTO {
  name?: string;
  description?: string;
  goal_category?: FinanceGoalCategory;
  target_amount?: number;
  deadline?: string;
  priority?: FinanceGoalPriority;
  status?: FinanceGoalStatus;
  linked_account_id?: string | null;
  icon?: string;
  color?: string;
}

// ==================== GOAL FILTERS ====================

export interface GoalFilters {
  status?: FinanceGoalStatus;
  goal_category?: FinanceGoalCategory;
  priority?: FinanceGoalPriority;
  limit?: number;
  offset?: number;
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
