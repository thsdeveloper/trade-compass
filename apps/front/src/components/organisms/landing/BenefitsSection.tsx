'use client';

import {
  Eye,
  Bell,
  Mail,
  Calculator,
  Smartphone,
  ShieldCheck,
  Check,
} from 'lucide-react';

const benefits = [
  {
    icon: Eye,
    title: 'Visão completa em um só lugar',
    description: 'Contas, cartões, investimentos e metas num dashboard unificado.',
  },
  {
    icon: Bell,
    title: 'Alertas de vencimentos',
    description: 'Lembretes automáticos para nunca mais atrasar uma conta.',
  },
  {
    icon: Mail,
    title: 'Relatórios por email',
    description: 'PDFs completos direto na sua caixa de entrada, quando quiser.',
  },
  {
    icon: Calculator,
    title: 'Metodologia 50/30/20',
    description: 'Planejamento baseado em metodologia comprovada de orçamento.',
  },
  {
    icon: Smartphone,
    title: 'Em qualquer dispositivo',
    description: 'Computador, tablet ou celular — dados sempre sincronizados.',
  },
  {
    icon: ShieldCheck,
    title: 'Dados seguros e privados',
    description: 'Criptografia e as melhores práticas de segurança do mercado.',
  },
];

export function BenefitsSection() {
  return (
    <section className="py-20 sm:py-32 bg-slate-50 relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Visual */}
          <div className="relative order-2 lg:order-1">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main visual - Browser mockup */}
              <div className="rounded-2xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                {/* Browser bar */}
                <div className="bg-slate-100 px-4 py-3 flex items-center gap-3 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="h-7 bg-white rounded-lg border border-slate-200 px-3 flex items-center max-w-xs">
                      <span className="text-xs text-slate-500">moneycompass.app/financas</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="p-6 bg-slate-50">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] text-slate-500 mb-1">Saldo total</p>
                      <p className="text-lg font-bold text-slate-900">R$ 24.580</p>
                      <span className="text-[10px] text-emerald-600">+12,5%</span>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] text-slate-500 mb-1">Despesas</p>
                      <p className="text-lg font-bold text-slate-900">R$ 3.240</p>
                      <span className="text-[10px] text-red-500">-8,2%</span>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <p className="text-[10px] text-slate-500 mb-1">Economia</p>
                      <p className="text-lg font-bold text-slate-900">R$ 2.340</p>
                      <span className="text-[10px] text-emerald-600">+23,1%</span>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-medium text-slate-900">Gastos por categoria</p>
                      <p className="text-[10px] text-slate-500">Este mês</p>
                    </div>
                    <div className="flex items-end gap-3 h-24">
                      {[
                        { height: 60, label: 'Casa' },
                        { height: 80, label: 'Comida' },
                        { height: 45, label: 'Transporte' },
                        { height: 90, label: 'Lazer' },
                        { height: 55, label: 'Saúde' },
                        { height: 70, label: 'Outros' },
                      ].map((bar, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <div
                            className={`w-full rounded-t-lg ${i === 3 ? 'bg-blue-600' : 'bg-blue-200'}`}
                            style={{ height: `${bar.height}%` }}
                          />
                          <span className="text-[8px] text-slate-500">{bar.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -right-4 top-20 animate-float">
                <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-900">Meta atingida!</p>
                    <p className="text-[8px] text-slate-500">Economia mensal</p>
                  </div>
                </div>
              </div>

              {/* Decorative element */}
              <div className="absolute -z-10 -bottom-4 -left-4 w-full h-full rounded-2xl bg-blue-100/60" />
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 [text-wrap:balance]">
              Por que escolher o MoneyCompass?
            </h2>
            <p className="text-lg text-slate-600 mb-10 max-w-lg">
              Desenvolvido para quem quer controle real sobre as próprias finanças, sem complicação.
            </p>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-7">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex gap-3.5">
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center">
                    <benefit.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">{benefit.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
