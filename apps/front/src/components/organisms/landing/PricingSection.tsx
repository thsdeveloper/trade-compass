'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SpotlightCard } from './SpotlightCard';

const plans = [
  {
    name: 'Essencial',
    description: 'Organização completa das finanças, sem IA.',
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
    cta: 'Começar grátis',
    href: '/cadastro',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Pro + IA',
    description: 'O controle completo, com inteligência artificial.',
    price: 'R$ 23',
    period: '/mês',
    features: [
      'Tudo do Essencial +',
      'Assistente IA ilimitado',
      'Importação de extratos com IA',
      'Contas e cartões ilimitados',
      'Relatórios avançados',
      'Exportação em PDF',
      'Suporte prioritário',
    ],
    cta: 'Assinar o Pro',
    href: '/cadastro',
    highlighted: true,
    badge: 'Mais popular',
  },
  {
    name: 'Enterprise',
    description: 'Para empresas e equipes que precisam de escala.',
    price: 'Sob consulta',
    period: '',
    features: [
      'Tudo do Pro +',
      'Múltiplos usuários',
      'Relatórios empresariais',
      'Compartilhamento entre contas',
      'Suporte dedicado',
    ],
    cta: 'Falar com a gente',
    href: 'mailto:contato@moneycompass.app',
    highlighted: false,
    badge: null,
  },
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="scroll-mt-20 py-20 sm:py-32 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 [text-wrap:balance]">
            Comece grátis. Evolua quando precisar.
          </h2>
          <p className="text-lg text-slate-300">
            O plano gratuito não expira. Os pagos existem para quando suas finanças pedirem mais.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <SpotlightCard
              key={plan.name}
              disabled={plan.highlighted}
              className={cn(
                'flex flex-col rounded-3xl transition-all duration-300',
                plan.highlighted
                  ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/30 md:scale-105 z-10 ring-0'
                  : ''
              )}
            >
              <div className="p-8 flex flex-col flex-1">
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2 text-white">{plan.name}</h3>
                  <p
                    className={cn(
                      'text-sm mb-4',
                      plan.highlighted ? 'text-blue-100' : 'text-slate-300'
                    )}
                  >
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        'font-bold text-white',
                        plan.price.startsWith('R$') ? 'text-4xl' : 'text-3xl'
                      )}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={cn(
                        'text-sm',
                        plan.highlighted ? 'text-blue-100' : 'text-slate-300'
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
                      <div
                        className={cn(
                          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
                          plan.highlighted ? 'bg-white/20' : 'bg-emerald-500/20'
                        )}
                      >
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
                          plan.highlighted ? 'text-blue-50' : 'text-slate-200'
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
                      ? 'bg-white text-blue-700 hover:bg-blue-50'
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
