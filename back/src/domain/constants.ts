import type { Asset } from './types.js';

// ==================== ASSETS ====================
// Ativos disponiveis via Yahoo Finance (sufixo .SA para B3)

export const ASSETS: Asset[] = [
  // Blue Chips - Alta liquidez
  { ticker: 'PETR4', name: 'Petrobras PN' },
  { ticker: 'VALE3', name: 'Vale ON' },
  { ticker: 'ITUB4', name: 'Itau Unibanco PN' },
  { ticker: 'BBDC4', name: 'Bradesco PN' },
  { ticker: 'B3SA3', name: 'B3 ON' },
  { ticker: 'ABEV3', name: 'Ambev ON' },
  { ticker: 'WEGE3', name: 'WEG ON' },
  { ticker: 'RENT3', name: 'Localiza ON' },
  { ticker: 'SUZB3', name: 'Suzano ON' },
  { ticker: 'JBSS3', name: 'JBS ON' },

  // Bancos e Financeiras
  { ticker: 'BBAS3', name: 'Banco do Brasil ON' },
  { ticker: 'SANB11', name: 'Santander Unit' },
  { ticker: 'ITSA4', name: 'Itausa PN' },

  // Varejo
  { ticker: 'MGLU3', name: 'Magazine Luiza ON' },
  { ticker: 'LREN3', name: 'Lojas Renner ON' },
  { ticker: 'PETZ3', name: 'Petz ON' },
  { ticker: 'AZZA3', name: 'Azzas 2154 ON' },

  // Siderurgia e Mineracao
  { ticker: 'GGBR4', name: 'Gerdau PN' },
  { ticker: 'CSNA3', name: 'CSN ON' },
  { ticker: 'USIM5', name: 'Usiminas PNA' },
  { ticker: 'CMIN3', name: 'CSN Mineracao ON' },

  // Energia e Utilities
  { ticker: 'ELET3', name: 'Eletrobras ON' },
  { ticker: 'EQTL3', name: 'Equatorial ON' },
  { ticker: 'ENGI11', name: 'Energisa Unit' },

  // Saude
  { ticker: 'HAPV3', name: 'Hapvida ON' },
  { ticker: 'RADL3', name: 'Raia Drogasil ON' },
  { ticker: 'FLRY3', name: 'Fleury ON' },

  // Transporte e Logistica
  { ticker: 'RAIL3', name: 'Rumo ON' },
  { ticker: 'EMBR3', name: 'Embraer ON' },
  { ticker: 'AZUL4', name: 'Azul PN' },
];

// ==================== INDICATOR PERIODS ====================

export const SMA_SHORT_PERIOD = 20;
export const SMA_LONG_PERIOD = 50;
export const ATR_PERIOD = 14;
export const VOLUME_PERIOD = 20;
export const RSI_PERIOD = 14;

// ==================== VOLATILITY THRESHOLDS ====================
// ATR% = (ATR / Close) * 100

export const VOLATILITY_LOW_THRESHOLD = 1.5; // < 1.5% = Baixa
export const VOLATILITY_HIGH_THRESHOLD = 3.0; // > 3% = Alta

// ==================== VOLUME THRESHOLDS ====================
// Ratio = Current Volume / Avg Volume

export const VOLUME_LOW_THRESHOLD = 0.8; // < 0.8 = Abaixo
export const VOLUME_HIGH_THRESHOLD = 1.2; // > 1.2 = Acima

// ==================== SETUP THRESHOLDS ====================

export const BREAKOUT_LOOKBACK = 20;
export const BREAKOUT_PROXIMITY = 0.995; // 0.5% proximity for EM_FORMACAO
export const BREAKOUT_VOLUME_MULTIPLIER = 1.2;

export const PULLBACK_PROXIMITY_ATR_MULTIPLIER = 0.5;
export const PULLBACK_TOUCH_MULTIPLIER = 1.002; // 0.2% tolerance

export const BREAKDOWN_LOOKBACK = 20;
export const BREAKDOWN_PROXIMITY = 1.005; // 0.5% proximity for EM_FORMACAO
export const BREAKDOWN_VOLUME_MULTIPLIER = 1.2;

// ==================== BACKTEST ====================

export const BACKTEST_FORWARD_CANDLES = 10;
export const BACKTEST_R_MULTIPLIER = 1; // 1R risk/reward

// ==================== DATA ====================

export const CANDLES_PER_TICKER = 600;
export const DEFAULT_CANDLE_LIMIT = 300;
