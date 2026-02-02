'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Sparkles, ArrowUpRight, ArrowDownLeft, CreditCard, PiggyBank } from 'lucide-react';

export function CTASection() {
  const { user } = useAuth();

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
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-sm font-medium text-white/80 mb-6">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Cresça conosco
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Crie seu próprio<br />controle financeiro<br />em segundos
            </h2>

            <p className="text-lg text-slate-400 mb-8 max-w-md mx-auto lg:mx-0">
              Escolha suas categorias, defina suas metas e tenha controle total em um app intuitivo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {user ? (
                <Button
                  size="lg"
                  asChild
                  className="rounded-full text-base px-8 h-12 bg-white text-slate-900 hover:bg-slate-100"
                >
                  <Link href="/financas">
                    Ir para Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  asChild
                  className="rounded-full text-base px-8 h-12 bg-white text-slate-900 hover:bg-slate-100"
                >
                  <Link href="/cadastro">
                    Criar Conta Gratuitamente
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Sem cartão de crédito. Cancele quando quiser.
            </p>
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
