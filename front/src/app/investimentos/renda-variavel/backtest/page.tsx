'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/organisms/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { api, type WatchlistItemResponse } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { BacktestResponse, BacktestSummary, HistoricalSignal } from '@/types/market';
import Link from 'next/link';
import {
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  LineChart,
  Table2,
  FileText,
  RefreshCw,
  Zap,
  Database,
} from 'lucide-react';
import { BacktestPageSkeleton } from '@/components/organisms/skeletons/BacktestPageSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function BacktestPage() {
  const { session, loading: authLoading } = useAuth();
  const [data, setData] = useState<BacktestResponse | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSetup, setSelectedSetup] = useState<string>('all');
  const [selectedTicker, setSelectedTicker] = useState<string>('all');

  // Carregar watchlist do usuario
  useEffect(() => {
    if (authLoading) return;

    if (!session?.access_token) {
      setWatchlist([]);
      setLoadingWatchlist(false);
      return;
    }

    setLoadingWatchlist(true);
    api
      .getWatchlist(session.access_token)
      .then((items) => {
        setWatchlist(items);
        // Se tiver apenas um ativo, seleciona automaticamente
        if (items.length === 1) {
          setSelectedTicker(items[0].ticker);
        }
      })
      .catch((err) => {
        console.error('Failed to load watchlist:', err);
      })
      .finally(() => {
        setLoadingWatchlist(false);
      });
  }, [session?.access_token, authLoading]);

  const loadBacktest = async () => {
    if (selectedTicker === 'all' && watchlist.length === 0) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const options: { setupType?: string; ticker?: string } = {};
      if (selectedSetup !== 'all') options.setupType = selectedSetup;
      if (selectedTicker !== 'all') options.ticker = selectedTicker;

      const result = await api.getBacktest(Object.keys(options).length > 0 ? options : undefined);
      setData(result);
    } catch (err) {
      console.error('Failed to load backtest:', err);
      setError('Falha ao carregar dados do backtest');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingWatchlist && watchlist.length > 0) {
      loadBacktest();
    }
  }, [selectedSetup, selectedTicker, loadingWatchlist, watchlist.length]);

  const generateBacktest = async (ticker: string) => {
    setGenerating(true);
    setError(null);

    try {
      const result = await api.generateBacktest(ticker);
      console.log(`Backtest gerado para ${ticker}:`, result);
      // Recarregar dados apos gerar
      await loadBacktest();
    } catch (err) {
      console.error('Failed to generate backtest:', err);
      setError(`Falha ao gerar backtest para ${ticker}`);
    } finally {
      setGenerating(false);
    }
  };

  // Usuario nao autenticado
  if (!authLoading && !session) {
    return (
      <PageShell>
        <div className="container mx-auto py-20 px-4 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Backtest Setup 123</h1>
          <p className="text-muted-foreground mb-6">
            Faca login para acessar o backtest dos seus ativos
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            Entrar
          </Link>
        </div>
      </PageShell>
    );
  }

  // Watchlist vazia
  if (!loadingWatchlist && watchlist.length === 0 && session) {
    return (
      <PageShell>
        <div className="container mx-auto py-20 px-4 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Backtest Setup 123</h1>
          <p className="text-muted-foreground mb-6">
            Adicione ativos a sua watchlist para visualizar o backtest
          </p>
          <Link
            href="/watchlist"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            Ir para Watchlist
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Backtest Setup 123
            </h1>
            <p className="text-muted-foreground mt-1">
              {selectedTicker !== 'all' ? (
                <span>Analise de <strong>{selectedTicker}</strong></span>
              ) : (
                <span>Analise de todos os ativos</span>
              )}
              {selectedSetup !== 'all' && (
                <span> - {selectedSetup === '123-compra' ? '123 Compra' : '123 Venda'}</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value)}
              className="px-3 py-2 rounded-md border bg-background text-sm min-w-[140px]"
            >
              <option value="all">Todos os ativos ({watchlist.length})</option>
              {watchlist.map((item) => (
                <option key={item.id} value={item.ticker}>
                  {item.ticker} - {item.name}
                </option>
              ))}
            </select>
            <select
              value={selectedSetup}
              onChange={(e) => setSelectedSetup(e.target.value)}
              className="px-3 py-2 rounded-md border bg-background text-sm"
            >
              <option value="all">Todos os setups</option>
              <option value="123-compra">123 Compra</option>
              <option value="123-venda">123 Venda</option>
            </select>
            <Button onClick={loadBacktest} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Loading */}
        {(authLoading || loadingWatchlist || (loading && !data)) && (
          <BacktestPageSkeleton />
        )}

        {/* Error */}
        {error && !generating && (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <AlertTriangle className="h-8 w-8" />
            <span className="mt-2">{error}</span>
          </div>
        )}

        {/* Generating */}
        {generating && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-lg font-medium mt-4">Gerando backtest...</span>
            <span className="text-sm text-muted-foreground mt-1">
              Isso pode levar alguns segundos
            </span>
          </div>
        )}

        {/* No data - Show generate button */}
        {!loading && !generating && !authLoading && !loadingWatchlist && data && data.summary.totalSignals === 0 && selectedTicker !== 'all' && (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sem dados de backtest</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Nao existem dados de backtest para <strong>{selectedTicker}</strong>.
                Clique no botao abaixo para gerar o backtest historico.
              </p>
              <Button
                onClick={() => generateBacktest(selectedTicker)}
                disabled={generating}
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                Gerar Backtest para {selectedTicker}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {data && data.summary.totalSignals > 0 && !generating && (
          <Tabs defaultValue="resumo" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="resumo" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resumos
              </TabsTrigger>
              <TabsTrigger value="operacoes" className="flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                Operacoes
              </TabsTrigger>
              <TabsTrigger value="grafico" className="flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                Grafico
              </TabsTrigger>
            </TabsList>

            {/* Tab: Resumos */}
            <TabsContent value="resumo" className="mt-6">
              <BacktestSummaryView summary={data.summary} />
            </TabsContent>

            {/* Tab: Operacoes */}
            <TabsContent value="operacoes" className="mt-6">
              <BacktestOperationsTable operations={data.operations} />
            </TabsContent>

            {/* Tab: Grafico */}
            <TabsContent value="grafico" className="mt-6">
              <BacktestChartView summary={data.summary} operations={data.operations} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageShell>
  );
}

// ==================== RESUMO ====================

function BacktestSummaryView({ summary }: { summary: BacktestSummary }) {
  return (
    <div className="space-y-6">
      {/* Metricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Sinais"
          value={summary.totalSignals}
          icon={<Target className="h-5 w-5" />}
          color="text-blue-500"
        />
        <MetricCard
          title="Taxa de Sucesso"
          value={`${summary.successRate.toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color={summary.successRate >= 50 ? 'text-green-500' : 'text-red-500'}
        />
        <MetricCard
          title="Profit Factor"
          value={`${summary.profitFactor.toFixed(2)} (${summary.profitFactor >= 1 ? '+' : ''}${((summary.profitFactor - 1) * 100).toFixed(0)}%)`}
          icon={<BarChart3 className="h-5 w-5" />}
          color={summary.profitFactor >= 1 ? 'text-green-500' : 'text-red-500'}
        />
        <MetricCard
          title="Tempo Medio"
          value={`${summary.avgCandlesToResolve.toFixed(1)} candles`}
          icon={<Clock className="h-5 w-5" />}
          color="text-amber-500"
        />
      </div>

      {/* Metricas de Retorno */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Retorno Total"
          value={`${summary.totalReturnPct >= 0 ? '+' : ''}${summary.totalReturnPct.toFixed(2)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          color={summary.totalReturnPct >= 0 ? 'text-green-500' : 'text-red-500'}
        />
        <MetricCard
          title="Retorno Medio"
          value={`${summary.avgReturnPct >= 0 ? '+' : ''}${summary.avgReturnPct.toFixed(2)}%`}
          icon={<BarChart3 className="h-5 w-5" />}
          color={summary.avgReturnPct >= 0 ? 'text-green-500' : 'text-red-500'}
        />
        <MetricCard
          title="Ganho Medio"
          value={`+${summary.avgWinPct.toFixed(2)}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="text-green-500"
        />
        <MetricCard
          title="Perda Media"
          value={`${summary.avgLossPct.toFixed(2)}%`}
          icon={<XCircle className="h-5 w-5" />}
          color="text-red-500"
        />
      </div>

      {/* Distribuicao de resultados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuicao de Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Take Profit"
              count={summary.totalSuccess}
              total={summary.totalSignals}
              color="bg-green-500"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <ResultCard
              label="Stop Loss"
              count={summary.totalFailure}
              total={summary.totalSignals}
              color="bg-red-500"
              icon={<XCircle className="h-4 w-4" />}
            />
            <ResultCard
              label="Pendentes"
              count={summary.totalPending}
              total={summary.totalSignals}
              color="bg-yellow-500"
              icon={<Clock className="h-4 w-4" />}
            />
            <ResultCard
              label="Expirados"
              count={summary.totalExpired}
              total={summary.totalSignals}
              color="bg-gray-500"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Por tipo de setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Por Tipo de Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SetupTypeCard
              type="123-compra"
              stats={summary.bySetupType['123-compra']}
              icon={<TrendingUp className="h-5 w-5 text-green-500" />}
            />
            <SetupTypeCard
              type="123-venda"
              stats={summary.bySetupType['123-venda']}
              icon={<TrendingDown className="h-5 w-5 text-red-500" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Por ticker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Por Ativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(summary.byTicker)
              .sort((a, b) => b[1].successRate - a[1].successRate)
              .map(([ticker, stats]) => (
                <div
                  key={ticker}
                  className="p-3 rounded-lg border bg-muted/30 flex flex-col"
                >
                  <span className="font-semibold text-sm">{ticker}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{stats.total} sinais</span>
                    <span
                      className={`text-sm font-medium ${
                        stats.successRate >= 50 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {stats.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stats.successRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${stats.successRate}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultCard({
  label,
  count,
  total,
  color,
  icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex flex-col p-4 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${color} text-white`}>{icon}</div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}% do total</span>
    </div>
  );
}

function SetupTypeCard({
  type,
  stats,
  icon,
}: {
  type: string;
  stats: { total: number; success: number; failure: number; successRate: number };
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="font-semibold">{type === '123-compra' ? '123 Compra' : '123 Venda'}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div>
          <p className="text-lg font-bold text-green-500">{stats.success}</p>
          <p className="text-xs text-muted-foreground">TP</p>
        </div>
        <div>
          <p className="text-lg font-bold text-red-500">{stats.failure}</p>
          <p className="text-xs text-muted-foreground">SL</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span>Taxa de sucesso</span>
          <span
            className={`font-semibold ${stats.successRate >= 50 ? 'text-green-500' : 'text-red-500'}`}
          >
            {stats.successRate.toFixed(1)}%
          </span>
        </div>
        <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${stats.successRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${stats.successRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ==================== OPERACOES (TABELA) ====================

function BacktestOperationsTable({ operations }: { operations: HistoricalSignal[] }) {
  const [sortField, setSortField] = useState<string>('signal_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedOperations = [...operations].sort((a, b) => {
    const aVal = a[sortField as keyof HistoricalSignal];
    const bVal = b[sortField as keyof HistoricalSignal];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Calcula o retorno percentual de uma operação
  const calculateOperationReturnPct = (op: HistoricalSignal): number | null => {
    if (op.resolved_price === null) return null;
    if (op.status !== 'success' && op.status !== 'failure') return null;

    const entry = Number(op.entry_price);
    const resolved = Number(op.resolved_price);
    if (entry === 0) return null;

    // Para VENDA: lucro quando preço CAI
    if (op.setup_type === '123-venda') {
      return ((entry - resolved) / entry) * 100;
    }
    // Para COMPRA: lucro quando preço SOBE
    return ((resolved - entry) / entry) * 100;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500 hover:bg-green-600">TP</Badge>;
      case 'failure':
        return <Badge className="bg-red-500 hover:bg-red-600">SL</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Historico de Operacoes</span>
          <span className="text-sm font-normal text-muted-foreground">
            {operations.length} operacoes
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('signal_time')}
                >
                  Data {sortField === 'signal_time' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('ticker')}
                >
                  Ativo {sortField === 'ticker' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('setup_type')}
                >
                  Tipo {sortField === 'setup_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Stop</TableHead>
                <TableHead className="text-right">Alvo</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Candles</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOperations.slice(0, 100).map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDate(op.signal_time)}
                  </TableCell>
                  <TableCell className="font-semibold">{op.ticker}</TableCell>
                  <TableCell>
                    <span
                      className={`text-xs ${
                        op.setup_type === '123-compra' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {op.setup_type === '123-compra' ? 'Compra' : 'Venda'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    R$ {Number(op.entry_price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-red-500">
                    R$ {Number(op.stop_price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-green-500">
                    R$ {Number(op.target_price).toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(op.status)}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {op.candles_to_resolve ?? '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {(() => {
                      const pct = calculateOperationReturnPct(op);
                      if (pct === null) return <span className="text-muted-foreground">-</span>;
                      const isPositive = pct >= 0;
                      return (
                        <span className={isPositive ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                          {isPositive ? '+' : ''}{pct.toFixed(2)}%
                        </span>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {operations.length > 100 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Exibindo 100 de {operations.length} operacoes
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== GRAFICO ====================

function BacktestChartView({
  summary,
  operations,
}: {
  summary: BacktestSummary;
  operations: HistoricalSignal[];
}) {
  // Calcular curva de equity simulada
  const equityCurve = calculateEquityCurve(operations);

  return (
    <div className="space-y-6">
      {/* Grafico de distribuicao */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuicao de Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
              style={{
                width: `${(summary.totalSuccess / summary.totalSignals) * 100}%`,
              }}
            >
              {summary.totalSuccess > 0 && `${summary.totalSuccess} TP`}
            </div>
            <div
              className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
              style={{
                width: `${(summary.totalFailure / summary.totalSignals) * 100}%`,
              }}
            >
              {summary.totalFailure > 0 && `${summary.totalFailure} SL`}
            </div>
            <div
              className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
              style={{
                width: `${(summary.totalPending / summary.totalSignals) * 100}%`,
              }}
            >
              {summary.totalPending > 0 && `${summary.totalPending}`}
            </div>
            <div
              className="bg-gray-400 flex items-center justify-center text-white text-xs font-medium"
              style={{
                width: `${(summary.totalExpired / summary.totalSignals) * 100}%`,
              }}
            >
              {summary.totalExpired > 0 && `${summary.totalExpired}`}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" /> Take Profit
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" /> Stop Loss
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500" /> Pendente
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-400" /> Expirado
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Curva de Equity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Curva de Equity (Simulada)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 relative">
            <EquityChart data={equityCurve} />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Simulacao com risco fixo de 1 unidade por operacao (TP = +1.618, SL = -1)
          </p>
        </CardContent>
      </Card>

      {/* Heatmap por ativo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance por Ativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {Object.entries(summary.byTicker)
              .sort((a, b) => b[1].successRate - a[1].successRate)
              .map(([ticker, stats]) => {
                const intensity = stats.successRate / 100;
                const bgColor =
                  stats.successRate >= 50
                    ? `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`
                    : `rgba(239, 68, 68, ${0.2 + (1 - intensity) * 0.6})`;
                return (
                  <div
                    key={ticker}
                    className="p-2 rounded text-center text-xs"
                    style={{ backgroundColor: bgColor }}
                  >
                    <div className="font-semibold">{ticker}</div>
                    <div>{stats.successRate.toFixed(0)}%</div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function calculateEquityCurve(operations: HistoricalSignal[]): { date: string; equity: number }[] {
  const RISK_REWARD = 1.618;
  let equity = 100; // Capital inicial
  const curve: { date: string; equity: number }[] = [];

  // Ordenar por data
  const sorted = [...operations]
    .filter((op) => op.status === 'success' || op.status === 'failure')
    .sort((a, b) => new Date(a.signal_time).getTime() - new Date(b.signal_time).getTime());

  for (const op of sorted) {
    if (op.status === 'success') {
      equity += RISK_REWARD; // Ganho
    } else if (op.status === 'failure') {
      equity -= 1; // Perda
    }
    curve.push({
      date: new Date(op.signal_time).toLocaleDateString('pt-BR'),
      equity: parseFloat(equity.toFixed(2)),
    });
  }

  return curve;
}

function EquityChart({ data }: { data: { date: string; equity: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Sem dados suficientes para gerar o grafico
      </div>
    );
  }

  const minEquity = Math.min(...data.map((d) => d.equity));
  const maxEquity = Math.max(...data.map((d) => d.equity));
  const range = maxEquity - minEquity || 1;

  const pathPoints = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const y = 100 - ((d.equity - minEquity) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const finalEquity = data[data.length - 1]?.equity || 100;
  const isPositive = finalEquity >= 100;

  return (
    <div className="h-full w-full relative">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        {/* Grid lines */}
        <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
        <line x1="0" y1="25" x2="100" y2="25" stroke="#e5e7eb" strokeWidth="0.3" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#e5e7eb" strokeWidth="0.3" />

        {/* Equity line */}
        <polyline
          points={pathPoints}
          fill="none"
          stroke={isPositive ? '#22c55e' : '#ef4444'}
          strokeWidth="0.5"
        />

        {/* Area fill */}
        <polygon
          points={`0,100 ${pathPoints} 100,100`}
          fill={isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
        />
      </svg>

      {/* Labels */}
      <div className="absolute top-0 right-0 text-xs text-muted-foreground">
        {maxEquity.toFixed(1)}
      </div>
      <div className="absolute bottom-0 right-0 text-xs text-muted-foreground">
        {minEquity.toFixed(1)}
      </div>
      <div className="absolute top-1/2 left-2 -translate-y-1/2 text-sm font-semibold">
        <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
          {isPositive ? '+' : ''}
          {(finalEquity - 100).toFixed(1)}
        </span>
      </div>
    </div>
  );
}
