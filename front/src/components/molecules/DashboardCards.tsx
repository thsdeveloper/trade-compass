'use client';

import { useRouter } from 'next/navigation';
import {
  Building2,
  CreditCard,
  Wallet,
  PiggyBank,
  TrendingUp,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccountWithBank, FinanceCreditCard } from '@/types/finance';
import {
  formatCurrency,
  ACCOUNT_TYPE_LABELS,
  CREDIT_CARD_BRAND_LABELS,
} from '@/types/finance';

// Icon mapping for account types
const ACCOUNT_TYPE_ICONS: Record<string, typeof Building2> = {
  CONTA_CORRENTE: Building2,
  POUPANCA: PiggyBank,
  CARTEIRA: Wallet,
  INVESTIMENTO: TrendingUp,
};

interface AccountsCardProps {
  accounts: AccountWithBank[];
  className?: string;
}

export function AccountsCard({ accounts, className }: AccountsCardProps) {
  const router = useRouter();
  const activeAccounts = accounts.filter((a) => a.is_active);
  const totalBalance = activeAccounts.reduce((sum, a) => sum + a.current_balance, 0);

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-100">
            <Building2 className="h-3.5 w-3.5 text-slate-600" />
          </div>
          <h2 className="text-sm font-medium text-slate-900">Contas</h2>
        </div>
        <button
          onClick={() => router.push('/financas/contas')}
          className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600"
        >
          Ver todas
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
              <Building2 className="h-5 w-5 text-slate-300" />
            </div>
            <p className="mt-2 text-sm text-slate-400">Nenhuma conta cadastrada</p>
            <button
              onClick={() => router.push('/financas/contas')}
              className="mt-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Adicionar conta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Account List */}
            {activeAccounts.slice(0, 4).map((account) => {
              const Icon = ACCOUNT_TYPE_ICONS[account.type] || Building2;
              const isNegative = account.current_balance < 0;

              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {account.bank?.logo_url ? (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg border"
                        style={{ borderColor: `${account.color}30` }}
                      >
                        <img
                          src={account.bank.logo_url}
                          alt={account.bank.name}
                          className="h-5 w-5 object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: account.color }}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {account.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {account.bank?.name || ACCOUNT_TYPE_LABELS[account.type]}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium tabular-nums',
                      isNegative ? 'text-red-600' : 'text-slate-900'
                    )}
                  >
                    {formatCurrency(account.current_balance)}
                  </span>
                </div>
              );
            })}

            {/* Show more indicator */}
            {activeAccounts.length > 4 && (
              <button
                onClick={() => router.push('/financas/contas')}
                className="w-full py-1 text-center text-xs text-slate-400 hover:text-slate-600"
              >
                +{activeAccounts.length - 4} conta{activeAccounts.length - 4 > 1 ? 's' : ''}
              </button>
            )}

            {/* Total */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Saldo Total
              </span>
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  totalBalance < 0 ? 'text-red-600' : 'text-slate-900'
                )}
              >
                {formatCurrency(totalBalance)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CreditCardsCardProps {
  creditCards: FinanceCreditCard[];
  className?: string;
}

export function CreditCardsCard({ creditCards, className }: CreditCardsCardProps) {
  const router = useRouter();
  const activeCards = creditCards.filter((c) => c.is_active);

  // Calculate days until closing/due
  const getDaysUntilClosing = (closingDay: number): number => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let closingDate = new Date(currentYear, currentMonth, closingDay);
    if (currentDay >= closingDay) {
      closingDate = new Date(currentYear, currentMonth + 1, closingDay);
    }

    const diffTime = closingDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-100">
            <CreditCard className="h-3.5 w-3.5 text-slate-600" />
          </div>
          <h2 className="text-sm font-medium text-slate-900">Cartoes</h2>
        </div>
        <button
          onClick={() => router.push('/financas/cartoes')}
          className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600"
        >
          Ver todos
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
              <CreditCard className="h-5 w-5 text-slate-300" />
            </div>
            <p className="mt-2 text-sm text-slate-400">Nenhum cartao cadastrado</p>
            <button
              onClick={() => router.push('/financas/cartoes')}
              className="mt-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Adicionar cartao
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCards.slice(0, 3).map((card) => {
              const usedLimit = card.total_limit - card.available_limit;
              const usagePercent = card.total_limit > 0
                ? (usedLimit / card.total_limit) * 100
                : 0;
              const daysUntilClosing = getDaysUntilClosing(card.closing_day);
              const isHighUsage = usagePercent >= 80;

              return (
                <div key={card.id} className="space-y-2">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded"
                        style={{ backgroundColor: `${card.color}15` }}
                      >
                        <CreditCard
                          className="h-3.5 w-3.5"
                          style={{ color: card.color }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {card.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {CREDIT_CARD_BRAND_LABELS[card.brand]}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          'text-sm font-medium tabular-nums',
                          isHighUsage ? 'text-amber-600' : 'text-slate-900'
                        )}
                      >
                        {formatCurrency(usedLimit)}
                      </p>
                      <p className="text-xs tabular-nums text-slate-400">
                        de {formatCurrency(card.total_limit)}
                      </p>
                    </div>
                  </div>

                  {/* Usage Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isHighUsage ? 'bg-amber-500' : 'bg-slate-400'
                        )}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {usagePercent.toFixed(0)}% usado
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="h-3 w-3" />
                        Fecha em {daysUntilClosing}d
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Show more indicator */}
            {activeCards.length > 3 && (
              <button
                onClick={() => router.push('/financas/cartoes')}
                className="w-full py-1 text-center text-xs text-slate-400 hover:text-slate-600"
              >
                +{activeCards.length - 3} cartao{activeCards.length - 3 > 1 ? 'es' : ''}
              </button>
            )}

            {/* Available Limit Total */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Limite Disponivel
              </span>
              <span className="text-sm font-semibold tabular-nums text-emerald-600">
                {formatCurrency(
                  activeCards.reduce((sum, c) => sum + c.available_limit, 0)
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
