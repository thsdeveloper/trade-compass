// ==================== ENUMS ====================

export type FinanceCategoryType = 'DESPESA' | 'RECEITA';

export type FinanceAccountType =
  | 'CONTA_CORRENTE'
  | 'POUPANCA'
  | 'CARTEIRA'
  | 'INVESTIMENTO';

export type TransactionType = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';

export type TransactionStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';

export type BudgetCategory = 'ESSENCIAL' | 'ESTILO_VIDA' | 'INVESTIMENTO';

// ==================== ENTITIES ====================

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
}

// ==================== FORM DATA ====================

export interface TransactionFormData {
  category_id: string;
  account_id?: string;
  type: TransactionType;
  description: string;
  amount: number;
  due_date: string;
  notes?: string;
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

export const ACCOUNT_TYPE_LABELS: Record<FinanceAccountType, string> = {
  CONTA_CORRENTE: 'Conta Corrente',
  POUPANCA: 'Poupanca',
  CARTEIRA: 'Carteira',
  INVESTIMENTO: 'Investimento',
};

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
  category: FinanceCategory;
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
