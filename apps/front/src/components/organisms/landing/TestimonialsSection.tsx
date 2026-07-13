'use client';

import { SpotlightCard } from './SpotlightCard';

const featured = {
  content:
    'Consegui finalmente entender para onde meu dinheiro estava indo. Em 4 meses com o planejamento 50/30/20, economizei mais de R$ 3.000 sem sentir aperto.',
  author: 'Mariana Costa',
  role: 'Analista Financeira · São Paulo',
  initials: 'MC',
};

const testimonials = [
  {
    content:
      'O design é simples e os relatórios são completos. Tenho visibilidade total das minhas finanças sem complicação.',
    author: 'Rafael Almeida',
    role: 'Designer',
    initials: 'RA',
  },
  {
    content:
      'Com os alertas automáticos e o controle de faturas, nunca mais esqueci de pagar uma conta.',
    author: 'Pedro Henrique',
    role: 'Empreendedor',
    initials: 'PH',
  },
  {
    content:
      'A importação de extrato com IA é surreal: subo o PDF do banco e tudo chega categorizado.',
    author: 'Camila Oliveira',
    role: 'Professora',
    initials: 'CO',
  },
  {
    content:
      'Uso há 6 meses e nunca mais fui pego de surpresa. O controle de recorrências é sensacional.',
    author: 'Lucas Ferreira',
    role: 'Eng. de Dados',
    initials: 'LF',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-32 bg-gradient-to-b from-blue-950 via-slate-900 to-slate-900 relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white [text-wrap:balance]">
            Quem usa, recomenda.
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Featured quote */}
          <SpotlightCard className="lg:col-span-2">
            <figure className="p-8 sm:p-12 flex flex-col justify-between h-full">
              <blockquote className="text-2xl sm:text-3xl font-medium text-white leading-snug [text-wrap:balance]">
                &ldquo;{featured.content}&rdquo;
              </blockquote>
              <figcaption className="mt-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {featured.initials}
                </div>
                <div>
                  <p className="font-semibold text-white">{featured.author}</p>
                  <p className="text-sm text-slate-400">{featured.role}</p>
                </div>
              </figcaption>
            </figure>
          </SpotlightCard>

          {/* Supporting quotes */}
          {testimonials.map((testimonial) => (
            <SpotlightCard key={testimonial.author}>
              <figure className="p-6">
                <blockquote className="text-slate-200 leading-relaxed text-sm">
                  &ldquo;{testimonial.content}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-medium text-xs">
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{testimonial.author}</p>
                    <p className="text-xs text-slate-400">{testimonial.role}</p>
                  </div>
                </figcaption>
              </figure>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
