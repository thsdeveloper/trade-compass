import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlySpendingSeries } from '@/hooks/use-monthly-spending-series';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { Skeleton, SkeletonProvider } from '@/components/atoms/Skeleton';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { BudgetBreakdownSection } from '@/components/organisms/BudgetBreakdownSection';
import { BudgetInfoSheet } from '@/components/organisms/BudgetInfoSheet';
import { IncomeSheet } from '@/components/organisms/IncomeSheet';
import { Button } from '@/components/atoms/Button';
import { BudgetProgressCard } from '@/components/molecules/BudgetProgressCard';
import { MonthSlider } from '@/components/molecules/MonthSlider';
import { getBudgetAllocation, getBudgetBreakdown } from '@/lib/finance-api';
import {
  formatCurrency,
  BUDGET_CATEGORY_ICONS,
  BUDGET_CATEGORY_LABELS,
  type BudgetBreakdown,
  type BudgetCategory,
  type BudgetSummary,
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

  const { dataVersion } = useFinance();
  const { profile } = useAuth();

  // Mês local à tela: navegar entre meses aqui NÃO toca o dashboard do
  // contexto, que alimenta a home sempre com o mês corrente. A tela abre
  // sempre no mês atual.
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const { points, total, isLoading: seriesLoading } = useMonthlySpendingSeries(selectedMonth);

  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<BudgetBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [incomeVisible, setIncomeVisible] = useState(false);

  const monthKey = `${selectedMonth.getFullYear()}-${String(
    selectedMonth.getMonth() + 1
  ).padStart(2, '0')}`;

  // Alocação 50-30-20 + detalhamento (bucket → categoria → transações) do mês
  // exibido. dataVersion nas deps: mutações de transação refazem as buscas —
  // em silêncio (sem skeleton) quando o mês não mudou; a renda do perfil nas
  // deps cobre a edição pelo IncomeSheet.
  const lastLoadedMonthRef = useRef('');
  useEffect(() => {
    let cancelled = false;
    const isMonthChange = lastLoadedMonthRef.current !== monthKey;
    lastLoadedMonthRef.current = monthKey;
    if (isMonthChange) {
      setBudgetLoading(true);
      setBreakdownLoading(true);
    }
    getBudgetAllocation(monthKey)
      .then((data) => {
        if (!cancelled) setBudgetSummary(data);
      })
      .catch(() => {
        if (!cancelled) setBudgetSummary(null);
      })
      .finally(() => {
        if (!cancelled) setBudgetLoading(false);
      });
    getBudgetBreakdown(monthKey)
      .then((data) => {
        if (!cancelled) setBreakdown(data);
      })
      .catch(() => {
        if (!cancelled) setBreakdown(null);
      })
      .finally(() => {
        if (!cancelled) setBreakdownLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [monthKey, dataVersion, profile?.monthly_income]);

  const categoryColors = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT;
  const lineColor = isDark ? SPEND_LINE_DARK : SPEND_LINE_LIGHT;
  const cardBorder = {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
  } as const;

  // Renda-base: o backend já prioriza a renda declarada no perfil
  // (total_income) e cai para as receitas do mês na ausência dela;
  // profile.monthly_income aqui é só rede de segurança enquanto o
  // dashboard ainda não carregou.
  const totalIncome =
    (budgetSummary?.total_income ?? 0) > 0
      ? budgetSummary!.total_income
      : profile?.monthly_income ?? 0;
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
    <FullScreenOverlay title="Orçamento" onClose={() => router.back()}>
      {/* Seleção de mês (padrão Revolut: pills horizontais, mês atual à direita) */}
      <MonthSlider selectedDate={selectedMonth} onMonthChange={setSelectedMonth} />

      <SkeletonProvider active={seriesLoading || budgetLoading}>
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
          {seriesLoading ? (
            <View style={styles.heroSkeleton}>
              <Skeleton width={160} height={30} radius={8} />
              <Skeleton width={210} height={13} radius={6} />
              <Skeleton width="100%" height={140} radius={12} style={styles.chartSkeleton} />
            </View>
          ) : (
            <>
          <Text style={[styles.heroValue, { color: colors.text }]}>
            {formatCurrency(total)}
          </Text>
          {usedShare !== null && (
            <TouchableOpacity
              style={styles.incomeRow}
              onPress={() => setIncomeVisible(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Editar renda mensal"
            >
              <Text style={[styles.cardHint, { color: colors.textSecondary }]}>
                {usedShare}% da renda de {formatCurrency(totalIncome)}
              </Text>
              <Ionicons name="pencil" size={12} color={colors.textSecondary} />
            </TouchableOpacity>
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
            </>
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
                    <IconSymbol
                      name={BUDGET_CATEGORY_ICONS[allocation.category]}
                      size={13}
                      color={categoryColors[allocation.category]}
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

        {/* Detalhes por categoria (progresso + status + drill-down) */}
        {budgetSummary && allocations.length > 0 && (
          <GlassSurface variant="material" style={[styles.card, cardBorder]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                Detalhes por categoria
              </Text>
              <TouchableOpacity
                onPress={() => setInfoVisible(true)}
                hitSlop={10}
                accessibilityLabel="Sobre as categorias do orçamento"
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {allocations.map((allocation) => (
              <BudgetProgressCard
                key={allocation.category}
                allocation={allocation}
                totalIncome={totalIncome}
                onPress={() =>
                  router.push(
                    `/orcamento-categoria?bucket=${allocation.category}&month=${monthKey}` as never
                  )
                }
              />
            ))}
          </GlassSurface>
        )}

        {/* Detalhamento: quanto e quais gastos em cada bucket */}
        <BudgetBreakdownSection breakdown={breakdown} loading={breakdownLoading} />

        {totalIncome <= 0 && (
          <GlassSurface variant="material" style={[styles.card, cardBorder]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Cadastre receitas neste mês ou defina sua renda mensal para ver a
              distribuição 50-30-20 do seu orçamento.
            </Text>
            <Button
              label="Definir renda mensal"
              onPress={() => setIncomeVisible(true)}
              style={styles.incomeButton}
            />
          </GlassSurface>
        )}
      </ScrollView>
      </SkeletonProvider>

      {/* Explicação das categorias 50-30-20 (bottom sheet estilo Revolut) */}
      <BudgetInfoSheet visible={infoVisible} onClose={() => setInfoVisible(false)} />

      {/* Edição da renda mensal declarada (base do orçamento) */}
      <IncomeSheet visible={incomeVisible} onClose={() => setIncomeVisible(false)} />
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSkeleton: {
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  chartSkeleton: {
    marginTop: Spacing.sm,
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
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  incomeButton: {
    marginTop: Spacing.sm,
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
