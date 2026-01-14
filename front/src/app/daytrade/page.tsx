'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { PageShell } from '@/components/organisms/PageShell';
import { TradeDialog } from '@/components/organisms/TradeDialog';
import { CostsConfigDialog } from '@/components/organisms/CostsConfigDialog';
import { DayTradeEvolutionChart } from '@/components/molecules/DayTradeEvolutionChart';
import { MepMenChart } from '@/components/molecules/MepMenChart';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type {
  DayTrade,
  DayTradeFormData,
  FuturesAsset,
  CostsConfig,
} from '@/types/daytrade';
import { calculateTradeResult, calculateTradeCosts } from '@/types/daytrade';

type DateFilter = 'today' | 'week' | 'month' | 'all';
type SortColumn = 'entry_time' | 'asset' | 'direction' | 'contracts' | 'entry_price' | 'exit_price' | 'mep_men' | 'result';
type SortDirection = 'asc' | 'desc';

export default function DayTradePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [trades, setTrades] = useState<DayTrade[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCostsDialogOpen, setIsCostsDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<DayTrade | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [assetFilter, setAssetFilter] = useState<FuturesAsset | 'all'>('all');
  const [costsConfig, setCostsConfig] = useState<CostsConfig | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('entry_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Helper to get public URL for trade images
  const getImageUrl = useCallback((path: string) => {
    const { data } = supabase.storage.from('trade-images').getPublicUrl(path);
    return data.publicUrl;
  }, [supabase]);

  const loadCostsConfig = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('daytrade_costs_config')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setCostsConfig(data);
    }
  }, [user, supabase]);

  const loadTrades = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('daytrade_trades')
        .select('*')
        .order('entry_time', { ascending: false });

      const now = new Date();
      if (dateFilter === 'today') {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        query = query.gte('entry_time', startOfDay.toISOString());
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        query = query.gte('entry_time', startOfWeek.toISOString());
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.gte('entry_time', startOfMonth.toISOString());
      }

      if (assetFilter !== 'all') {
        query = query.eq('asset', assetFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      setTrades(data || []);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar trades');
    } finally {
      setInitialLoading(false);
    }
  }, [user, dateFilter, assetFilter]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    loadCostsConfig();
    loadTrades();
  }, [user, authLoading, router, dateFilter, assetFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveTrade = async (data: DayTradeFormData) => {
    if (!user) return;

    const costs = calculateTradeCosts(data.asset, data.contracts, costsConfig ?? undefined);

    let result: number | null = null;
    if (data.exit_price !== undefined) {
      result = calculateTradeResult(
        data.asset,
        data.direction,
        data.contracts,
        data.entry_price,
        data.exit_price,
        costsConfig ?? undefined
      );
    }

    // Handle image upload
    let imagePath: string | null = data.image_path ?? null;

    if (data.image_file) {
      // Upload new image
      const fileExt = data.image_file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('trade-images')
        .upload(fileName, data.image_file);

      if (uploadError) {
        setError('Erro ao fazer upload da imagem');
        return;
      }

      // Delete old image if exists
      if (editingTrade?.image_path) {
        await supabase.storage.from('trade-images').remove([editingTrade.image_path]);
      }

      imagePath = fileName;
    } else if (!data.image_path && editingTrade?.image_path) {
      // Image was removed
      await supabase.storage.from('trade-images').remove([editingTrade.image_path]);
      imagePath = null;
    }

    const tradeData = {
      user_id: user.id,
      asset: data.asset,
      direction: data.direction,
      contracts: data.contracts,
      entry_price: data.entry_price,
      exit_price: data.exit_price ?? null,
      entry_time: new Date(data.entry_time).toISOString(),
      exit_time: data.exit_time ? new Date(data.exit_time).toISOString() : null,
      result,
      costs,
      mep: data.mep ?? null,
      men: data.men ?? null,
      notes: data.notes || null,
      image_path: imagePath,
    };

    if (editingTrade) {
      const { error } = await supabase
        .from('daytrade_trades')
        .update(tradeData)
        .eq('id', editingTrade.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('daytrade_trades')
        .insert(tradeData);

      if (error) throw error;
    }

    setEditingTrade(null);
    await loadTrades();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este trade?')) return;

    try {
      const { error } = await supabase
        .from('daytrade_trades')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTrades(trades.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir trade');
    }
  };

  const handleEdit = (trade: DayTrade) => {
    setEditingTrade(trade);
    setIsDialogOpen(true);
  };

  const handleNewTrade = () => {
    setEditingTrade(null);
    setIsDialogOpen(true);
  };

  const handleSaveCostsConfig = async (winfutCost: number, wdofutCost: number) => {
    if (!user) return;

    const configData = {
      user_id: user.id,
      winfut_cost: winfutCost,
      wdofut_cost: wdofutCost,
    };

    if (costsConfig) {
      const { error } = await supabase
        .from('daytrade_costs_config')
        .update(configData)
        .eq('id', costsConfig.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('daytrade_costs_config')
        .insert(configData);

      if (error) throw error;
    }

    await loadCostsConfig();
  };

  const stats = useMemo(() => {
    const completedTrades = trades.filter((t) => t.result !== null);
    const totalResult = completedTrades.reduce(
      (sum, t) => sum + (t.result || 0),
      0
    );
    const totalCosts = trades.reduce(
      (sum, t) => sum + (t.costs || 0),
      0
    );
    const wins = completedTrades.filter((t) => (t.result || 0) > 0).length;
    const losses = completedTrades.filter((t) => (t.result || 0) < 0).length;
    const winRate =
      completedTrades.length > 0
        ? (wins / completedTrades.length) * 100
        : 0;

    return {
      totalTrades: trades.length,
      completedTrades: completedTrades.length,
      totalResult,
      totalCosts,
      wins,
      losses,
      winRate,
    };
  }, [trades]);

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'entry_time':
          comparison = new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime();
          break;
        case 'asset':
          comparison = a.asset.localeCompare(b.asset);
          break;
        case 'direction':
          comparison = a.direction.localeCompare(b.direction);
          break;
        case 'contracts':
          comparison = a.contracts - b.contracts;
          break;
        case 'entry_price':
          comparison = a.entry_price - b.entry_price;
          break;
        case 'exit_price':
          comparison = (a.exit_price ?? 0) - (b.exit_price ?? 0);
          break;
        case 'mep_men':
          comparison = (a.mep ?? 0) - (b.mep ?? 0);
          break;
        case 'result':
          comparison = (a.result ?? 0) - (b.result ?? 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [trades, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || (initialLoading && !hasLoadedRef.current)) {
    return (
      <PageShell>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header - Typography: 600 weight, tight tracking */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Day Trade</h1>
            <p className="text-[13px] text-muted-foreground">
              Mini contratos futuros
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCostsDialogOpen(true)}
              className="h-8 px-3 text-[13px]"
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Custos
            </Button>
            <Button
              size="sm"
              onClick={handleNewTrade}
              className="h-8 px-3 text-[13px]"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo Trade
            </Button>
          </div>
        </div>

        {/* Filters - Isolated controls with container treatment */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Periodo</span>
            <Select
              value={dateFilter}
              onValueChange={(value: DateFilter) => setDateFilter(value)}
            >
              <SelectTrigger className="h-7 w-[120px] border-0 bg-transparent px-2 text-[13px] focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">Ativo</span>
            <Select
              value={assetFilter}
              onValueChange={(value: FuturesAsset | 'all') => setAssetFilter(value)}
            >
              <SelectTrigger className="h-7 w-[110px] border-0 bg-transparent px-2 text-[13px] focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="WINFUT">WINFUT</SelectItem>
                <SelectItem value="WDOFUT">WDOFUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
            {error}
          </div>
        )}

        {/* Stats - Varied layouts, consistent surface treatment */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Operations - Simple number */}
          <div className="rounded-lg border bg-card p-4">
            <div className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              Operacoes
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">
                {stats.totalTrades}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {stats.completedTrades} fechadas
              </span>
            </div>
          </div>

          {/* Result - Primary metric with color meaning */}
          <div className="rounded-lg border bg-card p-4">
            <div className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              Resultado
            </div>
            <div className="mt-2">
              <span className={cn(
                "text-2xl font-semibold tabular-nums tracking-tight font-mono",
                stats.totalResult >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {formatCurrency(stats.totalResult)}
              </span>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Custos: {formatCurrency(stats.totalCosts)}
              </div>
            </div>
          </div>

          {/* Win Rate - Progress indicator */}
          <div className="rounded-lg border bg-card p-4">
            <div className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              Taxa de Acerto
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={cn(
                "text-2xl font-semibold tabular-nums tracking-tight",
                stats.winRate >= 50 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {stats.winRate.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  stats.winRate >= 50 ? 'bg-emerald-600' : 'bg-red-600'
                )}
                style={{ width: `${Math.min(stats.winRate, 100)}%` }}
              />
            </div>
          </div>

          {/* Wins/Losses - Split layout */}
          <div className="rounded-lg border bg-card p-4">
            <div className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              Wins / Losses
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <ChevronUp className="h-4 w-4 text-emerald-600" />
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-emerald-600">
                  {stats.wins}
                </span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                <ChevronDown className="h-4 w-4 text-red-600" />
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-red-600">
                  {stats.losses}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DayTradeEvolutionChart trades={trades} />
          <MepMenChart trades={trades} assetFilter={assetFilter} />
        </div>

        {/* Table */}
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">
              Nenhum trade registrado
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground/70">
              Adicione seus trades para acompanhar seu desempenho.
            </p>
            <Button
              size="sm"
              className="mt-4 h-8 px-3 text-[13px]"
              onClick={handleNewTrade}
            >
              Registrar Trade
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    className="h-10 cursor-pointer select-none text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('entry_time')}
                  >
                    <div className="flex items-center">
                      Abertura / Fechamento
                      <SortIcon column="entry_time" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="h-10 cursor-pointer select-none text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('asset')}
                  >
                    <div className="flex items-center">
                      Ativo
                      <SortIcon column="asset" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="h-10 cursor-pointer select-none text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('direction')}
                  >
                    <div className="flex items-center">
                      Lado
                      <SortIcon column="direction" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="h-10 cursor-pointer select-none text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('contracts')}
                  >
                    <div className="flex items-center justify-end">
                      Qtd
                      <SortIcon column="contracts" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="h-10 cursor-pointer select-none text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('entry_price')}
                  >
                    <div className="flex items-center justify-end">
                      Entrada
                      <SortIcon column="entry_price" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="h-10 cursor-pointer select-none text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('exit_price')}
                  >
                    <div className="flex items-center justify-end">
                      Saida
                      <SortIcon column="exit_price" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="h-10 cursor-pointer select-none text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('mep_men')}
                  >
                    <div className="flex items-center justify-center">
                      MEP/MEN
                      <SortIcon column="mep_men" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="h-10 cursor-pointer select-none text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('result')}
                  >
                    <div className="flex items-center justify-end">
                      P&L
                      <SortIcon column="result" />
                    </div>
                  </TableHead>
                  <TableHead className="h-10 w-[80px] text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTrades.map((trade) => (
                  <TableRow key={trade.id} className="group">
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-0.5 font-mono text-[12px] tabular-nums">
                        <span>{formatDateTime(trade.entry_time)}</span>
                        <span className="text-muted-foreground">
                          {trade.exit_time ? formatDateTime(trade.exit_time) : '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium">
                        {trade.asset}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[13px] font-medium',
                          trade.direction === 'BUY'
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        )}
                      >
                        {trade.direction === 'BUY' ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        {trade.direction === 'BUY' ? 'C' : 'V'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono text-[13px] tabular-nums">
                      {trade.contracts}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono text-[13px] tabular-nums">
                      {trade.entry_price.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono text-[13px] tabular-nums text-muted-foreground">
                      {trade.exit_price
                        ? trade.exit_price.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {trade.mep !== null || trade.men !== null ? (
                        <span className="font-mono text-[12px] tabular-nums">
                          <span className="text-emerald-600">
                            {trade.mep !== null ? trade.mep.toFixed(1) : '—'}
                          </span>
                          <span className="mx-1 text-muted-foreground/50">/</span>
                          <span className="text-red-600">
                            {trade.men !== null ? trade.men.toFixed(1) : '—'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      {trade.result !== null ? (
                        <span
                          className={cn(
                            'font-mono text-[13px] font-medium tabular-nums',
                            trade.result >= 0
                              ? 'text-emerald-600'
                              : 'text-red-600'
                          )}
                        >
                          {trade.result >= 0 ? '+' : ''}{formatCurrency(trade.result)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">Aberto</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Image icon - always visible when trade has image */}
                        {trade.image_path && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary/70 hover:text-primary"
                            onClick={() => setViewingImage(getImageUrl(trade.image_path!))}
                            title="Ver imagem"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* Actions - visible on hover */}
                        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(trade)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(trade.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <TradeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveTrade}
        trade={editingTrade}
        getImageUrl={getImageUrl}
      />

      <CostsConfigDialog
        open={isCostsDialogOpen}
        onOpenChange={setIsCostsDialogOpen}
        costsConfig={costsConfig}
        onSave={handleSaveCostsConfig}
      />

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className="max-w-[95vw] border-0 bg-transparent p-0 shadow-none sm:max-w-[90vw]">
          <DialogTitle className="sr-only">Imagem da operacao</DialogTitle>
          <DialogDescription className="sr-only">
            Visualizacao da imagem anexada ao trade
          </DialogDescription>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-2 -top-10 h-8 w-8 rounded-full bg-background/80 text-foreground hover:bg-background"
              onClick={() => setViewingImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {viewingImage && (
              <img
                src={viewingImage}
                alt="Imagem da operacao"
                className="max-h-[92vh] w-full rounded-lg object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
