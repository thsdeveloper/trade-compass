import { useCallback, useEffect, useState } from 'react';

import { getTransactions } from '@/lib/finance-api';

export interface SpendingPoint {
  /** Gasto acumulado até o dia (R$) */
  value: number;
  /** Dia do mês (1..31), usado no tooltip */
  day: number;
}

interface MonthlySpendingSeries {
  points: SpendingPoint[];
  total: number;
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
  const [points, setPoints] = useState<SpendingPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;

  const load = useCallback(async () => {
    setIsLoading(true);
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

      const byDay = new Map<number, number>();
      for (const transaction of transactions) {
        const day = parseInt(transaction.due_date.slice(8, 10), 10);
        byDay.set(day, (byDay.get(day) ?? 0) + transaction.amount);
      }

      let cumulative = 0;
      const series: SpendingPoint[] = [];
      for (let day = 1; day <= lastDay; day++) {
        cumulative += byDay.get(day) ?? 0;
        series.push({ value: cumulative, day });
      }

      setPoints(series);
      setTotal(cumulative);
    } catch {
      setPoints([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { points, total, isLoading };
}
