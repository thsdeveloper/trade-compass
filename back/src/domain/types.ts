// ==================== CANDLE / OHLCV ====================

export interface Candle {
  time: string; // ISO date string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = 'D1';

// ==================== ASSET ====================

export interface Asset {
  ticker: string;
  name: string;
}

// ==================== CONTEXT ====================

export type Trend = 'Alta' | 'Baixa' | 'Lateral';
export type VolumeLevel = 'Abaixo' | 'Normal' | 'Acima';
export type VolatilityLevel = 'Baixa' | 'Media' | 'Alta';

export interface Context {
  trend: Trend;
  volume: VolumeLevel;
  volatility: VolatilityLevel;
}

// ==================== DECISION ZONE ====================

export type DecisionZoneType = 'FAVORAVEL' | 'NEUTRA' | 'RISCO';

export interface DecisionZone {
  zone: DecisionZoneType;
  message: string;
  reasons: string[];
}

// ==================== SETUPS ====================

export type SetupStatus = 'ATIVO' | 'EM_FORMACAO' | 'INVALIDO';
export type RiskLevel = 'Baixo' | 'Moderado' | 'Alto';

export interface SetupResult {
  id: string;
  title: string;
  status: SetupStatus;
  successRate: number; // 0-100
  risk: RiskLevel;
  stopSuggestion: string;
  targetNote: string;
  explanation: string;
  signals: string[];
  meta: Record<string, number>;
}

export type SetupType = 'breakout' | 'pullback-sma20' | 'breakdown' | 'mystic-pulse';

// ==================== MYSTIC PULSE SERIES ====================

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

export interface MysticPulseSeriesResponse {
  ticker: string;
  data: MysticPulseDataPoint[];
}

// ==================== API RESPONSES ====================

export interface AssetSummary {
  ticker: string;
  name: string;
  price: number;
  updatedAt: string;
}

export interface AnalysisResponse {
  summary: AssetSummary;
  context: Context;
  decisionZone: DecisionZone;
  setups: SetupResult[];
}

// ==================== HEALTH ====================

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}

// ==================== ERRORS ====================

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// ==================== WATCHLIST ====================

export interface WatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWatchlistItemDTO {
  ticker: string;
  notes?: string;
}

export interface UpdateWatchlistItemDTO {
  notes?: string;
}

export interface WatchlistItemResponse {
  id: string;
  ticker: string;
  name: string;
  notes: string | null;
  zone: DecisionZoneType;
  created_at: string;
}
