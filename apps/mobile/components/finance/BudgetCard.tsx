import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LineChart } from 'react-native-gifted-charts';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { useMonthlySpendingSeries } from '@/hooks/use-monthly-spending-series';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { formatCurrency } from '@/types/finance';

// Acento do gráfico de gastos, validado contra as superfícies do app
// (claro exige tom mais escuro para manter 3:1 de contraste)
const SPEND_LINE_DARK = '#A3E635';
const SPEND_LINE_LIGHT = '#65a30d';

const CHART_HEIGHT = 88;

interface BudgetCardProps {
  isBalanceVisible: boolean;
}

/**
 * Card-resumo do orçamento na home: gasto acumulado do mês com curva de
 * área. Toque abre o page modal /orcamento com os detalhes.
 */
export function BudgetCard({ isBalanceVisible }: BudgetCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const { budgetSummary, selectedMonth } = useFinance();
  const { points, total } = useMonthlySpendingSeries(selectedMonth);

  const lineColor = isDark ? SPEND_LINE_DARK : SPEND_LINE_LIGHT;

  // Só o último ponto ganha marcador, como na referência
  const chartData = useMemo(
    () =>
      points.map((point, index) => ({
        value: point.value,
        hideDataPoint: index !== points.length - 1,
        dataPointColor: lineColor,
        dataPointRadius: 5,
      })),
    [points, lineColor]
  );

  const usedShare = useMemo(() => {
    if (!budgetSummary || budgetSummary.total_income <= 0) return null;
    return Math.round((total / budgetSummary.total_income) * 100);
  }, [budgetSummary, total]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/orcamento');
  };

  // Largura útil: tela − margens do card (o gráfico sangra até as bordas)
  const chartWidth = screenWidth - Spacing.xl * 2 - 2;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Abrir detalhes do orçamento"
    >
      {({ pressed }) => (
        <View style={pressed && styles.pressed}>
          <GlassSurface
            variant="material"
            style={[
              styles.card,
              {
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.textSecondary }]}>
                  Orçamento
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {isBalanceVisible ? formatCurrency(total) : 'R$ ••••••'}
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {usedShare !== null
                    ? `Você usou ${usedShare}% da renda do mês`
                    : 'Gastos acumulados neste mês'}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.icon} />
            </View>

            {chartData.length > 1 && (
              <View style={styles.chartArea} pointerEvents="none">
                <LineChart
                  data={chartData}
                  areaChart
                  curved
                  thickness={2.5}
                  color={lineColor}
                  startFillColor={lineColor}
                  startOpacity={isDark ? 0.35 : 0.25}
                  endFillColor={lineColor}
                  endOpacity={0.02}
                  hideAxesAndRules
                  hideYAxisText
                  yAxisThickness={0}
                  xAxisThickness={0}
                  initialSpacing={0}
                  endSpacing={8}
                  adjustToWidth
                  width={chartWidth}
                  height={CHART_HEIGHT}
                  disableScroll
                />
              </View>
            )}
          </GlassSurface>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  headerText: {
    gap: 2,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  value: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  description: {
    fontSize: FontSize.xs,
  },
  chartArea: {
    marginTop: Spacing.sm,
  },
});
