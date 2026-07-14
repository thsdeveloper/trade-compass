'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { WaitlistForm } from './WaitlistForm';

const trustPoints = [
  'Acesso antecipado por ordem de chegada',
  'Sem spam — só o convite',
  'iOS e Android em breve',
];

export function WaitlistHero() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-background.png"
          alt="Pessoa relaxada gerenciando finanças"
          fill
          className="object-cover object-center"
          priority
          quality={90}
        />
        {/* Gradient overlay for better text readability on the left */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/20" />
        {/* Additional overlay at top for header */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/80 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-40 pb-20 lg:pb-32 min-h-screen flex items-center">
        <div className="max-w-2xl">
          <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-1.5 text-sm font-medium text-sky-200 backdrop-blur-sm">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-300" />
            </span>
            Lista de espera aberta
          </p>

          <h1
            className="animate-rise mt-6 font-bold tracking-tight text-white leading-[1.08] [text-wrap:balance]"
            style={{ fontSize: 'clamp(2.5rem, 1.5rem + 4.5vw, 4.25rem)' }}
          >
            Seu dinheiro tem direção.
            <br />
            <span className="text-sky-300">A bússola é aqui.</span>
          </h1>

          <p className="animate-rise-delayed mt-6 text-lg sm:text-xl text-slate-200 max-w-lg leading-relaxed">
            Transações, regra 50/30/20, metas e investimentos em um só lugar — no navegador e, em
            breve, no seu bolso. Entre na lista e garanta seu acesso antecipado.
          </p>

          <div id="waitlist" className="animate-rise-delayed-2 mt-8 max-w-xl scroll-mt-28">
            <WaitlistForm source="landing_hero" />
          </div>

          {/* Trust indicators */}
          <div className="animate-rise-delayed-2 mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-300">
            {trustPoints.map((point) => (
              <div key={point} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
