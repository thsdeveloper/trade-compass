'use client';

import { UserPlus, Settings, Receipt, BarChart3 } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    step: '1',
    title: 'Crie sua conta',
    description: 'Cadastre-se em menos de 1 minuto. Sem cartão de crédito.',
  },
  {
    icon: Settings,
    step: '2',
    title: 'Configure suas contas',
    description: 'Adicione contas bancárias, cartões e defina suas categorias.',
  },
  {
    icon: Receipt,
    step: '3',
    title: 'Registre transações',
    description: 'Importe o extrato com IA ou lance manualmente com recorrências.',
  },
  {
    icon: BarChart3,
    step: '4',
    title: 'Acompanhe resultados',
    description: 'Relatórios, metas e orçamento atualizados a cada lançamento.',
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 py-20 sm:py-32 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 [text-wrap:balance]">
            Do zero ao controle em 4 passos
          </h2>
          <p className="text-lg text-slate-600 max-w-xl">
            Nada de configuração complicada: em poucos minutos suas finanças já estão organizadas.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={step.step} className="group relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-slate-300 to-transparent z-0" />
              )}

              <div className="relative bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-0.5 transition-all duration-300 h-full">
                {/* Step number */}
                <span className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                  {step.step}
                </span>

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <step.icon className="w-7 h-7 text-blue-600" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
