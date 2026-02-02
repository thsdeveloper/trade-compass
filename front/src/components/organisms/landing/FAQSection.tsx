'use client';

import { HelpCircle, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'É realmente gratuito para começar?',
    answer:
      'Sim! O plano gratuito inclui transações ilimitadas, planejamento 50/30/20, relatórios básicos e muito mais. Você pode usar indefinidamente sem pagar nada. Os planos pagos oferecem recursos adicionais para quem precisa de mais funcionalidades.',
  },
  {
    question: 'Meus dados estão seguros neste app?',
    answer:
      'Absolutamente. Usamos criptografia de ponta a ponta e seguimos as melhores práticas de segurança. Seus dados são armazenados em servidores seguros e nunca são compartilhados com terceiros. Você tem controle total sobre suas informações.',
  },
  {
    question: 'Quais tipos de relatórios estão disponíveis?',
    answer:
      'Oferecemos 7 tipos de relatórios: fluxo de caixa, análise de orçamento, breakdown por categorias, métodos de pagamento, acompanhamento de metas, recorrências e comparativo ano a ano (YoY). Nos planos pagos, você também pode exportar em PDF.',
  },
  {
    question: 'Posso enviar ou receber dados de outras carteiras?',
    answer:
      'Sim! Você pode importar e exportar seus dados facilmente. Suportamos importação via CSV e exportação completa dos seus dados a qualquer momento.',
  },
  {
    question: 'Como funciona o método 50/30/20?',
    answer:
      'O método 50/30/20 é uma regra simples de orçamento: 50% da sua renda vai para necessidades (moradia, alimentação, contas), 30% para desejos (lazer, entretenimento) e 20% para poupança e investimentos. O MoneyCompass automatiza esse acompanhamento para você.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 sm:py-32 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-blue-50/50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
            <HelpCircle className="w-4 h-4" />
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Tem Perguntas?<br />Temos Respostas!
          </h2>
        </div>

        {/* FAQ list */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={cn(
                'bg-white rounded-2xl border transition-all duration-300',
                openIndex === index
                  ? 'border-blue-200 shadow-lg shadow-blue-100/50'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-semibold text-slate-900 pr-4">
                  {faq.question}
                </span>
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  openIndex === index
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                )}>
                  {openIndex === index ? (
                    <Minus className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>
              </button>
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300',
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                )}
              >
                <p className="px-6 pb-6 text-slate-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
