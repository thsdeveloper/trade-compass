// Candle OHLCV
export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Resultado do MACD
export interface MACDResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

// Resposta do endpoint de candles
export interface CandlesResponse {
  ticker: string;
  candles: Candle[];
  indicators: {
    ema8: (number | null)[];
    ema80: (number | null)[];
    macd: MACDResult[];
  };
}

// Tipos de zona de decisao
export type DecisionZone = 'FAVORAVEL' | 'NEUTRA' | 'RISCO';

// Status dos setups
export type SetupStatus = 'ATIVO' | 'EM_FORMACAO' | 'INVALIDO';

// Tendencia do ativo
export type Trend = 'Alta' | 'Baixa' | 'Lateral';

// Volume relativo
export type Volume = 'Abaixo' | 'Normal' | 'Acima';

// Nivel de volatilidade
export type Volatility = 'Baixa' | 'Media' | 'Alta';

// Nivel de risco
export type RiskLevel = 'Baixo' | 'Moderado' | 'Alto';

// Resumo do ativo
export interface AssetSummary {
  ticker: string;
  name: string;
  price: number;
  updatedAt: string;
}

// Contexto do ativo
export interface AssetContext {
  trend: Trend;
  volume: Volume;
  volatility: Volatility;
}

// Resultado da zona de decisao
export interface DecisionZoneResult {
  zone: DecisionZone;
  message: string;
  reasons: string[];
}

// Setup de trading
export interface Setup {
  id: string;
  title: string;
  status: SetupStatus;
  successRate: number;
  risk: RiskLevel;
  stopSuggestion: string;
  targetNote: string;
  explanation: string;
  signals: string[];
  meta: Record<string, number>;
}

// Resposta completa da API de analise
export interface AnalysisResponse {
  summary: AssetSummary;
  context: AssetContext;
  decisionZone: DecisionZoneResult;
  setups: Setup[];
}

// Item da watchlist
export interface WatchlistItem {
  ticker: string;
  name: string;
  zone: DecisionZone;
}

// Alerta
export interface Alert {
  id: string;
  ticker: string;
  title: string;
  createdAt: Date;
}

// Evento do historico
export interface HistoryEvent {
  id: string;
  ticker: string;
  event: string;
  date: Date;
  outcomeNote?: string;
}

// Ponto de dados do Mystic Pulse
export interface MysticPulseDataPoint {
  time: string;
  positiveCount: number;
  negativeCount: number;
  trendScore: number;
  intensity: number;
  diPlus: number;
  diMinus: number;
  isBullish: boolean;
}

// Resposta do endpoint de serie do Mystic Pulse
export interface MysticPulseSeriesResponse {
  ticker: string;
  data: MysticPulseDataPoint[];
}

// ==================== SINAIS HISTORICOS ====================

// Status do sinal historico
export type SignalStatus = 'pending' | 'success' | 'failure' | 'expired';

// Tipo de setup
export type SetupType = '123-compra' | '123-venda';

// Sinal historico
export interface HistoricalSignal {
  id: string;
  ticker: string;
  setup_type: SetupType;
  timeframe: string;
  signal_time: string;
  p1_index: number;
  p2_index: number;
  p3_index: number;
  p1_price: number;
  p2_price: number;
  p3_price: number;
  entry_price: number;
  stop_price: number;
  target_price: number;
  status: SignalStatus;
  resolved_at: string | null;
  resolved_price: number | null;
  candles_to_resolve: number | null;
  created_at: string;
}

// Estatisticas de sinais
export interface SignalStats {
  total: number;
  success: number;
  failure: number;
  pending: number;
  expired: number;
  successRate: number;
}

// Resposta do endpoint de sinais
export interface SignalsResponse {
  ticker: string;
  timeframe: string;
  signals: HistoricalSignal[];
  stats: SignalStats;
}

// ==================== BACKTEST ====================

// Resumo do backtest
export interface BacktestSummary {
  totalSignals: number;
  totalSuccess: number;
  totalFailure: number;
  totalPending: number;
  totalExpired: number;
  successRate: number;
  avgCandlesToResolve: number;
  profitFactor: number;
  totalReturnPct: number;    // Retorno total acumulado %
  avgReturnPct: number;      // Retorno médio por operação %
  avgWinPct: number;         // Ganho médio % (só vencedoras)
  avgLossPct: number;        // Perda média % (só perdedoras)
  bySetupType: {
    '123-compra': SignalStats;
    '123-venda': SignalStats;
  };
  byTicker: Record<string, SignalStats>;
}

// Resposta do endpoint de backtest
export interface BacktestResponse {
  summary: BacktestSummary;
  operations: HistoricalSignal[];
}
