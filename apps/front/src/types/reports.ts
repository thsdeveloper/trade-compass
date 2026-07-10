// ==================== REPORT TYPES ====================

export type ReportType =
  | 'cash-flow'
  | 'budget-analysis'
  | 'category-breakdown'
  | 'payment-methods'
  | 'goals-progress'
  | 'recurring-analysis'
  | 'yoy-comparison';

export type ReportPeriod = '3m' | '6m' | '12m';

// ==================== DATE PRESETS ====================

export type DatePreset =
  | 'today'
  | '1w'
  | '2w'
  | '1m'
  | '3m'
  | '6m'
  | '12m'
  | 'ytd'
  | 'current_month'
  | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportDateFilter {
  preset: DatePreset | null;
  customYear?: number;
  dateRange: DateRange;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export const DATE_PRESET_CONFIG: { key: DatePreset; label: string; short: string }[] = [
  { key: 'today', label: 'Hoje', short: 'Hoje' },
  { key: '1w', label: '7 dias', short: '7d' },
  { key: '2w', label: '15 dias', short: '15d' },
  { key: '1m', label: '1 mes', short: '1m' },
  { key: '3m', label: '3 meses', short: '3m' },
  { key: '6m', label: '6 meses', short: '6m' },
  { key: '12m', label: '12 meses', short: '12m' },
  { key: 'ytd', label: 'YTD', short: 'YTD' },
  { key: 'current_month', label: 'Mes atual', short: 'Mes atual' },
];

// ==================== COMMON FILTERS ====================

export interface ReportFilters {
  period: ReportPeriod;
  start_date?: string;
  end_date?: string;
  include_pending?: boolean;
}

// ==================== CASH FLOW REPORT ====================

export interface CashFlowReportData {
  period: string;
  data: CashFlowReportPoint[];
  totals: {
    total_income: number;
    total_expenses: number;
    net_balance: number;
    average_monthly_income: number;
    average_monthly_expenses: number;
  };
}

export interface CashFlowReportPoint {
  month: string;
  month_label: string;
  income: number;
  expenses: number;
  balance: number;
  cumulative_balance: number;
}

// ==================== BUDGET ANALYSIS REPORT ====================

export interface BudgetAnalysisReportData {
  period: string;
  months: BudgetAnalysisMonth[];
  average: {
    essencial: number;
    estilo_vida: number;
    investimento: number;
  };
  trend: 'improving' | 'stable' | 'worsening';
}

export interface BudgetAnalysisMonth {
  month: string;
  month_label: string;
  total_income: number;
  allocations: {
    essencial: BudgetAllocationData;
    estilo_vida: BudgetAllocationData;
    investimento: BudgetAllocationData;
  };
}

export interface BudgetAllocationData {
  amount: number;
  percentage: number;
  ideal_percentage: number;
  status: 'on_track' | 'over_budget' | 'under_budget';
}

// ==================== CATEGORY BREAKDOWN REPORT ====================

export interface CategoryBreakdownReportData {
  period: string;
  categories: CategoryBreakdownItem[];
  top_categories: TopCategoryTrend[];
  total_expenses: number;
  comparison?: {
    previous_period_total: number;
    change_percentage: number;
  };
}

export interface CategoryBreakdownItem {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  percentage: number;
  transaction_count: number;
}

export interface TopCategoryTrend {
  category_id: string;
  category_name: string;
  category_color: string;
  monthly_data: {
    month: string;
    amount: number;
  }[];
}

// ==================== PAYMENT METHODS REPORT ====================

export interface PaymentMethodsReportData {
  period: string;
  summary: {
    total_account_payments: number;
    total_card_payments: number;
    account_percentage: number;
    card_percentage: number;
  };
  accounts: PaymentMethodItem[];
  credit_cards: CreditCardUsageItem[];
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  color: string;
  total: number;
  percentage: number;
  transaction_count: number;
}

export interface CreditCardUsageItem {
  id: string;
  name: string;
  brand: string;
  color: string;
  total_limit: number;
  used_amount: number;
  usage_percentage: number;
  transaction_count: number;
}

// ==================== GOALS PROGRESS REPORT ====================

export interface GoalsProgressReportData {
  goals: GoalProgressItem[];
  summary: {
    total_goals: number;
    active_goals: number;
    completed_goals: number;
    at_risk_goals: number;
    total_target: number;
    total_contributed: number;
    overall_progress: number;
  };
}

export interface GoalProgressItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  target_amount: number;
  current_amount: number;
  progress_percentage: number;
  deadline: string | null;
  status: string;
  is_at_risk: boolean;
  projected_completion: string | null;
  monthly_contributions: {
    month: string;
    amount: number;
  }[];
}

// ==================== RECURRING ANALYSIS REPORT ====================

export interface RecurringAnalysisReportData {
  summary: {
    total_fixed: number;
    total_variable: number;
    fixed_percentage: number;
    variable_percentage: number;
    total_recurrences: number;
    active_recurrences: number;
  };
  recurrences: RecurrenceItem[];
  income_commitment: number;
}

export interface RecurrenceItem {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  is_active: boolean;
  type: 'RECEITA' | 'DESPESA';
}

// ==================== YOY COMPARISON REPORT ====================

export interface YoYComparisonReportData {
  years: number[];
  monthly_comparison: YoYMonthData[];
  yearly_totals: YoYYearTotal[];
}

export interface YoYMonthData {
  month: number;
  month_label: string;
  data: Record<number, {
    income: number;
    expenses: number;
    balance: number;
  }>;
}

export interface YoYYearTotal {
  year: number;
  total_income: number;
  total_expenses: number;
  total_balance: number;
  average_monthly_income: number;
  average_monthly_expenses: number;
}

// ==================== LABELS ====================

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  'cash-flow': 'Fluxo de Caixa',
  'budget-analysis': 'Analise de Orcamento',
  'category-breakdown': 'Gastos por Categoria',
  'payment-methods': 'Formas de Pagamento',
  'goals-progress': 'Progresso dos Objetivos',
  'recurring-analysis': 'Gastos Fixos vs Variaveis',
  'yoy-comparison': 'Comparativo Anual',
};

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  '3m': '3 meses',
  '6m': '6 meses',
  '12m': '12 meses',
};

export const MONTH_LABELS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];
