import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MoneyText } from '@/components/atoms/MoneyText';

// Acento do gasto dentro do orçamento (mesmos tons validados do card:
// o claro precisa do tom mais escuro para manter 3:1 sobre a superfície)
const SPEND_DARK = ['#A3E635', '#34D399'] as const;
const SPEND_LIGHT = ['#65A30D', '#059669'] as const;

const STROKE = 14;
const RADIUS = 84;
// Largura/altura do desenho: o traço extrapola o raio em STROKE/2 de cada lado
const WIDTH = RADIUS * 2 + STROKE;
const HEIGHT = RADIUS + STROKE;

/** Ponto no arco superior (0° = direita, 180° = esquerda; y cresce para baixo) */
function point(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: WIDTH / 2 + r * Math.cos(rad),
    y: HEIGHT - STROKE / 2 - r * Math.sin(rad),
  };
}

/** Path de arco no semicírculo superior, de fromDeg até toDeg (sentido horário) */
function arcPath(r: number, fromDeg: number, toDeg: number) {
  const start = point(r, fromDeg);
  const end = point(r, toDeg);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
}

interface BudgetGaugeProps {
  /** Total gasto no mês */
  spent: number;
  /** Quanto pode gastar no mês (renda/orçamento) */
  limit: number;
  isBalanceVisible: boolean;
}

/**
 * Gauge semicircular do orçamento (Atomic Design · molécula): trilha =
 * quanto pode gastar, arco preenchido = quanto já gastou, percentual como
 * número-herói no centro. A cor segue o STATUS do orçamento (dentro /
 * atenção ≥80% / estourado >100%), nunca é decorativa.
 */
export function BudgetGauge({ spent, limit, isBalanceVisible }: BudgetGaugeProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const share = limit > 0 ? spent / limit : 0;
  const pct = Math.round(share * 100);
  const over = spent - limit;
  const isOver = over > 0;
  const isWarning = !isOver && share >= 0.8;

  const [gradFrom, gradTo] = isDark ? SPEND_DARK : SPEND_LIGHT;
  const statusColor = isOver ? colors.danger : isWarning ? colors.warning : gradTo;
  const trackColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  // O arco enche até 100% e para: acima disso quem fala é a cor + o texto
  // (um arco que "dá a volta" mentiria sobre a escala)
  const fillDeg = 180 * Math.min(share, 1);

  const progressPath = useMemo(
    () => (fillDeg > 0 ? arcPath(RADIUS, 180, 180 - fillDeg) : null),
    [fillDeg]
  );

  const remaining = Math.max(limit - spent, 0);

  return (
    <View style={styles.container}>
      <View style={{ width: WIDTH, height: HEIGHT }}>
        <Svg width={WIDTH} height={HEIGHT}>
          <Defs>
            <LinearGradient id="budget-spend" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={gradFrom} />
              <Stop offset="1" stopColor={gradTo} />
            </LinearGradient>
          </Defs>
          {/* Trilha: o orçamento inteiro */}
          <Path
            d={arcPath(RADIUS, 180, 0)}
            stroke={trackColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
          {/* Progresso: o que já foi gasto */}
          {progressPath && (
            <Path
              d={progressPath}
              stroke={
                isOver ? colors.danger : isWarning ? colors.warning : 'url(#budget-spend)'
              }
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>

        {/* Número-herói no centro do arco */}
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={[styles.centerValue, { color: colors.text }]}>{pct}%</Text>
          <Text style={[styles.centerCaption, { color: colors.textSecondary }]}>
            do orçamento
          </Text>
        </View>
      </View>

      {/* Extremos do gauge: gasto à esquerda, disponível à direita */}
      <View style={styles.endsRow}>
        <View style={styles.endItem}>
          <Text style={[styles.endLabel, { color: colors.textSecondary }]}>Gasto</Text>
          <MoneyText value={spent} hidden={!isBalanceVisible} style={styles.endValue} />
        </View>
        <View style={[styles.endItem, styles.endItemRight]}>
          <Text style={[styles.endLabel, { color: colors.textSecondary }]}>
            {isOver ? 'Acima do orçamento' : 'Disponível'}
          </Text>
          {/* Cor de STATUS (estouro), não convenção de despesa */}
          <MoneyText
            value={isOver ? over : remaining}
            color={isOver ? colors.danger : undefined}
            hidden={!isBalanceVisible}
            style={styles.endValue}
          />
        </View>
      </View>

      {/* Status nunca é só cor: a frase diz o estado */}
      {(isWarning || isOver) && (
        <Text style={[styles.statusText, { color: statusColor }]}>
          {isOver
            ? 'Orçamento estourado — reveja os gastos do mês'
            : 'Atenção: você já usou mais de 80% do orçamento'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  centerValue: {
    fontSize: 34,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
    lineHeight: 38,
  },
  centerCaption: {
    fontSize: FontSize.xs,
  },
  endsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.lg,
  },
  endItem: {
    gap: 1,
  },
  endItemRight: {
    alignItems: 'flex-end',
  },
  endLabel: {
    fontSize: FontSize.xs,
  },
  endValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
