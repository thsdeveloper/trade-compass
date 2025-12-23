'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SetupChart } from '@/components/molecules/SetupChart';
import { api } from '@/lib/api';
import type { Setup, CandlesResponse } from '@/types/market';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SetupChartModalProps {
  setup: Setup;
  ticker: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetupChartModal({
  setup,
  ticker,
  open,
  onOpenChange,
}: SetupChartModalProps) {
  const [candlesData, setCandlesData] = useState<CandlesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !candlesData) {
      setLoading(true);
      setError(null);
      api
        .getCandles(ticker)
        .then((data) => {
          setCandlesData(data);
        })
        .catch((err) => {
          console.error('Failed to load candles:', err);
          setError('Falha ao carregar dados do grafico');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, ticker, candlesData]);

  // Reset data when modal closes
  useEffect(() => {
    if (!open) {
      setCandlesData(null);
      setError(null);
    }
  }, [open]);

  const getStatusBadge = (status: Setup['status']) => {
    switch (status) {
      case 'ATIVO':
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <TrendingUp className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case 'EM_FORMACAO':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <Minus className="h-3 w-3 mr-1" />
            Em Formacao
          </Badge>
        );
      case 'INVALIDO':
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
            <TrendingDown className="h-3 w-3 mr-1" />
            Invalido
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none !w-screen !h-screen !max-h-screen !rounded-none !top-0 !left-0 !translate-x-0 !translate-y-0 flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-xl">{ticker}</span>
            <span className="text-muted-foreground">-</span>
            <span>{setup.title}</span>
            {getStatusBadge(setup.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* Chart */}
          <div className="border rounded-lg overflow-hidden bg-background flex-1">
            {loading && (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <div className="h-full flex items-center justify-center text-red-500">
                {error}
              </div>
            )}
            {candlesData && !loading && !error && (
              <SetupChart
                ticker={ticker}
                candles={candlesData.candles}
                indicators={candlesData.indicators}
                setup={setup}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span className="text-muted-foreground">EMA20</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-orange-500"></div>
              <span className="text-muted-foreground">EMA50</span>
            </div>
            {setup.meta.resistance && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-600 border-dashed border-b-2 border-red-600"></div>
                <span className="text-muted-foreground">
                  Resistencia: R$ {setup.meta.resistance.toFixed(2)}
                </span>
              </div>
            )}
            {setup.meta.support && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-600 border-dashed border-b-2 border-red-600"></div>
                <span className="text-muted-foreground">
                  Suporte: R$ {setup.meta.support.toFixed(2)}
                </span>
              </div>
            )}
            {setup.meta.stopLevel && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500"></div>
                <span className="text-muted-foreground">
                  Stop: R$ {setup.meta.stopLevel.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Setup Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Taxa de Sucesso</div>
              <div className="font-semibold">{setup.successRate}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Risco</div>
              <div className="font-semibold">{setup.risk}</div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground">Stop Sugerido</div>
              <div className="font-semibold">{setup.stopSuggestion}</div>
            </div>
          </div>

          {/* Explanation */}
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            {setup.explanation}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
