import { useEffect, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { useMonthlySpendingSeries } from '@/hooks/use-monthly-spending-series';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { BudgetProgressCard } from '@/components/finance/BudgetProgressCard';
import {
  formatCurrency,
  BUDGET_CATEGORY_LABELS,
  type BudgetCategory,
} from '@/types/finance';

// Paleta categórica validada (scripts/validate_palette.js do skill dataviz):
// o modo escuro usa passos mais escuros de verde/âmbar para ficar na banda
// de luminosidade; o claro mantém as cores do app (com rótulos diretos).
const CATEGORY_COLORS_LIGHT: Record<BudgetCategory, string> = {
  ESSENCIAL: '#3b82f6',
  ESTILO_VIDA: '#22c55e',
  INVESTIMENTO: '#f59e0b',
};
const CATEGORY_COLORS_DARK: Record<BudgetCategory, string> = {
  ESSENCIAL: '#3b82f6',
  ESTILO_VIDA: '#16a34a',
  INVESTIMENTO: '#d97706',
};

const SPEND_LINE_DARK = '#A3E635';
const SPEND_LINE_LIGHT = '#65a30d';

export default function OrcamentoScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const { budgetSummary, selectedMonth, loadDashboard } = useFinance();
  const { points, total } = useMonthlySpendingSeries(selectedMonth);

  useEffect(() => {
    if (!budgetSummary) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const screenBg = isDark ? colors.background : '#F6F7F9';
  const categoryColors = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
  const lineColor = isDark ? SPEND_LINE_DARK : SPEND_LINE_LIGHT;
  const cardBorder = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
  } as const;

  const monthLabel = selectedMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const totalIncome = budgetSummary?.total_income ?? 0;
  const usedShare = totalIncome > 0 ? Math.round((total / totalIncome) * 100) : null;

  const allocations = useMemo(
    () => budgetSummary?.allocations ?? [],
    [budgetSummary]
  );

  // Donut: distribuição do gasto real entre as 3 categorias do orçamento
  const donutData = useMemo(
    () =>
      allocations
        .filter((allocation) => allocation.actual_amount > 0)
        .map((allocation) => ({
          value: allocation.actual_amount,
          color: categoryColors[allocation.category],
        })),
    [allocations, categoryColors]
  );

  // Barras: ideal (cinza, contexto) vs atual (cor da categoria) — ênfase
  const barData = useMemo(() => {
    const idealGray = isDark ? '#4B5563' : '#D1D5DB';
    return allocations.flatMap((allocation) => {
      const ideal = totalIncome * (allocation.ideal_percentage / 100);
      return [
        {
          value: ideal,
          frontColor: idealGray,
          spacing: 4,
          label: BUDGET_CATEGORY_LABELS[allocation.category],
          labelWidth: 90,
          labelTextStyle: { color: colors.textSecondary, fontSize: 11 },
        },
        { value: allocation.actual_amount, frontColor: categoryColors[allocation.category], spacing: 28 },
      ];
    });
  }, [allocations, categoryColors, colors.textSecondary, isDark, totalIncome]);

  const chartData = useMemo(
    () =>
      points.map((point, index) => ({
        value: point.value,
        day: point.day,
        hideDataPoint: index !== points.length - 1,
        dataPointColor: lineColor,
        dataPointRadius: 5,
      })),
    [points, lineColor]
  );

  const contentWidth = screenWidth - Spacing.xl * 2;

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <LinearGradient
        colors={
          isDark
            ? ['#1D4ED8', '#16233F', colors.background]
            : ['#0066FF', '#7FB0FF', screenBg]
        }
        locations={[0, 0.5, 1]}
        style={styles.ambientBackground}
        pointerEvents="none"
      />

      {/* Header do page modal */}
      <View style={[styles.header, { paddingTop: Spacing.lg }]}>
        <View>
          <Text style={styles.headerTitle}>Orçamento</Text>
          <Text style={styles.headerSubtitle}>{monthLabel}</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel="Fechar orçamento"
        >
          {({ pressed }) => (
            <View style={pressed && styles.pressed}>
              <GlassSurface variant="glass" isInteractive style={styles.closeButton}>
                <IconSymbol name="xmark" size={20} color={colors.text} />
              </GlassSurface>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing['3xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Curva de gastos acumulados com tooltip por dia */}
        <GlassSurface variant="material" style={[styles.card, cardBorder]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Gastos do mês
          </Text>
          <Text style={[styles.heroValue, { color: colors.text }]}>
            {formatCurrency(total)}
          </Text>
          {usedShare !== null && (
            <Text style={[styles.cardHint, { color: colors.textSecondary }]}>
              {usedShare}% da renda de {formatCurrency(totalIncome)}
            </Text>
          )}
          {chartData.length > 1 && (
            <View style={styles.chartArea}>
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
                width={contentWidth - Spacing.lg * 2}
                height={140}
                disableScroll
                pointerConfig={{
                  pointerColor: lineColor,
                  pointerStripColor: colors.border,
                  pointerStripWidth: 1,
                  pointerStripUptoDataPoint: true,
                  activatePointersOnLongPress: false,
                  pointerLabelWidth: 130,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: (items: { value: number; day?: number }[]) => (
                    <View
                      style={[
                        styles.tooltip,
                        { backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF' },
                      ]}
                    >
                      <Text style={[styles.tooltipDay, { color: colors.textSecondary }]}>
                        Dia {items[0]?.day ?? '—'}
                      </Text>
                      <Text style={[styles.tooltipValue, { color: colors.text }]}>
                        {formatCurrency(items[0]?.value ?? 0)}
                      </Text>
                    </View>
                  ),
                }}
              />
            </View>
          )}
        </GlassSurface>

        {/* Donut: para onde o dinheiro foi */}
        {donutData.length > 0 && (
          <GlassSurface variant="material" style={[styles.card, cardBorder]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              Para onde o dinheiro foi
            </Text>
            <View style={styles.donutRow}>
              <PieChart
                data={donutData}
                donut
                radius={72}
                innerRadius={48}
                innerCircleColor={isDark ? '#1E1E1E' : '#FFFFFF'}
                centerLabelComponent={() => (
                  <View style={styles.donutCenter}>
                    <Text style={[styles.donutCenterValue, { color: colors.text }]}>
                      {usedShare !== null ? `${usedShare}%` : '—'}
                    </Text>
                    <Text style={[styles.donutCenterLabel, { color: colors.textSecondary }]}>
                      da renda
                    </Text>
                  </View>
                )}
              />
              {/* Legenda com valores: identidade nunca só pela cor */}
              <View style={styles.legend}>
                {allocations.map((allocation) => (
                  <View key={allocation.category} style={styles.legendRow}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: categoryColors[allocation.category] },
                      ]}
                    />
                    <View style={styles.legendText}>
                      <Text style={[styles.legendLabel, { color: colors.text }]}>
                        {BUDGET_CATEGORY_LABELS[allocation.category]}
                      </Text>
                      <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                        {formatCurrency(allocation.actual_amount)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </GlassSurface>
        )}

        {/* Ideal vs. atual por categoria */}
        {allocations.length > 0 && totalIncome > 0 && (
          <GlassSurface variant="material" style={[styles.card, cardBorder]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              Ideal vs. atual
            </Text>
            <View style={styles.barLegendRow}>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: isDark ? '#4B5563' : '#D1D5DB' },
                  ]}
                />
                <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                  Ideal
                </Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.text }]} />
                <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                  Atual (cor da categoria)
                </Text>
              </View>
            </View>
            <BarChart
              data={barData}
              barWidth={26}
              barBorderTopLeftRadius={4}
              barBorderTopRightRadius={4}
              hideRules
              yAxisThickness={0}
              xAxisThickness={StyleSheet.hairlineWidth}
              xAxisColor={colors.border}
              hideYAxisText
              height={150}
              width={contentWidth - Spacing.lg * 2}
              initialSpacing={12}
              disableScroll
            />
          </GlassSurface>
        )}

        {/* Detalhes por categoria (progresso + status) */}
        {budgetSummary && allocations.length > 0 && (
          <GlassSurface variant="material" style={[styles.card, cardBorder]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              Detalhes por categoria
            </Text>
            {allocations.map((allocation) => (
              <BudgetProgressCard
                key={allocation.category}
                allocation={allocation}
                totalIncome={budgetSummary.total_income}
              />
            ))}
          </GlassSurface>
        )}

        {totalIncome <= 0 && (
          <GlassSurface variant="material" style={[styles.card, cardBorder]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Cadastre receitas neste mês para ver a distribuição 50-30-20 do seu
              orçamento.
            </Text>
          </GlassSurface>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'capitalize',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  cardLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  heroValue: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  cardHint: {
    fontSize: FontSize.xs,
  },
  chartArea: {
    marginTop: Spacing.md,
  },
  tooltip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  tooltipDay: {
    fontSize: FontSize.xs,
  },
  tooltipValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  donutCenter: {
    alignItems: 'center',
  },
  donutCenterValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  donutCenterLabel: {
    fontSize: FontSize.xs,
  },
  legend: {
    flex: 1,
    gap: Spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  legendValue: {
    fontSize: FontSize.xs,
  },
  barLegendRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
