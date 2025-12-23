// Candle OHLCV
export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Resposta do endpoint de candles
export interface CandlesResponse {
  ticker: string;
  candles: Candle[];
  indicators: {
    sma20: (number | null)[];
    sma50: (number | null)[];
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
