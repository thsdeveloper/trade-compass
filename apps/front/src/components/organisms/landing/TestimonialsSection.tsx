'use client';

import { useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    content:
      'Uso o MoneyCompass há 4 meses — muito intuitivo e fácil de usar. Consegui economizar mais de R$ 3.000 com o planejamento 50/30/20.',
    author: 'James Carter',
    role: 'Analista Financeiro',
    color: 'from-blue-400 to-blue-600',
  },
  {
    content:
      'O design é simples e os relatórios são muito completos. Tenho total visibilidade das minhas finanças sem complicação.',
    author: 'Daniel Novak',
    role: 'Designer',
    color: 'from-violet-400 to-violet-600',
  },
  {
    content:
      'Consegui finalmente entender para onde meu dinheiro estava indo. A visualização clara ajudou demais nas minhas decisões.',
    author: 'David Kim',
    role: 'Eng. de Dados',
    color: 'from-emerald-400 to-emerald-600',
  },
  {
    content:
      'Com os alertas automáticos e o controle de faturas, nunca mais esqueci de pagar uma conta. Super recomendo!',
    author: 'Alex Turnyeva',
    role: 'Empreendedor',
    color: 'from-amber-400 to-orange-500',
  },
  {
    content:
      'Uma ferramenta incrível. Gerencio todas as minhas contas pessoais em um só lugar. Interface muito bem pensada.',
    author: 'Emily Zhao',
    role: 'UX Designer',
    color: 'from-rose-400 to-pink-500',
  },
  {
    content:
      'Uso há 6 meses e nunca mais fui pego de surpresa. O controle de recorrências é sensacional. Mudou minha vida.',
    author: 'Sofia Laurent',
    role: 'Desenvolvedora',
    color: 'from-cyan-400 to-teal-500',
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
      {/* Spotlight gradient layer */}
      <div
        className="absolute -inset-px pointer-events-none rounded-[inherit]"
        style={{
          background: `radial-gradient(400px 400px at var(--spotlight-x, 0px) var(--spotlight-y, 0px), rgba(251, 191, 36, 0.3), transparent 70%)`,
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

export function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-32 bg-gradient-to-b from-blue-950 via-slate-900 to-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/30 px-4 py-1.5 text-sm font-medium text-amber-300 mb-4">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            Depoimentos
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            O Que Nossos Clientes Felizes<br />Estão Dizendo Sobre o MoneyCompass
          </h2>
        </div>

        {/* Testimonials grid - 3x2 layout */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <SpotlightCard
              key={index}
              className="group"
            >
              <div className="p-6">
                {/* Author info at top */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-medium text-sm`}>
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{testimonial.author}</p>
                    <p className="text-xs text-slate-400">{testimonial.role}</p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-slate-300 leading-relaxed text-sm">
                  {testimonial.content}
                </p>

                {/* Stars */}
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
