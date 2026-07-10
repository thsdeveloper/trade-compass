'use client';

import { UserPlus, Settings, Receipt, BarChart3, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    icon: UserPlus,
    step: '01',
    title: 'Crie sua conta',
    description: 'Cadastre-se em menos de 1 minuto. Sem cartão de crédito necessário.',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    icon: Settings,
    step: '02',
    title: 'Configure suas contas',
    description: 'Adicione contas bancárias, cartões e defina suas categorias.',
    color: 'from-violet-500 to-violet-600',
    bgColor: 'bg-violet-50',
  },
  {
    icon: Receipt,
    step: '03',
    title: 'Registre transações',
    description: 'Lance receitas e despesas manualmente ou configure recorrências.',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: BarChart3,
    step: '04',
    title: 'Acompanhe resultados',
    description: 'Visualize relatórios, acompanhe metas e tome decisões informadas.',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 sm:py-32 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-50/50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700 mb-4">
            Como começar
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Como Funciona
          </h2>
          <p className="text-lg text-slate-600">
            Comece a organizar suas finanças em 4 passos simples.
          </p>
        </div>

        {/* Steps - horizontal cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="group relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-slate-200 to-transparent z-0" />
              )}

              <div className="relative bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 h-full">
                {/* Step number */}
                <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  {step.step}
                </span>

                {/* Icon */}
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
                  step.bgColor
                )}>
                  <step.icon className={cn(
                    'w-7 h-7',
                    `text-${step.color.split(' ')[0].replace('from-', '')}`
                  )} style={{ color: step.color.includes('blue') ? '#3b82f6' : step.color.includes('violet') ? '#8b5cf6' : step.color.includes('emerald') ? '#10b981' : '#f59e0b' }} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
