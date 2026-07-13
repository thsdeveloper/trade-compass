'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Check } from 'lucide-react';

const trustPoints = ['Sem cartão de crédito', 'Dados criptografados', 'Cancele quando quiser'];

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
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/20" />
        {/* Additional overlay at top for header */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/80 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 lg:pt-40 pb-20 lg:pb-32 min-h-screen flex items-center">
        <div className="max-w-2xl">
          <h1
            className="animate-rise font-bold tracking-tight text-white leading-[1.08] [text-wrap:balance]"
            style={{ fontSize: 'clamp(2.5rem, 1.5rem + 4.5vw, 4.25rem)' }}
          >
            Seu dinheiro tem direção.
            <br />
            <span className="text-sky-300">A bússola é aqui.</span>
          </h1>

          <p className="animate-rise-delayed mt-6 text-lg sm:text-xl text-slate-200 max-w-lg leading-relaxed">
            Controle transações, planeje com a regra 50/30/20 e acompanhe metas e investimentos em
            um só lugar.
          </p>

          <div className="animate-rise-delayed-2 mt-8 flex flex-col sm:flex-row gap-4">
            {user ? (
              <Button
                size="lg"
                asChild
                className="rounded-full text-base px-8 h-12 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-950/40 border-0"
              >
                <Link href="/financas">
                  Ir para o Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  asChild
                  className="rounded-full text-base px-8 h-12 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-950/40 border-0"
                >
                  <Link href="/cadastro">
                    Começar gratuitamente
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full text-base px-8 h-12 border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white hover:border-white/40 backdrop-blur-sm"
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
