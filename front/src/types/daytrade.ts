export type TradeDirection = 'BUY' | 'SELL';
export type FuturesAsset = 'WINFUT' | 'WDOFUT';

// ==================== FILTER TYPES ====================

export type DayTradeDatePreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '15d'
  | '30d'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'ytd'
  | 'custom';

export type ResultFilter = 'all' | 'positive' | 'negative';
export type DirectionFilter = 'all' | 'BUY' | 'SELL';
export type PlanAdherenceFilter =
  | 'all'
  | 'with_plan'
  | 'without_plan'
  | 'respected_stop'
  | 'hit_target'
  | 'exceeded_stop';

export interface DayTradeFilters {
  datePreset: DayTradeDatePreset;
  customDateRange?: { from: Date; to: Date };
  asset: FuturesAsset | 'all';
  result: ResultFilter;
  direction: DirectionFilter;
  planAdherence: PlanAdherenceFilter;
}

export const DAYTRADE_DATE_PRESETS: { key: DayTradeDatePreset; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: '7d', label: '7 dias' },
  { key: '15d', label: '15 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'this_week', label: 'Esta semana' },
  { key: 'last_week', label: 'Semana passada' },
  { key: 'this_month', label: 'Este mes' },
  { key: 'last_month', label: 'Mes passado' },
  { key: 'ytd', label: 'Este ano' },
];

export const RESULT_FILTER_OPTIONS: { key: ResultFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'positive', label: 'Ganhos' },
  { key: 'negative', label: 'Perdas' },
];

export const DIRECTION_FILTER_OPTIONS: { key: DirectionFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'BUY', label: 'Compra' },
  { key: 'SELL', label: 'Venda' },
];

export const PLAN_ADHERENCE_OPTIONS: { key: PlanAdherenceFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'with_plan', label: 'Com plano' },
  { key: 'without_plan', label: 'Sem plano' },
  { key: 'respected_stop', label: 'Respeitou stop' },
  { key: 'hit_target', label: 'Atingiu alvo' },
  { key: 'exceeded_stop', label: 'Estourou stop' },
];

export const DEFAULT_DAYTRADE_FILTERS: DayTradeFilters = {
  datePreset: 'today',
  asset: 'all',
  result: 'all',
  direction: 'all',
  planAdherence: 'all',
};

export interface DayTrade {
  id: string;
  user_id: string;
  asset: FuturesAsset;
  direction: TradeDirection;
  contracts: number;
  entry_price: number;
  exit_price: number | null;
  entry_time: string;
  exit_time: string | null;
  result: number | null;
  costs: number;
  mep: number | null; // Maxima Excursao Positiva
  men: number | null; // Maxima Excursao Negativa
  stop_price: number | null; // Preco de stop loss planejado
  partial_price: number | null; // Preco de realizacao parcial planejado
  target_price: number | null; // Preco alvo planejado
  notes: string | null;
  image_path: string | null; // Caminho da imagem no storage
  created_at: string;
  updated_at: string;
}

export interface CostsConfig {
  id: string;
  user_id: string;
  winfut_cost: number;
  wdofut_cost: number;
  created_at: string;
  updated_at: string;
}

// Custos padrão da B3 por contrato (em reais)
export const DEFAULT_COSTS: Record<FuturesAsset, number> = {
  WINFUT: 0.30, // Emolumentos + Registro
  WDOFUT: 0.50, // Emolumentos + Registro
};

export interface DayTradeFormData {
  asset: FuturesAsset;
  direction: TradeDirection;
  contracts: number;
  entry_price: number;
  exit_price?: number;
  entry_time: string;
  exit_time?: string;
  mep?: number; // Maxima Excursao Positiva (em pontos)
  men?: number; // Maxima Excursao Negativa (em pontos)
  stop_price?: number; // Preco de stop loss planejado
  partial_price?: number; // Preco de realizacao parcial planejado
  target_price?: number; // Preco alvo planejado
  notes?: string;
  image_path?: string; // Caminho da imagem existente
  image_file?: File; // Arquivo de imagem para upload
}

// Pontos por tick para cada ativo
export const TICK_VALUES: Record<FuturesAsset, number> = {
  WINFUT: 0.20, // Mini índice: R$ 0,20 por ponto
  WDOFUT: 10.00, // Mini dólar: R$ 10,00 por ponto
};

// Calcula os custos operacionais do trade
export function calculateTradeCosts(
  asset: FuturesAsset,
  contracts: number,
  costsConfig?: CostsConfig
): number {
  // Usa custos configurados pelo usuario ou valores padrao
  const costPerContract = costsConfig
    ? asset === 'WINFUT'
      ? costsConfig.winfut_cost
      : costsConfig.wdofut_cost
    : DEFAULT_COSTS[asset];

  // Custo por contrato x quantidade de contratos x 2 (entrada + saida)
  return costPerContract * contracts * 2;
}

// Calcula o resultado bruto do trade (sem custos)
export function calculateTradeGrossResult(
  asset: FuturesAsset,
  direction: TradeDirection,
  contracts: number,
  entryPrice: number,
  exitPrice: number
): number {
  const tickValue = TICK_VALUES[asset];
  const pointsDiff = exitPrice - entryPrice;
  const directionMultiplier = direction === 'BUY' ? 1 : -1;
  return pointsDiff * directionMultiplier * contracts * tickValue;
}

// Calcula o resultado liquido do trade (com custos)
export function calculateTradeResult(
  asset: FuturesAsset,
  direction: TradeDirection,
  contracts: number,
  entryPrice: number,
  exitPrice: number,
  costsConfig?: CostsConfig
): number {
  const grossResult = calculateTradeGrossResult(
    asset,
    direction,
    contracts,
    entryPrice,
    exitPrice
  );
  const costs = calculateTradeCosts(asset, contracts, costsConfig);
  return grossResult - costs;
}

// ==================== MULTIPLE EXITS SYSTEM ====================

// Tipos de saida
export type ExitType = 'PARTIAL' | 'TARGET' | 'STOP' | 'BREAKEVEN' | 'TIME_STOP';

// Status do trade
export type TradeStatus = 'OPEN' | 'PARTIAL' | 'CLOSED';

// Labels para tipos de saida
export const EXIT_TYPE_LABELS: Record<ExitType, string> = {
  PARTIAL: 'Parcial',
  TARGET: 'Alvo',
  STOP: 'Stop',
  BREAKEVEN: 'Breakeven',
  TIME_STOP: 'Stop por Tempo',
};

// Cores para tipos de saida
export const EXIT_TYPE_COLORS: Record<ExitType, string> = {
  PARTIAL: '#f59e0b', // amber
  TARGET: '#10b981', // emerald
  STOP: '#ef4444', // red
  BREAKEVEN: '#6b7280', // gray
  TIME_STOP: '#8b5cf6', // violet
};

// Saida planejada (plano operacional)
export interface PlannedExit {
  id: string;
  trade_id: string;
  user_id: string;
  order: number; // Sequencia: 1, 2, 3...
  exit_type: ExitType;
  price: number;
  contracts: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Saida real executada
export interface ActualExit {
  id: string;
  trade_id: string;
  user_id: string;
  planned_exit_id?: string | null; // Vinculo com plano
  exit_type: ExitType;
  price: number;
  contracts: number;
  exit_time: string;
  result: number; // P&L em R$
  points: number; // Pontos capturados
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Form data para saidas planejadas (sem id e timestamps)
export interface PlannedExitFormData {
  order: number;
  exit_type: ExitType;
  price: number;
  contracts: number;
  notes?: string;
}

// Form data para saidas reais
export interface ActualExitFormData {
  planned_exit_id?: string | null;
  exit_type: ExitType;
  price: number;
  contracts: number;
  exit_time: string;
  notes?: string;
}

// Trade com saidas incluidas
export interface DayTradeWithExits extends DayTrade {
  planned_exits: PlannedExit[];
  actual_exits: ActualExit[];
  status: TradeStatus;
}

// Form data atualizado para incluir saidas planejadas
export interface DayTradeFormDataWithExits extends DayTradeFormData {
  planned_exits?: PlannedExitFormData[];
  status?: TradeStatus;
}

// Metricas calculadas por trade
export interface TradeExitMetrics {
  remaining_contracts: number;
  total_planned_contracts: number;
  total_actual_contracts: number;
  plan_adherence_score: number; // 0-100
  points_left_on_table: number; // MEP - pontos capturados
  actual_rr: number; // R:R efetivamente alcancado
  partial_efficiency: number; // % das parciais planejadas executadas
  average_exit_price: number; // Preco medio de saida
  total_result: number; // Resultado total de todas as saidas
}

// Calcula os pontos capturados de uma saida
export function calculateExitPoints(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number
): number {
  const pointsDiff = exitPrice - entryPrice;
  return direction === 'BUY' ? pointsDiff : -pointsDiff;
}

// Calcula o resultado de uma saida individual
export function calculateExitResult(
  asset: FuturesAsset,
  direction: TradeDirection,
  contracts: number,
  entryPrice: number,
  exitPrice: number,
  costsConfig?: CostsConfig
): { result: number; points: number } {
  const points = calculateExitPoints(direction, entryPrice, exitPrice);
  const tickValue = TICK_VALUES[asset];
  const grossResult = points * contracts * tickValue;
  const costs = calculateTradeCosts(asset, contracts, costsConfig);
  return {
    result: grossResult - costs,
    points,
  };
}

// Calcula metricas de saida para um trade
export function calculateTradeExitMetrics(
  trade: DayTradeWithExits,
  entryPrice: number
): TradeExitMetrics {
  const totalPlannedContracts = trade.planned_exits.reduce(
    (sum, exit) => sum + exit.contracts,
    0
  );
  const totalActualContracts = trade.actual_exits.reduce(
    (sum, exit) => sum + exit.contracts,
    0
  );
  const remainingContracts = trade.contracts - totalActualContracts;

  // Calcula resultado total de todas as saidas
  const totalResult = trade.actual_exits.reduce(
    (sum, exit) => sum + exit.result,
    0
  );

  // Calcula preco medio de saida ponderado por contratos
  const avgExitPrice =
    totalActualContracts > 0
      ? trade.actual_exits.reduce(
          (sum, exit) => sum + exit.price * exit.contracts,
          0
        ) / totalActualContracts
      : 0;

  // Pontos capturados medio
  const avgPoints =
    totalActualContracts > 0
      ? trade.actual_exits.reduce(
          (sum, exit) => sum + exit.points * exit.contracts,
          0
        ) / totalActualContracts
      : 0;

  // Pontos deixados na mesa (MEP - pontos capturados)
  const pointsLeftOnTable = trade.mep !== null ? trade.mep - avgPoints : 0;

  // Eficiencia de parciais: % de saidas PARTIAL planejadas que foram executadas
  const plannedPartials = trade.planned_exits.filter(
    (e) => e.exit_type === 'PARTIAL'
  );
  const actualPartials = trade.actual_exits.filter(
    (e) => e.exit_type === 'PARTIAL'
  );
  const partialEfficiency =
    plannedPartials.length > 0
      ? (actualPartials.length / plannedPartials.length) * 100
      : 100;

  // Score de aderencia ao plano (0-100)
  let planAdherenceScore = 100;
  if (trade.planned_exits.length > 0) {
    const matchedExits = trade.actual_exits.filter(
      (ae) => ae.planned_exit_id !== null
    );
    planAdherenceScore =
      (matchedExits.length / trade.planned_exits.length) * 100;
  }

  // R:R realizado
  const plannedStop = trade.planned_exits.find((e) => e.exit_type === 'STOP');
  let actualRR = 0;
  if (plannedStop && totalActualContracts > 0) {
    const riskPoints = Math.abs(entryPrice - plannedStop.price);
    if (riskPoints > 0) {
      actualRR = avgPoints / riskPoints;
    }
  }

  return {
    remaining_contracts: remainingContracts,
    total_planned_contracts: totalPlannedContracts,
    total_actual_contracts: totalActualContracts,
    plan_adherence_score: planAdherenceScore,
    points_left_on_table: pointsLeftOnTable,
    actual_rr: actualRR,
    partial_efficiency: partialEfficiency,
    average_exit_price: avgExitPrice,
    total_result: totalResult,
  };
}
