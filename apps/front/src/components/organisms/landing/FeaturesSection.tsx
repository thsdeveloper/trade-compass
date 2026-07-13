'use client';

import {
  TrendingUp,
  PieChart,
  Receipt,
  Target,
  CreditCard,
  FileBarChart,
  Sparkles,
  Check,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

const gridFeatures = [
  {
    icon: Receipt,
    title: 'Gestão de Transações',
    description: 'Lançamentos completos com parcelamento e recorrências automáticas.',
  },
  {
    icon: PieChart,
    title: 'Planejamento 50/30/20',
    description: 'Orçamento dividido entre necessidades, desejos e poupança, calculado para você.',
  },
  {
    icon: Target,
    title: 'Metas Financeiras',
    description: '7 categorias de objetivos com acompanhamento de progresso.',
  },
  {
    icon: CreditCard,
    title: 'Cartões e Faturas',
    description: 'Múltiplos cartões, faturas e limites em um só lugar.',
  },
  {
    icon: FileBarChart,
    title: '7 Tipos de Relatórios',
    description: 'Fluxo de caixa, orçamento, categorias, metas e comparativo anual.',
  },
  {
    icon: TrendingUp,
    title: 'Investimentos',
    description: 'Acompanhe CDB, LCI, LCA, Tesouro e a evolução da sua carteira.',
  },
];

const importedTransactions = [
  { name: 'Supermercado Pão de Açúcar', category: 'Alimentação', amount: '-R$ 234,90' },
  { name: 'PIX recebido — Salário', category: 'Renda', amount: '+R$ 4.500,00' },
  { name: 'Conta de luz — Enel', category: 'Moradia', amount: '-R$ 187,45' },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 py-20 sm:py-32 bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 relative overflow-hidden"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 [text-wrap:balance]">
            Menos planilha, mais clareza.
          </h2>
          <p className="text-lg text-slate-300 max-w-xl">
            Do extrato bruto ao relatório pronto: o MoneyCompass organiza suas finanças de ponta a
            ponta.
          </p>
        </div>

        {/* Bento grid layout */}
        <div className="grid lg:grid-cols-3 gap-6 mb-20 sm:mb-28">
          {/* Importação com IA */}
          <SpotlightCard>
            <div className="p-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-6 bg-blue-500/20">
                <Sparkles className="h-7 w-7 text-blue-300" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Importe o extrato, a IA faz o resto</h3>
              <p className="text-slate-300 mb-6">
                Envie o PDF ou CSV do banco. As transações chegam categorizadas, com transferências
                correlacionadas.
              </p>

              {/* Mini mockup: extrato importado */}
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-300">extrato-junho.pdf</span>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <Check className="h-3 w-3" /> 42 transações
                  </span>
                </div>
                <div className="space-y-2">
                  {importedTransactions.map((tx) => (
                    <div
                      key={tx.name}
                      className="bg-slate-800 rounded-xl px-3 py-2 border border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{tx.name}</p>
                        <p className="text-[10px] text-slate-400">{tx.category}</p>
                      </div>
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          tx.amount.startsWith('+') ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* Relatórios */}
          <SpotlightCard>
            <div className="p-8 flex flex-col h-full">
              <div className="flex-1">
                {/* Dashboard preview */}
                <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700 p-4 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-20 bg-slate-700 rounded" />
                      <div className="h-3 w-16 bg-blue-500/30 rounded" />
                    </div>
                    <div className="flex items-end gap-2 h-24">
                      {[60, 80, 45, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 flex items-end bg-slate-700/60 rounded-lg overflow-hidden h-full">
                          <div
                            className="w-full bg-blue-500 rounded-lg"
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Relatórios que respondem</h3>
                <p className="text-slate-300">
                  Fluxo de caixa, gastos por categoria, evolução de metas: 7 visões prontas, sem
                  montar planilha.
                </p>
              </div>
            </div>
          </SpotlightCard>

          {/* 50/30/20 */}
          <SpotlightCard>
            <div className="p-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-6 bg-emerald-500/20">
                <PieChart className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Orçamento 50/30/20 automático</h3>
              <p className="text-slate-300 mb-6">
                Sua renda dividida entre necessidades, desejos e poupança — e o quanto de cada faixa
                você já usou no mês.
              </p>

              {/* Mini mockup: faixas do orçamento */}
              <div className="space-y-4">
                {[
                  { label: 'Necessidades', pct: 50, used: 72, color: 'bg-blue-500' },
                  { label: 'Desejos', pct: 30, used: 41, color: 'bg-sky-400' },
                  { label: 'Poupança', pct: 20, used: 100, color: 'bg-emerald-400' },
                ].map((band) => (
                  <div key={band.label}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-200">
                        {band.label} <span className="text-slate-400">· {band.pct}%</span>
                      </span>
                      <span className="text-slate-400">{band.used}% usado</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700/70 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${band.color}`}
                        style={{ width: `${band.used}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Features list */}
        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {gridFeatures.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div key={feature.title} className="flex gap-4">
                <div className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-400/20">
                  <IconComponent className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-[36ch]">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
