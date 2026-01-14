import { getCandlesAsync } from '../src/data/candle-repository.js';
import { emaSeries } from '../src/engine/indicators/ema.js';

async function debug() {
    const candles = await getCandlesAsync('ITUB4', 1200, '60m');

    if (!candles || candles.length === 0) {
        console.log('Sem dados');
        return;
    }

    const closes = candles.map(c => c.close);
    const ema8 = emaSeries(8, closes);
    const ema80 = emaSeries(80, closes);

    console.log('=== CANDLES DO DIA 22/12 ===');
    for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        if (c.time && c.time.includes('2025-12-22')) {
            const e8 = ema8[i]?.toFixed(2) || 'null';
            const e80 = ema80[i]?.toFixed(2) || 'null';
            console.log(`[${i}] ${c.time} H:${c.high.toFixed(2)} L:${c.low.toFixed(2)} EMA8:${e8} EMA80:${e80}`);
        }
    }

    console.log('\n=== VERIFICANDO PADROES DO DIA 22 ===');

    // Encontrar candles 15h, 16h, 17h, 18h do dia 22
    const idx15 = candles.findIndex(c => c.time?.includes('2025-12-22T15:'));
    const idx16 = candles.findIndex(c => c.time?.includes('2025-12-22T16:'));
    const idx17 = candles.findIndex(c => c.time?.includes('2025-12-22T17:'));
    const idx18 = candles.findIndex(c => c.time?.includes('2025-12-22T18:'));

    console.log(`\nIndices encontrados: 15h=${idx15}, 16h=${idx16}, 17h=${idx17}, 18h=${idx18}`);

    if (idx15 >= 0 && idx16 >= 0 && idx17 >= 0) {
        console.log('\n--- PADRAO 15h, 16h, 17h (atual marcado) ---');
        const c1 = candles[idx15];
        const c2 = candles[idx16];
        const c3 = candles[idx17];
        console.log(`15h [${idx15}]: H=${c1.high.toFixed(2)}, L=${c1.low.toFixed(2)}`);
        console.log(`16h [${idx16}]: H=${c2.high.toFixed(2)}, L=${c2.low.toFixed(2)}`);
        console.log(`17h [${idx17}]: H=${c3.high.toFixed(2)}, L=${c3.low.toFixed(2)}`);

        const e8 = ema8[idx17];
        const e80 = ema80[idx17];
        console.log(`EMA8=${e8?.toFixed(2)}, EMA80=${e80?.toFixed(2)}, Tendencia: ${e8 && e80 ? (e8 > e80 ? 'ALTA' : 'BAIXA') : 'N/A'}`);

        // Verificar COMPRA (minimas V)
        const isBuyPattern = c2.low < c1.low && c3.low > c2.low;
        console.log(`Padrao COMPRA (minimas V): ${c1.low.toFixed(2)} > ${c2.low.toFixed(2)} < ${c3.low.toFixed(2)} = ${isBuyPattern}`);

        // Verificar VENDA (maximas ^)
        const isSellPattern = c2.high > c1.high && c3.high < c2.high;
        console.log(`Padrao VENDA (maximas ^): ${c1.high.toFixed(2)} < ${c2.high.toFixed(2)} > ${c3.high.toFixed(2)} = ${isSellPattern}`);
    }

    if (idx16 >= 0 && idx17 >= 0 && idx18 >= 0) {
        console.log('\n--- PADRAO 16h, 17h, 18h (correto segundo usuario) ---');
        const c1 = candles[idx16];
        const c2 = candles[idx17];
        const c3 = candles[idx18];
        console.log(`16h [${idx16}]: H=${c1.high.toFixed(2)}, L=${c1.low.toFixed(2)}`);
        console.log(`17h [${idx17}]: H=${c2.high.toFixed(2)}, L=${c2.low.toFixed(2)}`);
        console.log(`18h [${idx18}]: H=${c3.high.toFixed(2)}, L=${c3.low.toFixed(2)}`);

        const e8 = ema8[idx18];
        const e80 = ema80[idx18];
        console.log(`EMA8=${e8?.toFixed(2)}, EMA80=${e80?.toFixed(2)}, Tendencia: ${e8 && e80 ? (e8 > e80 ? 'ALTA' : 'BAIXA') : 'N/A'}`);

        // Verificar COMPRA (minimas V)
        const isBuyPattern = c2.low < c1.low && c3.low > c2.low;
        console.log(`Padrao COMPRA (minimas V): ${c1.low.toFixed(2)} > ${c2.low.toFixed(2)} < ${c3.low.toFixed(2)} = ${isBuyPattern}`);

        // Verificar VENDA (maximas ^)
        const isSellPattern = c2.high > c1.high && c3.high < c2.high;
        console.log(`Padrao VENDA (maximas ^): ${c1.high.toFixed(2)} < ${c2.high.toFixed(2)} > ${c3.high.toFixed(2)} = ${isSellPattern}`);
    }

    // Verificar consecutividade
    console.log('\n=== VERIFICAR CONSECUTIVIDADE ===');
    console.log(`15h->16h consecutivo? idx16=${idx16} == idx15+1=${idx15+1} ? ${idx16 === idx15 + 1}`);
    console.log(`16h->17h consecutivo? idx17=${idx17} == idx16+1=${idx16+1} ? ${idx17 === idx16 + 1}`);
    console.log(`17h->18h consecutivo? idx18=${idx18} == idx17+1=${idx17+1} ? ${idx18 === idx17 + 1}`);
}

debug().catch(console.error);
