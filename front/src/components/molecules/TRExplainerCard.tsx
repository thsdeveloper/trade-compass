'use client';

import { Info, TrendingUp, Calculator, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TRExplainerCardProps {
  currentRate?: number;
  className?: string;
}

export function TRExplainerCard({ currentRate = 0.08, className }: TRExplainerCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b">
        <div className="rounded-md bg-slate-100 p-2">
          <Info className="h-4 w-4 text-slate-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold tracking-tight">O que e a Taxa Referencial (TR)?</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Entenda como ela afeta seu financiamento
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">TR Atual</p>
          <p className="text-lg font-semibold font-mono tabular-nums text-slate-900">
            {currentRate.toFixed(4)}%
          </p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
        {/* What is TR */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Calculator className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">
              O que e
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A TR e um indice calculado pelo Banco Central que corrige o saldo devedor
            do seu financiamento <span className="font-medium text-slate-700">mensalmente</span>.
            Ela e somada a taxa de juros fixa do contrato.
          </p>
          <div className="pt-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500">Sua taxa efetiva:</span>
              <span className="text-xs font-mono font-semibold text-slate-800">
                8.64% + TR
              </span>
            </div>
          </div>
        </div>

        {/* How it impacts */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">
              Impacto
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Quando a TR sobe, seu <span className="font-medium text-slate-700">saldo devedor aumenta</span>,
            mesmo pagando as parcelas em dia. Isso significa que voce pagara mais juros ao longo do financiamento.
          </p>
          <div className="pt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">TR = 0%</span>
              <span className="font-mono text-emerald-600">Saldo nao corrigido</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">TR &gt; 0%</span>
              <span className="font-mono text-amber-600">Saldo aumenta</span>
            </div>
          </div>
        </div>

        {/* Historical context */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">
              Historico
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A TR ficou em <span className="font-medium text-emerald-600">0% de 2018 a 2021</span>,
            mas voltou a subir em 2022 com a alta da Selic. Financiamentos antigos se beneficiaram
            do periodo de TR zero.
          </p>
          <div className="pt-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full"
                  style={{ width: `${Math.min(currentRate * 1000, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {currentRate > 0.1 ? 'Alta' : currentRate > 0.05 ? 'Moderada' : 'Baixa'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer tip */}
      <div className="px-4 py-3 bg-slate-50/50 border-t">
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-blue-400" />
          <span>
            <span className="font-medium">Dica:</span> Amortizacoes extras reduzem o saldo devedor e diminuem o impacto da TR ao longo do tempo.
          </span>
        </p>
      </div>
    </div>
  );
}
