'use client';

import { ArrowUpRight, ArrowDownLeft, CreditCard, PiggyBank } from 'lucide-react';
import { WaitlistForm } from './WaitlistForm';

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function GooglePlayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} fill="currentColor" aria-hidden="true">
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
    </svg>
  );
}

const storeBadges = [
  { Logo: AppleLogo, store: 'App Store', label: 'Em breve na App Store' },
  { Logo: GooglePlayLogo, store: 'Google Play', label: 'Em breve no Google Play' },
];

export function MobileAppSection() {
  return (
    <section className="py-20 sm:py-32 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-violet-500/10 blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight [text-wrap:balance]">
              A bússola vai caber no seu bolso.
            </h2>

            <p className="text-lg text-slate-300 mb-8 max-w-md mx-auto lg:mx-0">
              O app do MoneyCompass para iOS e Android está em desenvolvimento. Quem está na lista
              de espera recebe o convite primeiro.
            </p>

            {/* Store badges — em breve */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
              {storeBadges.map(({ Logo, store, label }) => (
                <div
                  key={store}
                  aria-label={label}
                  className="inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-5 py-3 backdrop-blur-sm"
                >
                  <Logo className="h-7 w-7 text-white" />
                  <span className="text-left leading-tight">
                    <span className="block text-[11px] uppercase tracking-wide text-slate-400">
                      Em breve
                    </span>
                    <span className="block text-base font-semibold text-white">{store}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="max-w-xl mx-auto lg:mx-0">
              <WaitlistForm source="landing_mobile" />
            </div>
          </div>

          {/* Phone mockup */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-[4rem] blur-2xl" />

              {/* Phone frame */}
              <div className="relative w-[260px] sm:w-[280px]">
                <div className="relative bg-slate-800 rounded-[2.5rem] p-2.5 shadow-2xl">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-xl z-20" />

                  {/* Screen */}
                  <div className="relative bg-slate-900 rounded-[2rem] overflow-hidden">
                    {/* Status bar */}
                    <div className="bg-slate-900 px-5 py-2.5 flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-medium">9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="w-3.5 h-1.5 bg-white rounded-sm" />
                      </div>
                    </div>

                    {/* App content */}
                    <div className="px-4 pb-5">
                      {/* Balance display */}
                      <div className="text-center mb-4">
                        <p className="text-[10px] text-slate-500 mb-1">Saldo disponível</p>
                        <p className="text-2xl font-bold text-white">R$ 345,88</p>
                      </div>

                      {/* Quick actions */}
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {[
                          { icon: ArrowUpRight, label: 'Enviar', color: 'bg-blue-500/20 text-blue-400' },
                          { icon: ArrowDownLeft, label: 'Receber', color: 'bg-emerald-500/20 text-emerald-400' },
                          { icon: CreditCard, label: 'Cartões', color: 'bg-violet-500/20 text-violet-400' },
                          { icon: PiggyBank, label: 'Metas', color: 'bg-amber-500/20 text-amber-400' },
                        ].map((action, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`w-9 h-9 rounded-xl ${action.color} flex items-center justify-center`}>
                              <action.icon className="w-4 h-4" />
                            </div>
                            <span className="text-[8px] text-slate-500">{action.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Mini card */}
                      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-3 mb-3">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex gap-1">
                            <div className="w-4 h-3 bg-amber-400 rounded-sm" />
                            <div className="w-4 h-3 bg-amber-500 rounded-sm -ml-2" />
                          </div>
                          <span className="text-[8px] text-white/60">VISA</span>
                        </div>
                        <p className="text-[10px] text-white/80 tracking-widest">•••• •••• •••• 4582</p>
                      </div>

                      {/* Recent activity */}
                      <p className="text-[10px] text-slate-400 mb-2">Atividade recente</p>
                      <div className="space-y-2">
                        {[
                          { name: 'Mercado', amount: '-R$ 156,00', color: 'text-slate-300' },
                          { name: 'PIX recebido', amount: '+R$ 500,00', color: 'text-emerald-400' },
                        ].map((tx, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-slate-600" />
                              </div>
                              <span className="text-[10px] text-slate-300">{tx.name}</span>
                            </div>
                            <span className={`text-[10px] font-medium ${tx.color}`}>{tx.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
