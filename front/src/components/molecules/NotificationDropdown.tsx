'use client';

import { Bell, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CategoryIcon } from '@/components/atoms/CategoryIcon';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatCurrency } from '@/types/finance';
import type { UpcomingPayment } from '@/types/finance';

function formatMonth(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface NotificationItemProps {
  payment: UpcomingPayment;
  onClick: () => void;
}

function NotificationItem({ payment, onClick }: NotificationItemProps) {
  const isOverdue = payment.days_until_due < 0;

  return (
    <DropdownMenuItem
      className="flex cursor-pointer items-start gap-3 px-3 py-2 focus:bg-slate-50"
      onClick={onClick}
    >
      <CategoryIcon
        icon={payment.category.icon}
        color={payment.category.color}
        size="sm"
        withBackground
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-slate-900">
            {payment.description}
          </span>
          <span className={cn(
            'shrink-0 text-sm font-medium tabular-nums',
            isOverdue ? 'text-red-600' : 'text-slate-700'
          )}>
            {formatCurrency(payment.amount)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-slate-400">
            {payment.category.name}
          </span>
          {isOverdue && (
            <span className="shrink-0 text-xs font-medium text-red-600">
              VENCIDO
            </span>
          )}
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export function NotificationDropdown() {
  const router = useRouter();
  const notifications = useNotifications();

  // Se nao estiver dentro do NotificationProvider, renderiza apenas o botao
  if (!notifications) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        title="Notificacoes"
      >
        <Bell className="h-[18px] w-[18px]" />
      </Button>
    );
  }

  const { todayNotifications, tomorrowNotifications, count, loading } = notifications;

  const hasNotifications = count > 0;
  const hasTodayNotifications = todayNotifications.length > 0;
  const hasTomorrowNotifications = tomorrowNotifications.length > 0;

  const handleItemClick = (payment: UpcomingPayment) => {
    const month = formatMonth(payment.due_date);
    router.push(`/financas/transacoes?month=${month}&status=PENDENTE&urgent=true`);
  };

  const handleViewAll = () => {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    router.push(`/financas/transacoes?month=${month}&status=PENDENTE&urgent=true`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          title="Notificacoes"
        >
          <Bell className="h-[18px] w-[18px]" />
          {hasNotifications && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex items-center justify-center',
                'h-4 min-w-4 rounded-full bg-destructive px-1',
                'font-mono text-[10px] font-medium leading-none text-white',
                'animate-in fade-in-0 zoom-in-50 duration-150'
              )}
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Proximos vencimentos
        </DropdownMenuLabel>

        {loading && !hasNotifications && (
          <div className="px-3 py-6 text-center text-sm text-slate-400">
            Carregando...
          </div>
        )}

        {!loading && !hasNotifications && (
          <div className="px-3 py-6 text-center text-sm text-slate-400">
            Nenhuma transacao pendente
          </div>
        )}

        {hasTodayNotifications && (
          <>
            <DropdownMenuLabel className="px-3 py-1.5 text-xs font-medium text-slate-500">
              Hoje
            </DropdownMenuLabel>
            {todayNotifications.map((payment) => (
              <NotificationItem
                key={payment.id}
                payment={payment}
                onClick={() => handleItemClick(payment)}
              />
            ))}
          </>
        )}

        {hasTodayNotifications && hasTomorrowNotifications && (
          <DropdownMenuSeparator />
        )}

        {hasTomorrowNotifications && (
          <>
            <DropdownMenuLabel className="px-3 py-1.5 text-xs font-medium text-slate-500">
              Amanha
            </DropdownMenuLabel>
            {tomorrowNotifications.map((payment) => (
              <NotificationItem
                key={payment.id}
                payment={payment}
                onClick={() => handleItemClick(payment)}
              />
            ))}
          </>
        )}

        {hasNotifications && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium text-slate-600 focus:bg-slate-50 focus:text-slate-900"
              onClick={handleViewAll}
            >
              Ver todas pendentes
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
