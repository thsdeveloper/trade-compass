'use client';

import { useMemo } from 'react';
import { SummaryCard } from '@/components/molecules/SummaryCard';
import { Landmark, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import type { FinanceSummary, AccountWithBank } from '@/types/finance';

interface TransactionsSummaryCardsProps {
  summary: FinanceSummary;
  accounts: AccountWithBank[];
}

export function TransactionsSummaryCards({ summary, accounts }: TransactionsSummaryCardsProps) {
  const nonInvestmentBalance = useMemo(() => {
    return accounts
      .filter((account) =>
        account.type !== 'INVESTIMENTO' &&
        account.type !== 'BENEFICIO' &&
        account.is_active
      )
      .reduce((sum, account) => sum + account.current_balance, 0);
  }, [accounts]);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title="Saldo atual"
        value={nonInvestmentBalance}
        icon={Landmark}
        variant="default"
        subtitle="Contas correntes, poupanca e carteira"
      />
      <SummaryCard
        title="Receitas do mes"
        value={summary.month_income}
        icon={TrendingUp}
        variant="success"
        subtitle="Total previsto (pagas + pendentes)"
      />
      <SummaryCard
        title="Despesas do mes"
        value={summary.month_expenses}
        icon={TrendingDown}
        variant="danger"
        subtitle="Total previsto (pagas + pendentes)"
      />
      <SummaryCard
        title="Balanco mensal"
        value={summary.month_result}
        icon={Scale}
        variant="default"
        subtitle="Receitas - Despesas"
      />
    </div>
  );
}
