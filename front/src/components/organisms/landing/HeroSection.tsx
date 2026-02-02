'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  const { user } = useAuth();

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
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-transparent" />
        {/* Additional overlay at top for header */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/80 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-40 pb-20 lg:pb-32 min-h-screen flex items-center">
        <div className="max-w-2xl">
          {/* Content */}
          <div className="text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-500/30 px-4 py-2 text-sm font-medium text-blue-300 mb-6 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
              </span>
              Gestão financeira inteligente
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Gerencie seu dinheiro{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                livremente
              </span>{' '}
              com o MoneyCompass.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-lg leading-relaxed">
              Controle transações, planeje orçamentos e acompanhe metas em um app simples e intuitivo.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {user ? (
                <Button size="lg" asChild className="rounded-full text-base px-8 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-xl shadow-blue-500/25 border-0">
                  <Link href="/financas">
                    Ir para Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild className="rounded-full text-base px-8 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-xl shadow-blue-500/25 border-0">
                    <Link href="/cadastro">
                      Começar Gratuitamente
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full text-base px-8 h-12 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-sm"
                    onClick={() => {
                      document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Ver funcionalidades
                  </Button>
                </>
              )}
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Sem cartão de crédito
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Dados seguros
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Cancele quando quiser
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
