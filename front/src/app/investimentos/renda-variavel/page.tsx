'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import {
  CandlestickChart,
  BarChart3,
  Eye,
  Bell,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    id: 'daytrade',
    title: 'Day Trade',
    description: 'Registre e analise suas operacoes de day trade em mini contratos futuros (WINFUT, WDOFUT).',
    icon: CandlestickChart,
    href: '/investimentos/renda-variavel/daytrade',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'backtest',
    title: 'Backtest',
    description: 'Teste estrategias de trading com dados historicos e analise a performance.',
    icon: BarChart3,
    href: '/investimentos/renda-variavel/backtest',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'watchlist',
    title: 'Watchlist',
    description: 'Acompanhe ativos de interesse e monitore oportunidades de entrada.',
    icon: Eye,
    href: '/investimentos/renda-variavel/watchlist',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'alertas',
    title: 'Alertas',
    description: 'Configure alertas de preco e receba notificacoes de oportunidades.',
    icon: Bell,
    href: '/investimentos/renda-variavel/alertas',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
];

export default function RendaVariavelPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <PageShell>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">Renda Variavel</h1>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Gerencie suas operacoes de trading e investimentos em renda variavel
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.id}
                href={feature.href}
                className="group rounded-lg border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      feature.bgColor
                    )}
                  >
                    <Icon className={cn('h-5 w-5', feature.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold tracking-tight">
                        {feature.title}
                      </h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
