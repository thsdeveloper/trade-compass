import { useCallback, useEffect, useRef, useState } from 'react';

import { getTransactions } from '@/lib/finance-api';
import { useFinance } from '@/contexts/FinanceContext';

export interface SpendingPoint {
  /** Gasto acumulado até o dia (R$) */
  value: number;
  /** Dia do mês (1..31), usado no tooltip */
  day: number;
}

interface MonthlySpendingSeries {
  points: SpendingPoint[];
  total: number;
  /** Despesas reais ainda sem um bucket do orçamento 50-30-20. */
  uncategorizedTotal: number;
  isLoading: boolean;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Série diária acumulada de despesas do mês (curva "gastos do mês").
 * Meses passados cobrem o mês inteiro; o mês corrente vai até hoje.
 */
export function useMonthlySpendingSeries(month: Date): MonthlySpendingSeries {
  const { dataVersion, accounts } = useFinance();
  const [points, setPoints] = useState<SpendingPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [uncategorizedTotal, setUncategorizedTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;

  // Mesmo critério do resumo/orçamento do backend: contas de INVESTIMENTO e
  // BENEFICIO ficam fora do "gasto do mês". Chave estável (ids ordenados) para
  // não refazer a busca quando só os saldos das contas mudam.
  const excludedAccountsKey = accounts
    .filter((a) => a.type === 'INVESTIMENTO' || a.type === 'BENEFICIO')
    .map((a) => a.id)
    .sort()
    .join(',');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
      const lastDayOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const today = new Date();
      const isCurrentMonth =
        today.getFullYear() === month.getFullYear() &&
        today.getMonth() === month.getMonth();
      const lastDay = isCurrentMonth ? today.getDate() : lastDayOfMonth.getDate();

      const transactions = await getTransactions({
        start_date: toIsoDate(firstDay),
        end_date: toIsoDate(lastDayOfMonth),
        type: 'DESPESA',
        limit: 500,
      });

      const excludedAccountIds = new Set(
        excludedAccountsKey ? excludedAccountsKey.split(',') : []
      );

      const byDay = new Map<number, number>();
      let uncategorized = 0;
      for (const transaction of transactions) {
        // Perna de transferência entre contas próprias não é gasto: tem type
        // DESPESA no banco, mas o dinheiro só mudou de conta (o backend já a
        // exclui de todos os cálculos do dashboard — aqui é o mesmo critério)
        if (transaction.transfer_id) continue;
        // Movimentação em conta de investimento/benefício também fica fora
        if (transaction.account_id && excludedAccountIds.has(transaction.account_id)) {
          continue;
        }

        // "Ajuste de saldo" é uma correção técnica do saldo da conta, não uma
        // compra ou pagamento feito pelo usuário.
        if (transaction.category.name === 'Ajuste de saldo') continue;

        const day = parseInt(transaction.due_date.slice(8, 10), 10);
        // No mês corrente, lançamentos futuros só entram quando o dia chegar.
        if (day > lastDay) continue;

        byDay.set(day, (byDay.get(day) ?? 0) + transaction.amount);
        if (!transaction.category.budget_category) {
          uncategorized += transaction.amount;
        }
      }

      let cumulative = 0;
      const series: SpendingPoint[] = [];
      for (let day = 1; day <= lastDay; day++) {
        cumulative += byDay.get(day) ?? 0;
        series.push({ value: cumulative, day });
      }

      setPoints(series);
      setTotal(cumulative);
      setUncategorizedTotal(uncategorized);
    } catch {
      setPoints([]);
      setTotal(0);
      setUncategorizedTotal(0);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, excludedAccountsKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Mutações de transação em qualquer tela (dataVersion no FinanceContext)
  // refazem a série em silêncio — a curva/gauge atualiza sem flash de skeleton.
  const lastVersionRef = useRef(0);
  useEffect(() => {
    if (dataVersion === lastVersionRef.current) return;
    lastVersionRef.current = dataVersion;
    load({ silent: true });
  }, [dataVersion, load]);

  return { points, total, uncategorizedTotal, isLoading };
}
