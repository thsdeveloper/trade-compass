'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { PageShell } from '@/components/organisms/PageShell';
import { TradeDialog, type DayTradeFormDataWithExits } from '@/components/organisms/TradeDialog';
import { CostsConfigDialog } from '@/components/organisms/CostsConfigDialog';
import { ImportTradesDialog, type TradeToImport } from '@/components/organisms/ImportTradesDialog';
import { ExitExecutionDialog } from '@/components/organisms/ExitExecutionDialog';
import { DayTradeEvolutionChart } from '@/components/molecules/DayTradeEvolutionChart';
import { MepMenChart } from '@/components/molecules/MepMenChart';
import { TradePlanChart } from '@/components/molecules/TradePlanChart';
import { DayTradeFilterBar } from '@/components/molecules/DayTradeFilterBar';
import { ExitTimeline } from '@/components/molecules/ExitTimeline';
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
  Plus,
  Trash2,
  Edit2,
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  X,
  Upload,
  LogOut,
  ListTree,
} from 'lucide-react';
import { DaytradePageSkeleton } from '@/components/organisms/skeletons/DaytradePageSkeleton';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type {
  DayTrade,
  DayTradeFormData,
  CostsConfig,
  DayTradeFilters,
  PlannedExit,
  ActualExit,
  DayTradeWithExits,
  ActualExitFormData,
  TradeStatus,
} from '@/types/daytrade';
import {
  calculateTradeResult,
  calculateTradeCosts,
  DEFAULT_DAYTRADE_FILTERS,
  calculateExitResult,
  calculateTradeExitMetrics,
} from '@/types/daytrade';
import { getDayTradeDateRange } from '@/lib/date-utils';

type SortColumn = 'entry_time' | 'asset' | 'direction' | 'contracts' | 'entry_price' | 'exit_price' | 'mep_men' | 'result';
type SortDirection = 'asc' | 'desc';

// Extended trade type with exits
type TradeWithExits = DayTrade & {
  planned_exits: PlannedExit[];
  actual_exits: ActualExit[];
  status: TradeStatus;
};

export default function DayTradePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [trades, setTrades] = useState<TradeWithExits[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCostsDialogOpen, setIsCostsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [isExitTimelineOpen, setIsExitTimelineOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeWithExits | null>(null);
  const [exitingTrade, setExitingTrade] = useState<TradeWithExits | null>(null);
  const [viewingTimelineTrade, setViewingTimelineTrade] = useState<TradeWithExits | null>(null);
  const [filters, setFilters] = useState<DayTradeFilters>(DEFAULT_DAYTRADE_FILTERS);
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

      // Apply date range filter
      const dateRange = getDayTradeDateRange(filters.datePreset, filters.customDateRange);
      const startDate = new Date(dateRange.from);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);

      query = query
        .gte('entry_time', startDate.toISOString())
        .lte('entry_time', endDate.toISOString());

      // Apply asset filter
      if (filters.asset !== 'all') {
        query = query.eq('asset', filters.asset);
      }

      // Apply direction filter
      if (filters.direction !== 'all') {
        query = query.eq('direction', filters.direction);
      }

      // Apply result filter (positive/negative)
      if (filters.result === 'positive') {
        query = query.gt('result', 0);
      } else if (filters.result === 'negative') {
        query = query.lt('result', 0);
      }

      const { data: tradesData, error: queryError } = await query;

      if (queryError) throw queryError;

      // Load exits for all trades
      const tradeIds = (tradesData || []).map((t) => t.id);

      let plannedExits: PlannedExit[] = [];
      let actualExits: ActualExit[] = [];

      if (tradeIds.length > 0) {
        const [plannedRes, actualRes] = await Promise.all([
          supabase
            .from('daytrade_planned_exits')
            .select('*')
            .in('trade_id', tradeIds)
            .order('order', { ascending: true }),
          supabase
            .from('daytrade_actual_exits')
            .select('*')
            .in('trade_id', tradeIds)
            .order('exit_time', { ascending: true }),
        ]);

        plannedExits = plannedRes.data || [];
        actualExits = actualRes.data || [];
      }

      // Map exits to trades
      const tradesWithExits: TradeWithExits[] = (tradesData || []).map((trade) => ({
        ...trade,
        planned_exits: plannedExits.filter((e) => e.trade_id === trade.id),
        actual_exits: actualExits.filter((e) => e.trade_id === trade.id),
        status: (trade.status || 'OPEN') as TradeStatus,
      }));

      setTrades(tradesWithExits);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar trades');
    } finally {
      setInitialLoading(false);
    }
  }, [user, filters, supabase]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    loadCostsConfig();
    loadTrades();
  }, [user, authLoading, router, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveTrade = async (data: DayTradeFormDataWithExits) => {
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

    // Determine status based on exits
    let status: TradeStatus = 'OPEN';
    if (data.exit_price !== undefined) {
      status = 'CLOSED';
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
      stop_price: data.stop_price ?? null,
      partial_price: data.partial_price ?? null,
      target_price: data.target_price ?? null,
      notes: data.notes || null,
      image_path: imagePath,
      status,
    };

    let tradeId: string;

    if (editingTrade) {
      const { error } = await supabase
        .from('daytrade_trades')
        .update(tradeData)
        .eq('id', editingTrade.id);

      if (error) throw error;
      tradeId = editingTrade.id;

      // Delete existing planned exits if we have new ones
      if (data.planned_exits) {
        await supabase
          .from('daytrade_planned_exits')
          .delete()
          .eq('trade_id', editingTrade.id);
      }
    } else {
      const { data: insertedTrade, error } = await supabase
        .from('daytrade_trades')
        .insert(tradeData)
        .select('id')
        .single();

      if (error) throw error;
      tradeId = insertedTrade.id;
    }

    // Insert planned exits if provided
    if (data.planned_exits && data.planned_exits.length > 0) {
      const plannedExitsData = data.planned_exits.map((exit) => ({
        trade_id: tradeId,
        user_id: user.id,
        order: exit.order,
        exit_type: exit.exit_type,
        price: exit.price,
        contracts: exit.contracts,
        notes: exit.notes || null,
      }));

      const { error: exitsError } = await supabase
        .from('daytrade_planned_exits')
        .insert(plannedExitsData);

      if (exitsError) {
        console.error('Erro ao salvar saidas planejadas:', exitsError);
      }
    }

    setEditingTrade(null);
    await loadTrades();
  };

  // Handle registering actual exit
  const handleRegisterExit = async (data: ActualExitFormData) => {
    if (!user || !exitingTrade) return;

    const exitResult = calculateExitResult(
      exitingTrade.asset,
      exitingTrade.direction,
      data.contracts,
      exitingTrade.entry_price,
      data.price,
      costsConfig ?? undefined
    );

    const actualExitData = {
      trade_id: exitingTrade.id,
      user_id: user.id,
      planned_exit_id: data.planned_exit_id || null,
      exit_type: data.exit_type,
      price: data.price,
      contracts: data.contracts,
      exit_time: new Date(data.exit_time).toISOString(),
      result: exitResult.result,
      points: exitResult.points,
      notes: data.notes || null,
    };

    const { error } = await supabase
      .from('daytrade_actual_exits')
      .insert(actualExitData);

    if (error) throw error;

    // Calculate new totals
    const totalExitedContracts =
      exitingTrade.actual_exits.reduce((sum, e) => sum + e.contracts, 0) +
      data.contracts;
    const remainingAfterExit = exitingTrade.contracts - totalExitedContracts;

    // Update trade status and result
    let newStatus: TradeStatus = 'PARTIAL';
    if (remainingAfterExit <= 0) {
      newStatus = 'CLOSED';
    }

    // Calculate total result from all exits
    const totalResult =
      exitingTrade.actual_exits.reduce((sum, e) => sum + e.result, 0) +
      exitResult.result;

    // Calculate weighted average exit price
    const totalContracts = totalExitedContracts;
    const avgExitPrice =
      (exitingTrade.actual_exits.reduce((sum, e) => sum + e.price * e.contracts, 0) +
        data.price * data.contracts) /
      totalContracts;

    // Update trade with new values
    const updateData: Record<string, unknown> = {
      status: newStatus,
      result: totalResult,
    };

    // If fully closed, set exit_price and exit_time
    if (newStatus === 'CLOSED') {
      updateData.exit_price = avgExitPrice;
      updateData.exit_time = new Date(data.exit_time).toISOString();
    }

    await supabase
      .from('daytrade_trades')
      .update(updateData)
      .eq('id', exitingTrade.id);

    setExitingTrade(null);
    await loadTrades();
  };

  // Calculate remaining contracts for a trade
  const getRemainingContracts = (trade: TradeWithExits): number => {
    const totalExited = trade.actual_exits.reduce((sum, e) => sum + e.contracts, 0);
    return trade.contracts - totalExited;
  };

  // Open exit dialog
  const handleOpenExitDialog = (trade: TradeWithExits) => {
    setExitingTrade(trade);
    setIsExitDialogOpen(true);
  };

  // Open timeline dialog
  const handleOpenTimeline = (trade: TradeWithExits) => {
    setViewingTimelineTrade(trade);
    setIsExitTimelineOpen(true);
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

  const handleEdit = (trade: TradeWithExits) => {
    setEditingTrade(trade);
    setIsDialogOpen(true);
  };

  const handleNewTrade = () => {
    setEditingTrade(null);
    setIsDialogOpen(true);
  };

  const handleImportTrades = async (tradesToImport: TradeToImport[]) => {
    if (!user) return;

    for (const trade of tradesToImport) {
      const costs = calculateTradeCosts(trade.asset, trade.contracts, costsConfig ?? undefined);

      if (trade.status === 'update' && trade.existingTradeId) {
        // UPDATE: atualizar apenas os campos do CSV, preservando campos manuais
        const updateData = {
          entry_price: trade.entry_price,
          exit_price: trade.exit_price,
          entry_time: trade.entry_time,
          exit_time: trade.exit_time,
          result: trade.result,
          costs,
          mep: trade.mep,
          men: trade.men,
          // Campos manuais (stop, parcial, alvo, notes, image) NAO sao alterados
        };

        const { error } = await supabase
          .from('daytrade_trades')
          .update(updateData)
          .eq('id', trade.existingTradeId);

        if (error) {
          console.error('Erro ao atualizar trade:', error);
          throw new Error(`Erro ao atualizar operacao: ${error.message}`);
        }
      } else {
        // INSERT: criar novo trade
        const tradeData = {
          user_id: user.id,
          asset: trade.asset,
          direction: trade.direction,
          contracts: trade.contracts,
          entry_price: trade.entry_price,
          exit_price: trade.exit_price,
          entry_time: trade.entry_time,
          exit_time: trade.exit_time,
          result: trade.result,
          costs,
          mep: trade.mep,
          men: trade.men,
          stop_price: null,
          partial_price: null,
          target_price: null,
          notes: null,
          image_path: null,
        };

        const { error } = await supabase
          .from('daytrade_trades')
          .insert(tradeData);

        if (error) {
          console.error('Erro ao importar trade:', error);
          throw new Error(`Erro ao importar operacao: ${error.message}`);
        }
      }
    }

    await loadTrades();
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

  // Metricas de aderencia ao plano operacional
  const planStats = useMemo(() => {
    const completedTrades = trades.filter((t) => t.result !== null);

    // Trades com plano (legado ou novo sistema)
    const tradesComPlanoLegado = completedTrades.filter(
      (t) => t.stop_price !== null || t.target_price !== null
    );
    const tradesComPlanoNovo = completedTrades.filter(
      (t) => t.planned_exits.length > 0
    );
    const tradesComPlano = completedTrades.filter(
      (t) =>
        t.stop_price !== null ||
        t.target_price !== null ||
        t.planned_exits.length > 0
    );

    if (tradesComPlano.length === 0) {
      return {
        tradesComPlano: 0,
        totalTrades: completedTrades.length,
        aderenciaStop: 0,
        aderenciaAlvo: 0,
        rrPlanejado: 0,
        tradesComMultiplasExits: 0,
        avgPlanAdherence: 0,
      };
    }

    // Aderencia ao Stop (trades perdedores que respeitaram o stop) - LEGADO
    const tradesPerdedoresComStop = tradesComPlanoLegado.filter(
      (t) => t.stop_price !== null && t.result !== null && t.result < 0 && t.exit_price !== null
    );
    let aderenciaStop = 0;
    if (tradesPerdedoresComStop.length > 0) {
      const respeitouStop = tradesPerdedoresComStop.filter((t) => {
        const stopDistance = Math.abs(t.entry_price - t.stop_price!);
        const exitDistance = Math.abs(t.entry_price - t.exit_price!);
        return exitDistance <= stopDistance * 1.1; // 10% tolerancia
      });
      aderenciaStop = (respeitouStop.length / tradesPerdedoresComStop.length) * 100;
    }

    // Aderencia ao Alvo (trades vencedores que atingiram o alvo) - LEGADO
    const tradesVencedoresComAlvo = tradesComPlanoLegado.filter(
      (t) => t.target_price !== null && t.result !== null && t.result > 0 && t.exit_price !== null
    );
    let aderenciaAlvo = 0;
    if (tradesVencedoresComAlvo.length > 0) {
      const atingiuAlvo = tradesVencedoresComAlvo.filter((t) => {
        if (t.direction === 'BUY') {
          return t.exit_price! >= t.target_price! * 0.95;
        } else {
          return t.exit_price! <= t.target_price! * 1.05;
        }
      });
      aderenciaAlvo = (atingiuAlvo.length / tradesVencedoresComAlvo.length) * 100;
    }

    // R:R Planejado medio - LEGADO
    const tradesComRR = tradesComPlanoLegado.filter(
      (t) => t.stop_price !== null && t.target_price !== null
    );
    let rrPlanejado = 0;
    if (tradesComRR.length > 0) {
      const rrValues = tradesComRR.map((t) => {
        const risco = Math.abs(t.entry_price - t.stop_price!);
        const retorno = Math.abs(t.target_price! - t.entry_price);
        return risco > 0 ? retorno / risco : 0;
      });
      rrPlanejado = rrValues.reduce((a, b) => a + b, 0) / rrValues.length;
    }

    // Metricas do novo sistema de exits
    const tradesComMultiplasExits = tradesComPlanoNovo.filter(
      (t) => t.actual_exits.length > 1
    ).length;

    // Aderencia media ao plano (para trades com novo sistema)
    let avgPlanAdherence = 0;
    if (tradesComPlanoNovo.length > 0) {
      const adherenceScores = tradesComPlanoNovo.map((t) => {
        if (t.planned_exits.length === 0) return 100;
        const matchedExits = t.actual_exits.filter((ae) => ae.planned_exit_id !== null);
        return (matchedExits.length / t.planned_exits.length) * 100;
      });
      avgPlanAdherence = adherenceScores.reduce((a, b) => a + b, 0) / tradesComPlanoNovo.length;
    }

    return {
      tradesComPlano: tradesComPlano.length,
      totalTrades: completedTrades.length,
      aderenciaStop,
      aderenciaAlvo,
      rrPlanejado,
      tradesComMultiplasExits,
      avgPlanAdherence,
    };
  }, [trades]);

  // Apply client-side filtering for planAdherence (complex logic)
  const filteredTrades = useMemo(() => {
    if (filters.planAdherence === 'all') return trades;

    return trades.filter((trade) => {
      const hasPlan = trade.stop_price !== null || trade.target_price !== null;

      switch (filters.planAdherence) {
        case 'with_plan':
          return hasPlan;
        case 'without_plan':
          return !hasPlan;
        case 'respected_stop':
          // Trade perdedor que respeitou o stop (saiu dentro da tolerancia)
          if (trade.stop_price === null || trade.result === null || trade.result >= 0 || trade.exit_price === null) {
            return false;
          }
          const stopDistance = Math.abs(trade.entry_price - trade.stop_price);
          const exitDistance = Math.abs(trade.entry_price - trade.exit_price);
          return exitDistance <= stopDistance * 1.1; // 10% tolerancia
        case 'hit_target':
          // Trade vencedor que atingiu o alvo
          if (trade.target_price === null || trade.result === null || trade.result <= 0 || trade.exit_price === null) {
            return false;
          }
          if (trade.direction === 'BUY') {
            return trade.exit_price >= trade.target_price * 0.95;
          } else {
            return trade.exit_price <= trade.target_price * 1.05;
          }
        case 'exceeded_stop':
          // Trade perdedor que estourou o stop
          if (trade.stop_price === null || trade.result === null || trade.result >= 0 || trade.exit_price === null) {
            return false;
          }
          const stopDist = Math.abs(trade.entry_price - trade.stop_price);
          const exitDist = Math.abs(trade.entry_price - trade.exit_price);
          return exitDist > stopDist * 1.1;
        default:
          return true;
      }
    });
  }, [trades, filters.planAdherence]);

  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
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
  }, [filteredTrades, sortColumn, sortDirection]);

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
    return <DaytradePageSkeleton />;
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
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              className="h-8 px-3 text-[13px]"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Importar CSV
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

        {/* Filters */}
        <DayTradeFilterBar filters={filters} onFiltersChange={setFilters} />

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

          {/* Aderencia ao Plano */}
          <div className="rounded-lg border bg-card p-4">
            <div className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              Aderencia ao Plano
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Trades c/ plano</span>
                <span className="text-[12px] font-medium tabular-nums">
                  {planStats.tradesComPlano}/{planStats.totalTrades}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Respeitou stop</span>
                <span className={cn(
                  "text-[12px] font-medium tabular-nums",
                  planStats.aderenciaStop >= 80 ? 'text-emerald-600' :
                  planStats.aderenciaStop >= 60 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {planStats.aderenciaStop.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Atingiu alvo</span>
                <span className={cn(
                  "text-[12px] font-medium tabular-nums",
                  planStats.aderenciaAlvo >= 50 ? 'text-emerald-600' :
                  planStats.aderenciaAlvo >= 30 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {planStats.aderenciaAlvo.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">R:R planejado</span>
                <span className="text-[12px] font-medium tabular-nums">
                  1:{planStats.rrPlanejado.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DayTradeEvolutionChart trades={trades} />
          <MepMenChart trades={trades} assetFilter={filters.asset} />
        </div>

        {/* Grafico de Plano vs Execucao */}
        <div className="grid gap-4 lg:grid-cols-2">
          <TradePlanChart trades={trades} assetFilter={filters.asset} />
        </div>

        {/* Table */}
        {filteredTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
            <p className="text-[13px] font-medium text-muted-foreground">
              {trades.length === 0 ? 'Nenhum trade registrado' : 'Nenhum trade encontrado com os filtros atuais'}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground/70">
              {trades.length === 0
                ? 'Adicione seus trades para acompanhar seu desempenho.'
                : 'Tente ajustar os filtros para ver mais resultados.'}
            </p>
            {trades.length === 0 && (
              <Button
                size="sm"
                className="mt-4 h-8 px-3 text-[13px]"
                onClick={handleNewTrade}
              >
                Registrar Trade
              </Button>
            )}
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
                        {/* Exit info - show exits count or remaining */}
                        {(trade.actual_exits.length > 0 || trade.planned_exits.length > 0) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary/70 hover:text-primary"
                            onClick={() => handleOpenTimeline(trade)}
                            title={`${trade.actual_exits.length} saidas | ${trade.planned_exits.length} planejadas`}
                          >
                            <ListTree className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* Register exit button for open/partial trades */}
                        {trade.status !== 'CLOSED' && getRemainingContracts(trade) > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-amber-600 hover:text-amber-700"
                            onClick={() => handleOpenExitDialog(trade)}
                            title={`Registrar saida (${getRemainingContracts(trade)} cts restantes)`}
                          >
                            <LogOut className="h-3.5 w-3.5" />
                          </Button>
                        )}
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

      <ImportTradesDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImport={handleImportTrades}
        existingTrades={trades}
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

      {/* Exit Execution Dialog */}
      {exitingTrade && (
        <ExitExecutionDialog
          open={isExitDialogOpen}
          onOpenChange={(open) => {
            setIsExitDialogOpen(open);
            if (!open) setExitingTrade(null);
          }}
          onSave={handleRegisterExit}
          trade={exitingTrade as DayTradeWithExits}
          remainingContracts={getRemainingContracts(exitingTrade)}
        />
      )}

      {/* Exit Timeline Dialog */}
      <Dialog
        open={isExitTimelineOpen}
        onOpenChange={(open) => {
          setIsExitTimelineOpen(open);
          if (!open) setViewingTimelineTrade(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Historico de Saidas
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              {viewingTimelineTrade && (
                <>
                  {viewingTimelineTrade.asset} -{' '}
                  {viewingTimelineTrade.direction === 'BUY' ? 'Compra' : 'Venda'} x
                  {viewingTimelineTrade.contracts}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {viewingTimelineTrade && (
            <ExitTimeline trade={viewingTimelineTrade as DayTradeWithExits} />
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
