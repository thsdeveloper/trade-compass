'use client';

import { useRef, useState } from 'react';
import {
  Zap,
  TrendingUp,
  PieChart,
  Shield,
  Receipt,
  Target,
  CreditCard,
  FileBarChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const gridFeatures = [
  {
    icon: Receipt,
    title: 'Gestão de Transações',
    description: 'CRUD completo com parcelamento e recorrências automáticas.',
  },
  {
    icon: PieChart,
    title: 'Planejamento 50/30/20',
    description: 'Orçamento inteligente baseado em metodologia comprovada.',
  },
  {
    icon: Target,
    title: 'Metas Financeiras',
    description: '7 categorias de objetivos com acompanhamento de progresso.',
  },
  {
    icon: CreditCard,
    title: 'Cartões e Faturas',
    description: 'Gerencie múltiplos cartões, faturas e limites em um só lugar.',
  },
  {
    icon: FileBarChart,
    title: '7 Tipos de Relatórios',
    description: 'Fluxo de caixa, orçamento, categorias, metas e muito mais.',
  },
  {
    icon: TrendingUp,
    title: 'Investimentos',
    description: 'Acompanhe CDB, LCI, LCA, Tesouro e outros investimentos.',
  },
];

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

function SpotlightCard({ children, className }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn('relative rounded-2xl ring-1 ring-white/10', className)}
      style={{
        '--spotlight-x': `${position.x}px`,
        '--spotlight-y': `${position.y}px`,
      } as React.CSSProperties}
    >
      {/* Spotlight gradient layer - behind everything */}
      <div
        className="absolute -inset-px pointer-events-none rounded-[inherit]"
        style={{
          background: `radial-gradient(400px 400px at var(--spotlight-x, 0px) var(--spotlight-y, 0px), rgba(59, 130, 246, 0.35), transparent 70%)`,
        }}
      />
      {/* Overlay that masks the spotlight */}
      <div className="absolute inset-0 rounded-[inherit] pointer-events-none bg-slate-900/90" />
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-32 bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:20px_20px]" />
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-500/30 px-4 py-1.5 text-sm font-medium text-blue-300 mb-4">
            Vantagens principais
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Vantagens Principais
          </h2>
          <p className="text-lg text-slate-400">
            Tudo que você precisa para ter controle total das suas finanças.
          </p>
        </div>

        {/* Bento grid layout */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Left feature card */}
          <SpotlightCard className="group">
            <div className="p-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-6 bg-amber-500/20">
                <Zap className="h-7 w-7 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Troca em Segundos</h3>
              <p className="text-slate-400 mb-6">Transações rápidas e seguras entre contas com apenas alguns toques.</p>

              {/* Mini mockup */}
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400">Transferência</span>
                  <span className="text-xs text-slate-500">Agora</span>
                </div>
                <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">R$</div>
                      <span className="font-semibold text-white">R$ 950,00</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* Center feature card with image */}
          <SpotlightCard className="group">
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
                    <div className="flex gap-2">
                      {[60, 80, 45, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 bg-slate-700 rounded-lg overflow-hidden">
                          <div
                            className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-lg transition-all"
                            style={{ height: `${h}px` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-400 mb-2">SAIBA MAIS →</p>
              </div>
            </div>
          </SpotlightCard>

          {/* Right feature card */}
          <SpotlightCard className="group">
            <div className="p-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-6 bg-emerald-500/20">
                <Shield className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Controle Total</h3>
              <p className="text-slate-400 mb-6">Acompanhe, gerencie e transfira em segundos — sem complexidade.</p>

              {/* Stats display */}
              <div className="flex items-end gap-4">
                <span className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  99.9%
                </span>
                <p className="text-xs text-slate-500 pb-2 leading-relaxed max-w-[120px]">
                  Aprovado por usuários que valorizam velocidade, simplicidade e controle.
                </p>
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* Section divider */}
        <div className="my-16 sm:my-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-sm font-medium text-slate-300">
            Vantagens
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mt-4 mb-2">
            Feito para Usuários Reais
          </h3>
          <p className="text-slate-400 max-w-xl mx-auto">
            Gerencie suas finanças de forma simples — com total transparência e segurança.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridFeatures.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <SpotlightCard
                key={feature.title}
                className="group"
              >
                <div className="p-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors mb-4">
                    <IconComponent className="h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
