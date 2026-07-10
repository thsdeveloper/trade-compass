import { Candle, SetupResult, SetupStatus } from '../../domain/types.js';
import { emaSeries } from '../indicators/ema.js';
import { macdSeries, type MACDResult } from '../indicators/macd.js';

/**
 * 123 de Compra/Venda
 *
 * Tendencia (60min) - verificada NO MOMENTO DO PADRAO E na tendencia ATUAL:
 * - Compra: EMA8 > EMA80 (tendencia de alta)
 * - Venda: EMA8 < EMA80 (tendencia de baixa)
 *
 * Prioriza padroes que correspondem a tendencia ATUAL.
 *
 * Padrao 123 Compra (3 candles CONSECUTIVOS em tendencia de ALTA):
 * 1. Candle 1 (P1): Faz uma minima
 * 2. Candle 2 (P2): Faz uma minima MENOR que P1 (fundo mais baixo)
 * 3. Candle 3 (P3): Faz uma minima MAIOR que P2 (fundo ascendente)
 * Entrada: Rompimento da maxima do candle P3.
 *
 * Padrao 123 Venda (3 candles CONSECUTIVOS em tendencia de BAIXA):
 * 1. Candle 1 (P1): Faz uma maxima
 * 2. Candle 2 (P2): Faz uma maxima MAIOR que P1 (topo mais alto)
 * 3. Candle 3 (P3): Faz uma maxima MENOR que P2 (topo descendente)
 * Entrada: Rompimento da minima do candle P3.
 */

// Configuracoes do setup
const LOOKBACK_WINDOW = 100; // Janela de candles para buscar o padrao

interface Pattern123 {
    p1Index: number;
    p2Index: number;
    p3Index: number;
    type: 'BUY' | 'SELL';
}

export function detectSetup123(
    ticker: string,
    candles: Candle[]
): SetupResult | null {
    if (candles.length < 80) return null;

    const closes = candles.map((c) => c.close);
    const ema8 = emaSeries(8, closes);
    const ema80 = emaSeries(80, closes);
    const macdValues = macdSeries(closes, 12, 26, 9);

    const lastIndex = candles.length - 1;
    const currentPrice = candles[lastIndex].close;

    // Verificar tendencia ATUAL
    const currentEma8 = ema8[lastIndex];
    const currentEma80 = ema80[lastIndex];

    if (currentEma8 === null || currentEma80 === null) return null;

    const currentTrendIsBuy = currentEma8 > currentEma80;

    // Buscar padrao que corresponde a tendencia atual primeiro
    const preferredType = currentTrendIsBuy ? 'BUY' : 'SELL';
    const alternateType = currentTrendIsBuy ? 'SELL' : 'BUY';

    // Primeiro buscar padrao da tendencia atual
    let pattern = findPattern123ByType(candles, ema8, ema80, macdValues, lastIndex, preferredType);

    // Se nao encontrar, buscar padrao alternativo
    if (!pattern) {
        pattern = findPattern123ByType(candles, ema8, ema80, macdValues, lastIndex, alternateType);
    }

    if (!pattern) return null;

    if (pattern.type === 'BUY') {
        return buildBuySetup(ticker, candles, pattern, lastIndex, currentPrice);
    } else {
        return buildSellSetup(ticker, candles, pattern, lastIndex, currentPrice);
    }
}

/**
 * Busca o padrao 123 mais recente de um tipo especifico
 * FILTRO MACD: Compra so com histograma positivo, Venda so com histograma negativo
 */
function findPattern123ByType(
    candles: Candle[],
    ema8: (number | null)[],
    ema80: (number | null)[],
    macdValues: MACDResult[],
    lastIndex: number,
    type: 'BUY' | 'SELL'
): Pattern123 | null {
    const startIndex = Math.max(0, lastIndex - LOOKBACK_WINDOW);

    // Buscar do mais recente para o mais antigo
    for (let i = lastIndex - 2; i >= startIndex; i--) {
        const c1 = candles[i];
        const c2 = candles[i + 1];
        const c3 = candles[i + 2];

        // Verificar tendencia no momento do padrao (usar indice do P3)
        const p3Ema8 = ema8[i + 2];
        const p3Ema80 = ema80[i + 2];

        if (p3Ema8 === null || p3Ema80 === null) continue;

        const isUptrend = p3Ema8 > p3Ema80;
        const isDowntrend = p3Ema8 < p3Ema80;

        // Padrao 123 de COMPRA (tendencia de ALTA): minimas formam V (c1 > c2 < c3)
        if (type === 'BUY' && isUptrend && c2.low < c1.low && c3.low > c2.low) {
            // FILTRO MACD: histograma deve ser positivo para compra
            const macdHist = macdValues[i + 2]?.histogram;
            if (macdHist === null || macdHist === undefined || macdHist <= 0) {
                continue; // Pular sinal - MACD nao confirma momentum de alta
            }
            return {
                p1Index: i,
                p2Index: i + 1,
                p3Index: i + 2,
                type: 'BUY'
            };
        }

        // Padrao 123 de VENDA (tendencia de BAIXA): maximas formam ^ (c1 < c2 > c3)
        if (type === 'SELL' && isDowntrend && c2.high > c1.high && c3.high < c2.high) {
            // FILTRO MACD: histograma deve ser negativo para venda
            const macdHist = macdValues[i + 2]?.histogram;
            if (macdHist === null || macdHist === undefined || macdHist >= 0) {
                continue; // Pular sinal - MACD nao confirma momentum de baixa
            }
            return {
                p1Index: i,
                p2Index: i + 1,
                p3Index: i + 2,
                type: 'SELL'
            };
        }
    }

    return null;
}

function buildBuySetup(
    ticker: string,
    candles: Candle[],
    pattern: Pattern123,
    lastIndex: number,
    currentPrice: number
): SetupResult {
    const c1 = candles[pattern.p1Index];
    const c2 = candles[pattern.p2Index];
    const c3 = candles[pattern.p3Index];

    // Entrada: maxima do candle P3
    const entryPrice = c3.high;
    const stopPrice = c2.low;

    // Determinar status
    let status: SetupStatus;
    const isInvalidated = currentPrice < stopPrice;

    if (isInvalidated) {
        status = 'INVALIDO';
    } else if (currentPrice > entryPrice) {
        status = 'ATIVO';
    } else {
        status = 'EM_FORMACAO';
    }

    return {
        id: '123-compra',
        title: '123 de Compra',
        status,
        successRate: 0,
        risk: 'Moderado',
        stopSuggestion: stopPrice.toFixed(2),
        targetNote: `Alvo 1: ${(entryPrice + (entryPrice - stopPrice)).toFixed(2)}`,
        explanation: `Tendencia de Alta (EMA8 > EMA80) no momento do padrao. Padrao 1-2-3 com 3 candles consecutivos. Minima P1: ${c1.low.toFixed(2)}, Minima P2 (mais baixa): ${c2.low.toFixed(2)}, Minima P3 (ascendente): ${c3.low.toFixed(2)}. Entrada no rompimento da maxima de P3 (${entryPrice.toFixed(2)}).${isInvalidated ? ' SETUP INVALIDO - preco abaixo do stop.' : ''}`,
        signals: isInvalidated ? ['Setup Invalido'] : (status === 'ATIVO' ? ['Compra Confirmada'] : ['Aguardando Rompimento']),
        meta: {
            p1: c1.low,
            p2: c2.low,
            p3: c3.low,
            entry: entryPrice,
            p1Index: pattern.p1Index,
            p2Index: pattern.p2Index,
            p3Index: pattern.p3Index,
            entryIndex: pattern.p3Index
        }
    };
}

function buildSellSetup(
    ticker: string,
    candles: Candle[],
    pattern: Pattern123,
    lastIndex: number,
    currentPrice: number
): SetupResult {
    const c1 = candles[pattern.p1Index];
    const c2 = candles[pattern.p2Index];
    const c3 = candles[pattern.p3Index];

    // Entrada: minima do candle P3
    const entryPrice = c3.low;
    const stopPrice = c2.high;

    // Determinar status
    let status: SetupStatus;
    const isInvalidated = currentPrice > stopPrice;

    if (isInvalidated) {
        status = 'INVALIDO';
    } else if (currentPrice < entryPrice) {
        status = 'ATIVO';
    } else {
        status = 'EM_FORMACAO';
    }

    return {
        id: '123-venda',
        title: '123 de Venda',
        status,
        successRate: 0,
        risk: 'Moderado',
        stopSuggestion: stopPrice.toFixed(2),
        targetNote: `Alvo 1: ${(entryPrice - (stopPrice - entryPrice)).toFixed(2)}`,
        explanation: `Tendencia de Baixa (EMA8 < EMA80) no momento do padrao. Padrao 1-2-3 com 3 candles consecutivos. Maxima P1: ${c1.high.toFixed(2)}, Maxima P2 (mais alta): ${c2.high.toFixed(2)}, Maxima P3 (descendente): ${c3.high.toFixed(2)}. Entrada no rompimento da minima de P3 (${entryPrice.toFixed(2)}).${isInvalidated ? ' SETUP INVALIDO - preco acima do stop.' : ''}`,
        signals: isInvalidated ? ['Setup Invalido'] : (status === 'ATIVO' ? ['Venda Confirmada'] : ['Aguardando Rompimento']),
        meta: {
            p1: c1.high,
            p2: c2.high,
            p3: c3.high,
            entry: entryPrice,
            p1Index: pattern.p1Index,
            p2Index: pattern.p2Index,
            p3Index: pattern.p3Index,
            entryIndex: pattern.p3Index
        }
    };
}
