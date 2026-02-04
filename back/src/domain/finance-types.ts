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
  budget_category?: BudgetCategory;
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
  bank_id?: string;
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
  initial_balance?: number;
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
  available_limit?: number;
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
  type?: TransactionType;
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
  search?: string;
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

export interface CreateGoalContributionDTO {
  amount: number;
  contribution_date: string;
  description?: string;
}

export interface UpdateGoalContributionDTO {
  amount?: number;
  contribution_date?: string;
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

// ==================== FIXED INCOME ENUMS ====================

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

// ==================== FIXED INCOME DTOs ====================

export interface CreateFixedIncomeDTO {
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

export interface UpdateFixedIncomeDTO {
  investment_type?: FixedIncomeType;
  name?: string;
  issuer?: string;
  rate_type?: FixedIncomeRateType;
  rate_value?: number;
  rate_index?: FixedIncomeRateIndex;
  rate_spread?: number;
  amount_invested?: number;
  current_value?: number;
  minimum_investment?: number;
  purchase_date?: string;
  maturity_date?: string;
  liquidity_type?: FixedIncomeLiquidity;
  market?: FixedIncomeMarket;
  status?: FixedIncomeStatus;
  broker?: string;
  custody_account?: string;
  notes?: string;
  goal_id?: string | null;
}

// ==================== FIXED INCOME FILTERS ====================

export interface FixedIncomeFilters {
  investment_type?: FixedIncomeType;
  status?: FixedIncomeStatus;
  rate_type?: FixedIncomeRateType;
  search?: string;
  limit?: number;
  offset?: number;
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

export interface CreateFixedIncomeContributionDTO {
  amount: number;
  contribution_date: string;
  description?: string;
}

export interface UpdateFixedIncomeContributionDTO {
  amount?: number;
  contribution_date?: string;
  description?: string;
}

export interface FixedIncomeWithContributions extends FixedIncomeWithYield {
  contributions_count: number;
  total_contributions: number;
}

// ==================== MORTGAGE ENUMS ====================

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
  amortization_amount: number;
  interest_amount: number;
  mip_insurance: number;
  dfi_insurance: number;
  admin_fee: number;
  tr_adjustment: number;
  total_amount: number;
  balance_before: number;
  balance_after: number;
  status: MortgageInstallmentStatus;
  payment_date: string | null;
  paid_amount: number | null;
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

// ==================== MORTGAGE DTOs ====================

export interface CreateMortgageDTO {
  contract_number: string;
  institution_name: string;
  institution_bank_id?: string;
  modality?: MortgageModality;
  amortization_system?: MortgageAmortizationSystem;
  property_value: number;
  financed_amount: number;
  down_payment?: number;
  base_annual_rate: number;
  reduced_annual_rate?: number;
  rate_index?: MortgageRateIndex;
  is_reduced_rate_active?: boolean;
  total_installments: number;
  contract_start_date: string;
  first_installment_date: string;
  mip_rate?: number;
  dfi_rate?: number;
  admin_fee?: number;
  alert_days_before?: number;
  notes?: string;
}

export interface UpdateMortgageDTO {
  contract_number?: string;
  institution_name?: string;
  institution_bank_id?: string | null;
  modality?: MortgageModality;
  base_annual_rate?: number;
  reduced_annual_rate?: number | null;
  is_reduced_rate_active?: boolean;
  mip_rate?: number | null;
  dfi_rate?: number | null;
  admin_fee?: number;
  status?: MortgageStatus;
  alert_days_before?: number;
  notes?: string | null;
}

export interface PayInstallmentDTO {
  paid_amount?: number;
  payment_date?: string;
  notes?: string;
}

export interface CreateExtraPaymentDTO {
  payment_date: string;
  amount: number;
  payment_type: MortgageExtraPaymentType;
  notes?: string;
}

export interface SimulateExtraPaymentDTO {
  amount: number;
  payment_type: MortgageExtraPaymentType;
}

export interface CreateMortgageDocumentDTO {
  category: MortgageDocumentCategory;
  name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  reference_year?: number;
  notes?: string;
}

// ==================== MORTGAGE FILTERS ====================

export interface MortgageFilters {
  status?: MortgageStatus;
  limit?: number;
  offset?: number;
}

export interface MortgageInstallmentFilters {
  status?: MortgageInstallmentStatus;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// ==================== MORTGAGE RESPONSES ====================

export interface MortgageWithProgress extends MortgageWithBank {
  remaining_installments: number;
  progress_percentage: number;
  next_installment?: MortgageInstallment | null;
  total_paid: number;
  total_interest_paid: number;
  total_amortization_paid: number;
}

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

// ==================== INSTALLMENT CALCULATION ====================

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
