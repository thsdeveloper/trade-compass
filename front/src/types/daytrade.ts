export type TradeDirection = 'BUY' | 'SELL';
export type FuturesAsset = 'WINFUT' | 'WDOFUT';

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
