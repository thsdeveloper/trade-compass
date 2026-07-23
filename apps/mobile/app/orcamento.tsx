import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
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
import { BudgetInfoSheet } from '@/components/organisms/BudgetInfoSheet';
import { IncomeSheet } from '@/components/organisms/IncomeSheet';
import { Button } from '@/components/atoms/Button';
import { MonthSlider } from '@/components/molecules/MonthSlider';
import { getBudgetAllocation } from '@/lib/finance-api';
import {
  formatCurrency,
  BUDGET_CATEGORY_ICONS,
  BUDGET_CATEGORY_LABELS,
  BUDGET_STATUS_LABELS,
  type BudgetAllocation,
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

// Clareia um hex misturando-o com branco (0 = cor original, 1 = branco).
// Usado para o topo do gradiente das barras "atual" — dá profundidade sem
// sair da matiz da categoria.
function lightenHex(hex: string, ratio: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

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
  const [infoVisible, setInfoVisible] = useState(false);
  const [incomeVisible, setIncomeVisible] = useState(false);

  const monthKey = `${selectedMonth.getFullYear()}-${String(
    selectedMonth.getMonth() + 1
  ).padStart(2, '0')}`;

  // Alocação 50-30-20 do mês exibido. dataVersion nas deps: mutações de
  // transação refazem a busca — em silêncio (sem skeleton) quando o mês não
  // mudou; a renda do perfil nas deps cobre a edição pelo IncomeSheet.
  const lastLoadedMonthRef = useRef('');
  useEffect(() => {
    let cancelled = false;
    const isMonthChange = lastLoadedMonthRef.current !== monthKey;
    lastLoadedMonthRef.current = monthKey;
    if (isMonthChange) {
      setBudgetLoading(true);
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

  // Total efetivamente gasto no mês (soma dos buckets) — centro do donut e
  // base do % de cada categoria na distribuição
  const spentTotal = useMemo(
    () => allocations.reduce((sum, a) => sum + a.actual_amount, 0),
    [allocations]
  );

  // Cores de status (No limite / Acima / Abaixo) para os badges das linhas
  const statusColorsFor = (status: BudgetAllocation['status']) => {
    switch (status) {
      case 'on_track':
        return { text: colors.success, bg: colors.successLight };
      case 'over_budget':
        return { text: colors.danger, bg: colors.dangerLight };
      case 'under_budget':
      default:
        return { text: colors.info, bg: colors.infoLight };
    }
  };

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

  // Barras agrupadas: ideal (cinza, contexto) vs atual (cor da categoria, com
  // gradiente e rótulo de % no topo) — ênfase na barra "atual"
  const barData = useMemo(() => {
    const idealGray = isDark ? '#4B5563' : '#D1D5DB';
    return allocations.flatMap((allocation) => {
      const ideal = totalIncome * (allocation.ideal_percentage / 100);
      const color = categoryColors[allocation.category];
      return [
        {
          value: ideal,
          frontColor: idealGray,
          spacing: 4,
          label: BUDGET_CATEGORY_LABELS[allocation.category],
          labelWidth: 90,
          labelTextStyle: { color: colors.textSecondary, fontSize: 11 },
        },
        {
          value: allocation.actual_amount,
          frontColor: color,
          gradientColor: lightenHex(color, 0.35),
          showGradient: true,
          spacing: 28,
          topLabelComponent: () => (
            <Text style={[styles.barTopLabel, { color: colors.textSecondary }]}>
              {allocation.actual_percentage}%
            </Text>
          ),
        },
      ];
    });
  }, [allocations, categoryColors, colors.textSecondary, isDark, totalIncome]);

  // Teto do eixo com folga (~20%) para os rótulos de % no topo das barras
  // "atual" não encostarem no topo do gráfico
  const barMaxValue = useMemo(() => {
    const values = allocations.flatMap((a) => [
      totalIncome * (a.ideal_percentage / 100),
      a.actual_amount,
    ]);
    const max = Math.max(0, ...values);
    return max > 0 ? max * 1.2 : undefined;
  }, [allocations, totalIncome]);

  // Barras empilhadas: composição de cada bucket entre Pago (tom cheio) e
  // A pagar (mesmo matiz, translúcido) — revela o pendente que a barra de
  // progresso antiga escondia
  const stackData = useMemo(
    () =>
      allocations.map((allocation) => {
        const color = categoryColors[allocation.category];
        return {
          label: BUDGET_CATEGORY_LABELS[allocation.category],
          labelWidth: 96,
          labelTextStyle: { color: colors.textSecondary, fontSize: 11 },
          stacks: [
            { value: allocation.paid_amount, color },
            { value: allocation.pending_amount, color: color + '40', marginBottom: 2 },
          ],
        };
      }),
    [allocations, categoryColors, colors.textSecondary]
  );

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

        {/* Donut: para onde o dinheiro foi (fatias tocáveis, centro = total) */}
        {donutData.length > 0 && (
          <GlassSurface variant="material" style={[styles.card, cardBorder]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              Para onde o dinheiro foi
            </Text>
            <View style={styles.donutRow}>
              <PieChart
                data={donutData}
                donut
                radius={80}
                innerRadius={52}
                innerCircleColor={isDark ? '#1E1E1E' : '#FFFFFF'}
                focusOnPress
                sectionAutoFocus
                centerLabelComponent={() => (
                  <View style={styles.donutCenter}>
                    <Text
                      style={[styles.donutCenterValue, { color: colors.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatCurrency(spentTotal)}
                    </Text>
                    <Text style={[styles.donutCenterLabel, { color: colors.textSecondary }]}>
                      gasto no mês
                    </Text>
                  </View>
                )}
              />
              {/* Legenda com ícone + valor + % da distribuição: identidade
                  nunca só pela cor (par verde/âmbar exige rótulo direto) */}
              <View style={styles.legend}>
                {allocations
                  .filter((allocation) => allocation.actual_amount > 0)
                  .map((allocation) => {
                    const share =
                      spentTotal > 0
                        ? Math.round((allocation.actual_amount / spentTotal) * 100)
                        : 0;
                    return (
                      <View key={allocation.category} style={styles.legendRow}>
                        <View
                          style={[
                            styles.legendSwatch,
                            { backgroundColor: categoryColors[allocation.category] + '22' },
                          ]}
                        >
                          <IconSymbol
                            name={BUDGET_CATEGORY_ICONS[allocation.category]}
                            size={12}
                            color={categoryColors[allocation.category]}
                          />
                        </View>
                        <View style={styles.legendText}>
                          <Text
                            style={[styles.legendLabel, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {BUDGET_CATEGORY_LABELS[allocation.category]}
                          </Text>
                          <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                            {formatCurrency(allocation.actual_amount)} · {share}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
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
              maxValue={barMaxValue}
              height={150}
              width={contentWidth - Spacing.lg * 2}
              initialSpacing={12}
              disableScroll
            />
          </GlassSurface>
        )}

        {/* Detalhes por categoria: barras empilhadas Pago/A pagar + linhas
            tocáveis com status e drill-down do bucket */}
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

            {/* Legenda da composição: cheio = pago, translúcido = a pagar */}
            <View style={styles.barLegendRow}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.text }]} />
                <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                  Pago
                </Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: colors.text + '40' }]} />
                <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                  A pagar
                </Text>
              </View>
            </View>

            <BarChart
              stackData={stackData}
              barWidth={40}
              roundedTop
              barBorderTopLeftRadius={4}
              barBorderTopRightRadius={4}
              hideRules
              yAxisThickness={0}
              xAxisThickness={StyleSheet.hairlineWidth}
              xAxisColor={colors.border}
              hideYAxisText
              noOfSections={3}
              height={150}
              width={contentWidth - Spacing.lg * 2}
              initialSpacing={24}
              spacing={44}
              disableScroll
            />

            {/* Linhas tocáveis: identidade + status + drill-down por bucket */}
            <View style={styles.detailList}>
              {allocations.map((allocation) => {
                const sc = statusColorsFor(allocation.status);
                return (
                  <Pressable
                    key={allocation.category}
                    style={({ pressed }) => [
                      styles.detailRow,
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      router.push(
                        `/orcamento-categoria?bucket=${allocation.category}&month=${monthKey}` as never
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Ver gastos de ${allocation.label}`}
                  >
                    <View
                      style={[
                        styles.iconBadge,
                        { backgroundColor: categoryColors[allocation.category] + '22' },
                      ]}
                    >
                      <IconSymbol
                        name={BUDGET_CATEGORY_ICONS[allocation.category]}
                        size={15}
                        color={categoryColors[allocation.category]}
                      />
                    </View>
                    <View style={styles.detailText}>
                      <Text
                        style={[styles.legendLabel, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {allocation.label}
                      </Text>
                      <Text
                        style={[styles.legendValue, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        Pago {formatCurrency(allocation.paid_amount)} · A pagar{' '}
                        {formatCurrency(allocation.pending_amount)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.text }]}>
                        {BUDGET_STATUS_LABELS[allocation.status]}
                      </Text>
                    </View>
                    <IconSymbol name="chevron.right" size={14} color={colors.icon} />
                  </Pressable>
                );
              })}
            </View>
          </GlassSurface>
        )}

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
    maxWidth: 92,
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
  legendSwatch: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    flex: 1,
  },
  barTopLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    marginBottom: 3,
    textAlign: 'center',
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  detailText: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
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
