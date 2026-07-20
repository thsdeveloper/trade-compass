import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LineChart } from 'react-native-gifted-charts';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlySpendingSeries } from '@/hooks/use-monthly-spending-series';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { formatCurrency } from '@/types/finance';

// Acento do gráfico de gastos, validado contra as superfícies do app
// (claro exige tom mais escuro para manter 3:1 de contraste)
const SPEND_LINE_DARK = '#A3E635';
const SPEND_LINE_LIGHT = '#65a30d';

// Linha-guia "pode gastar" (azul), em contraste com o verde do gasto real
const GUIDE_LINE_DARK = '#60A5FA';
const GUIDE_LINE_LIGHT = '#3B82F6';

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
  const { profile } = useAuth();
  const { points, total } = useMonthlySpendingSeries(selectedMonth);

  // Renda-base do orçamento: receitas lançadas no mês ou, na ausência delas,
  // a renda declarada no onboarding (profile.monthly_income).
  const effectiveIncome =
    (budgetSummary?.total_income ?? 0) > 0
      ? budgetSummary!.total_income
      : profile?.monthly_income ?? 0;

  const lineColor = isDark ? SPEND_LINE_DARK : SPEND_LINE_LIGHT;
  const guideColor = isDark ? GUIDE_LINE_DARK : GUIDE_LINE_LIGHT;

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

  // Linha-guia "pode gastar": ritmo linear que chega à renda ao fim do mês.
  // Dá vida ao card mesmo sem gastos — o usuário vê quanto poderia ir gastando.
  const daysInMonth = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    0
  ).getDate();
  const guideData = useMemo(
    () =>
      points.map((point) => ({
        value: effectiveIncome * (point.day / daysInMonth),
      })),
    [points, effectiveIncome, daysInMonth]
  );
  const hasGuide = effectiveIncome > 0;

  const usedShare = useMemo(() => {
    if (effectiveIncome <= 0) return null;
    return Math.round((total / effectiveIncome) * 100);
  }, [effectiveIncome, total]);

  // Vazio só quando não há renda (nem lançada, nem do onboarding) nem gastos
  const isEmpty = effectiveIncome <= 0 && total <= 0;

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
            {isEmpty ? (
              <>
                <View style={styles.emptyHeader}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    Orçamento
                  </Text>
                  <IconSymbol name="chevron.right" size={18} color={colors.icon} />
                </View>
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                    <IconSymbol name="chart.bar" size={22} color={colors.icon} />
                  </View>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Nenhum gasto neste mês
                  </Text>
                  <Text style={[styles.emptyHint, { color: colors.icon }]}>
                    Lance despesas para acompanhar seu orçamento
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.header}>
                  <View style={styles.headerText}>
                    <Text style={[styles.title, { color: colors.text }]}>
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

                {hasGuide && (
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: guideColor }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                        Pode gastar
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: lineColor }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                        Gasto
                      </Text>
                    </View>
                  </View>
                )}

                {chartData.length > 1 && (
                  <View style={styles.chartArea} pointerEvents="none">
                    <LineChart
                      data={chartData}
                      data2={hasGuide ? guideData : undefined}
                      areaChart={!hasGuide}
                      curved
                      thickness={2.5}
                      color={lineColor}
                      color2={guideColor}
                      thickness2={2}
                      hideDataPoints2
                      startFillColor={lineColor}
                      startOpacity={isDark ? 0.35 : 0.25}
                      endFillColor={lineColor}
                      endOpacity={0.02}
                      maxValue={hasGuide ? Math.max(effectiveIncome, total) : undefined}
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
              </>
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
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
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
  },
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  emptyHint: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
