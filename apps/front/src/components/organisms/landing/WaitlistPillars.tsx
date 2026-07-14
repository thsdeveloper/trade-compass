'use client';

import { Wallet, Target, TrendingUp } from 'lucide-react';

const pillars = [
  {
    icon: Wallet,
    title: 'Transações sob controle',
    description:
      'Contas, cartões, recorrências e importação de extratos. Cada centavo com categoria e destino.',
  },
  {
    icon: Target,
    title: 'Planejamento 50/30/20',
    description:
      'Orçamento que se ajusta à sua renda, metas com progresso visível e dívidas com plano de saída.',
  },
  {
    icon: TrendingUp,
    title: 'Investimentos no mesmo lugar',
    description:
      'Renda fixa, renda variável e day trade acompanhados lado a lado com as suas finanças do dia a dia.',
  },
];

export function WaitlistPillars() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-12 lg:gap-20">
          {/* Heading */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight [text-wrap:balance]">
              O que você encontra quando a porta abrir
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-md leading-relaxed">
              O MoneyCompass já funciona no navegador — a lista de espera é a fila do app mobile e
              das próximas vagas da plataforma.
            </p>
          </div>

          {/* Pillars as a divided list, not a card grid */}
          <ul className="divide-y divide-slate-200">
            {pillars.map((pillar) => (
              <li key={pillar.title} className="flex gap-5 py-7 first:pt-0 last:pb-0">
                <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
                  <pillar.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{pillar.title}</h3>
                  <p className="mt-1.5 text-base text-slate-600 leading-relaxed max-w-prose">
                    {pillar.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
