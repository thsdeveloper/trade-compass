'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceDialogs } from '@/contexts/FinanceDialogContext';
import { financeApi } from '@/lib/finance-api';
import type { UpcomingPayment } from '@/types/finance';

interface NotificationContextType {
  /** Notificacoes para hoje (days_until_due <= 0) */
  todayNotifications: UpcomingPayment[];
  /** Notificacoes para amanha (days_until_due === 1) */
  tomorrowNotifications: UpcomingPayment[];
  /** Total de notificacoes */
  count: number;
  /** Loading state */
  loading: boolean;
  /** Recarrega as notificacoes */
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { dataVersion } = useFinanceDialogs();
  const [todayNotifications, setTodayNotifications] = useState<UpcomingPayment[]>([]);
  const [tomorrowNotifications, setTomorrowNotifications] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!session?.access_token) {
      setTodayNotifications([]);
      setTomorrowNotifications([]);
      return;
    }

    setLoading(true);
    try {
      // Busca pagamentos proximos (API pode retornar mais do que precisamos)
      const payments = await financeApi.getUpcomingPayments(session.access_token, { days: 2 });

      // Filtra apenas: vencidos (days_until_due < 0), hoje (= 0), amanha (= 1)
      const relevantPayments = payments.filter((p) => p.days_until_due <= 1);

      // Separa por dias ate vencimento
      // Hoje: inclui vencidos (< 0) e vence hoje (= 0)
      const today = relevantPayments.filter((p) => p.days_until_due <= 0);
      // Amanha: apenas vence amanha (= 1)
      const tomorrow = relevantPayments.filter((p) => p.days_until_due === 1);

      setTodayNotifications(today);
      setTomorrowNotifications(tomorrow);
    } catch (error) {
      console.error('Erro ao carregar notificacoes:', error);
      setTodayNotifications([]);
      setTomorrowNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Carrega ao autenticar e quando dataVersion muda
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, dataVersion]);

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    if (!session?.access_token) return;

    const interval = setInterval(fetchNotifications, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [session?.access_token, fetchNotifications]);

  const count = useMemo(
    () => todayNotifications.length + tomorrowNotifications.length,
    [todayNotifications.length, tomorrowNotifications.length]
  );

  const value = useMemo(
    () => ({
      todayNotifications,
      tomorrowNotifications,
      count,
      loading,
      refresh: fetchNotifications,
    }),
    [todayNotifications, tomorrowNotifications, count, loading, fetchNotifications]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  return context;
}
