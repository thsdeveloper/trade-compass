'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

function SpotlightCard({ children, className, disabled = false }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || disabled) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn('relative rounded-3xl', className)}
      style={{
        '--spotlight-x': `${position.x}px`,
        '--spotlight-y': `${position.y}px`,
      } as React.CSSProperties}
    >
      {/* Spotlight gradient layer */}
      {!disabled && (
        <div
          className="absolute -inset-px pointer-events-none rounded-[inherit]"
          style={{
            background: `radial-gradient(400px 400px at var(--spotlight-x, 0px) var(--spotlight-y, 0px), rgba(139, 92, 246, 0.35), transparent 70%)`,
          }}
        />
      )}
      {/* Overlay that masks the spotlight */}
      {!disabled && (
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none bg-slate-900/90" />
      )}
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

const plans = [
  {
    name: 'Plano Gratuito',
    description: 'Para quem está começando a organizar suas finanças.',
    price: 'R$ 0',
    period: '/mês',
    features: [
      'Transações ilimitadas',
      'Planejamento 50/30/20',
      'Relatórios básicos',
      '1 conta bancária',
      '1 cartão de crédito',
      'Suporte básico',
    ],
    cta: 'Começar Grátis',
    href: '/cadastro',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Pro + IA',
    description: 'Para usuários avançados que precisam de recursos completos.',
    price: 'R$ 23',
    period: '/mês',
    features: [
      'Tudo do Gratuito +',
      'Assistente IA ilimitado',
      'Contas ilimitadas',
      'Cartões ilimitados',
      'Relatórios avançados',
      'Exportação PDF',
      'Suporte prioritário',
    ],
    cta: 'Começar Grátis',
    href: '/cadastro',
    highlighted: true,
    badge: 'Popular',
  },
  {
    name: 'Plano Business',
    description: 'Para equipes e pequenas empresas.',
    price: 'R$ 36',
    period: '/mês',
    features: [
      'Tudo do Pro +',
      'Múltiplos usuários',
      'Relatórios empresariais',
      'Compartilhamento',
      'Relatórios avançados',
    ],
    cta: 'Começar Grátis',
    href: '/cadastro',
    highlighted: false,
    badge: null,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 sm:py-32 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-500/10 blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/20 border border-violet-500/30 px-4 py-1.5 text-sm font-medium text-violet-300 mb-4">
            <Zap className="w-4 h-4" />
            Preços
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Planos Flexíveis para<br />Cada Necessidade
          </h2>
          <p className="text-lg text-slate-400">
            Seja você iniciante ou avançado, o MoneyCompass oferece planos sob medida para suas necessidades.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <SpotlightCard
              key={plan.name}
              disabled={plan.highlighted}
              className={cn(
                'flex flex-col transition-all duration-300',
                plan.highlighted
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-2xl shadow-blue-500/30 scale-105 z-10'
                  : 'ring-1 ring-white/10'
              )}
            >
              <div className="p-8 flex flex-col flex-1">
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-amber-500/30">
                      <Sparkles className="h-3.5 w-3.5" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h3
                    className={cn(
                      'text-lg font-semibold mb-2',
                      plan.highlighted ? 'text-white' : 'text-white'
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={cn(
                      'text-sm mb-4',
                      plan.highlighted ? 'text-blue-100' : 'text-slate-400'
                    )}
                  >
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        'text-4xl font-bold',
                        plan.highlighted ? 'text-white' : 'text-white'
                      )}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={cn(
                        'text-sm',
                        plan.highlighted ? 'text-blue-100' : 'text-slate-400'
                      )}
                    >
                      {plan.period}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className={cn(
                        'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
                        plan.highlighted ? 'bg-white/20' : 'bg-emerald-500/20'
                      )}>
                        <Check
                          className={cn(
                            'h-3 w-3',
                            plan.highlighted ? 'text-white' : 'text-emerald-400'
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-sm',
                          plan.highlighted ? 'text-blue-50' : 'text-slate-300'
                        )}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  asChild
                  className={cn(
                    'w-full rounded-full h-12',
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  )}
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
