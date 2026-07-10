'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { SetupChart } from './SetupChart';
import { api } from '@/lib/api';
import type { Setup, CandlesResponse, HistoricalSignal, SignalsResponse } from '@/types/market';
import { Loader2, Clock, BarChart3 } from 'lucide-react';

interface InlineChartProps {
  ticker: string;
  setup?: Setup;
}

export function InlineChart({ ticker, setup }: InlineChartProps) {
  const [candlesData, setCandlesData] = useState<CandlesResponse | null>(null);
  const [historicalSignals, setHistoricalSignals] = useState<HistoricalSignal[]>([]);
  const [signalStats, setSignalStats] = useState<{ total: number; successRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Setup padrão se nenhum for fornecido
  const defaultSetup: Setup = setup || {
    id: 'default',
    title: 'Grafico',
    status: 'ATIVO',
    successRate: 0,
    risk: 'Moderado',
    stopSuggestion: '0',
    targetNote: '',
    explanation: '',
    signals: [],
    meta: {},
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Buscar candles e sinais em paralelo (diario)
    Promise.all([
      api.getCandles(ticker, 1200, '1d'),
      api.getSignals(ticker, 200, '1d').catch(() => null), // Nao falhar se nao tiver sinais
    ])
      .then(([candlesData, signalsData]) => {
        setCandlesData(candlesData);
        if (signalsData) {
          setHistoricalSignals(signalsData.signals);
          setSignalStats({
            total: signalsData.stats.total,
            successRate: signalsData.stats.successRate,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load chart data:', err);
        setError('Falha ao carregar dados do grafico');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ticker]);

  const lastCandle = candlesData?.candles[candlesData.candles.length - 1];
  const prevCandle = candlesData?.candles[candlesData.candles.length - 2];
  const priceChange = lastCandle && prevCandle ? lastCandle.close - prevCandle.close : 0;
  const priceChangePercent = prevCandle ? (priceChange / prevCandle.close) * 100 : 0;

  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur">
      {/* Header elegante */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Grafico de Preco</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Timeframe Diario</span>
            </div>
          </div>
        </div>

        {lastCandle && (
          <div className="text-right">
            <div className="font-mono font-semibold">
              R$ {lastCandle.close.toFixed(2)}
            </div>
            <div className={`text-xs font-medium ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-0">
        {/* Container do gráfico */}
        <div className="h-[600px] w-full bg-white">
          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Carregando dados...</span>
            </div>
          )}
          {error && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-red-500">
              <span className="text-lg">⚠</span>
              <span>{error}</span>
            </div>
          )}
          {candlesData && !loading && !error && (
            <SetupChart
              ticker={ticker}
              candles={candlesData.candles}
              indicators={candlesData.indicators}
              setup={defaultSetup}
              historicalSignals={historicalSignals}
            />
          )}
        </div>

        {/* Footer com legenda */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 border-t border-border/50 bg-muted/20 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500"></div>
            <span className="text-muted-foreground">Alta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500"></div>
            <span className="text-muted-foreground">Baixa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-400 rounded"></div>
            <span className="text-muted-foreground">EMA 8</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-amber-500 rounded"></div>
            <span className="text-muted-foreground">EMA 80</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-green-500 to-red-500"></div>
            <span className="text-muted-foreground">MACD Histograma</span>
          </div>
          {setup?.meta?.p2 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500 rounded border-dashed"></div>
              <span className="text-muted-foreground">Stop Loss (SL): R$ {setup.meta.p2.toFixed(2)}</span>
            </div>
          )}
          {setup?.meta?.entry && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500 rounded"></div>
              <span className="text-muted-foreground">Entry: R$ {setup.meta.entry.toFixed(2)}</span>
            </div>
          )}
          {setup?.meta?.entry && setup?.meta?.p2 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500 rounded border-dashed"></div>
              <span className="text-muted-foreground">
                Take Profit (TP): R$ {(setup.meta.entry > setup.meta.p2
                  ? setup.meta.entry + (setup.meta.entry - setup.meta.p2) * 1.618
                  : setup.meta.entry - (setup.meta.p2 - setup.meta.entry) * 1.618
                ).toFixed(2)}
              </span>
            </div>
          )}
          {(setup?.meta?.p2Index !== undefined || setup?.meta?.p3Index !== undefined) && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-purple-600"></div>
              <span className="text-muted-foreground">Candles Setup 123</span>
            </div>
          )}
          {/* Legenda de sinais historicos */}
          {historicalSignals.length > 0 && (
            <>
              <div className="w-px h-4 bg-border/50"></div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-600"></div>
                <span className="text-muted-foreground">Entry</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-600 border-dashed"></div>
                <span className="text-muted-foreground">TP = Take Profit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-600 border-dashed"></div>
                <span className="text-muted-foreground">LOSS = Stop Loss</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-muted-foreground">PEND = Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-muted-foreground">N/E = Nao Executado</span>
              </div>
            </>
          )}
          {/* Estatisticas de sinais */}
          {signalStats && signalStats.total > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-muted-foreground font-medium">
                Sinais: {signalStats.total} | Taxa de sucesso: {signalStats.successRate.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
