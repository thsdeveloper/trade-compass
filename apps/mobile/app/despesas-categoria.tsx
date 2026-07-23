import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PieChart } from 'react-native-gifted-charts';

import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { Skeleton, SkeletonProvider } from '@/components/atoms/Skeleton';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { CategoryExpenseItem } from '@/components/molecules/CategoryExpenseItem';
import { MoneyText } from '@/components/atoms/MoneyText';
import { MonthSlider } from '@/components/molecules/MonthSlider';
import { getExpensesByCategory } from '@/lib/finance-api';
import type { ExpensesByCategory } from '@/types/finance';

// Fatias além das 6 maiores viram "Outras" (donut legível > donut completo).
// Cinza neutro: "Outras" não é uma categoria, não ganha cor de identidade.
const MAX_SLICES = 6;
const OTHERS_COLOR = '#9CA3AF';

export default function DespesasCategoriaScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const { dataVersion } = useFinance();

  // Mês local à tela: navegar entre meses aqui NÃO toca o dashboard do
  // contexto, que alimenta a home sempre com o mês corrente. A tela abre
  // sempre no mês atual e busca as despesas do mês exibido direto na API.
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [expensesByCategory, setExpensesByCategory] = useState<ExpensesByCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const monthKey = `${selectedMonth.getFullYear()}-${String(
    selectedMonth.getMonth() + 1
  ).padStart(2, '0')}`;

  // dataVersion nas deps: mutações de transação refazem a busca — em silêncio
  // (sem skeleton) quando o mês não mudou.
  const lastLoadedMonthRef = useRef('');
  useEffect(() => {
    let cancelled = false;
    const isMonthChange = lastLoadedMonthRef.current !== monthKey;
    lastLoadedMonthRef.current = monthKey;
    if (isMonthChange) setIsLoading(true);
    getExpensesByCategory(monthKey)
      .then((data) => {
        if (!cancelled) setExpensesByCategory(data);
      })
      .catch(() => {
        if (!cancelled) setExpensesByCategory([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [monthKey, dataVersion]);

  const total = useMemo(
    () => expensesByCategory.reduce((sum, item) => sum + item.total, 0),
    [expensesByCategory]
  );

  // As cores das fatias seguem a identidade de cada categoria (a mesma da
  // lista logo abaixo, que faz o papel de legenda com ícone + nome + valor)
  const donutData = useMemo(() => {
    const top = expensesByCategory.slice(0, MAX_SLICES);
    const rest = expensesByCategory.slice(MAX_SLICES);
    const slices = top.map((item) => ({
      value: item.total,
      color: item.category_color,
    }));
    const othersTotal = rest.reduce((sum, item) => sum + item.total, 0);
    if (othersTotal > 0) {
      slices.push({ value: othersTotal, color: OTHERS_COLOR });
    }
    return slices;
  }, [expensesByCategory]);

  const othersCount = Math.max(expensesByCategory.length - MAX_SLICES, 0);

  const handleCategoryPress = (categoryId: string) => {
    const category = expensesByCategory.find((c) => c.category_id === categoryId);
    if (!category) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/categoria-transacoes',
      params: {
        id: category.category_id,
        name: category.category_name,
        color: category.category_color,
        icon: category.category_icon,
        // A tela de destino não tem slider: recebe o mês exibido aqui
        month: monthKey,
      },
    });
  };

  return (
    <FullScreenOverlay title="Despesas por categoria" onClose={() => router.back()}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MonthSlider selectedDate={selectedMonth} onMonthChange={setSelectedMonth} />

        {isLoading ? (
          <SkeletonProvider>
            <View style={styles.skeletonArea}>
              <Skeleton width={160} height={160} radius={80} />
              {Array.from({ length: 5 }).map((_, index) => (
                <View key={index} style={styles.skeletonRow}>
                  <Skeleton width={36} height={36} radius={BorderRadius.full} />
                  <View style={styles.skeletonBody}>
                    <Skeleton width="60%" height={14} />
                    <Skeleton width="90%" height={8} />
                  </View>
                  <Skeleton width={64} height={14} />
                </View>
              ))}
            </View>
          </SkeletonProvider>
        ) : expensesByCategory.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <IconSymbol name="chart.pie" size={24} color={colors.icon} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Nenhuma despesa neste mês
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
              Lance uma compra pelo + ou escaneando a nota fiscal
            </Text>
          </View>
        ) : (
          <>
            {/* Donut: participação de cada categoria no total do mês */}
            <GlassSurface variant="material" style={styles.chartCard}>
              <View style={styles.donutWrap}>
                <PieChart
                  data={donutData}
                  donut
                  radius={80}
                  innerRadius={54}
                  innerCircleColor={isDark ? '#1E1E1E' : '#FFFFFF'}
                  centerLabelComponent={() => (
                    <View style={styles.donutCenter}>
                      <MoneyText
                        value={total}
                        style={styles.donutCenterValue}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      />
                      <Text
                        style={[styles.donutCenterLabel, { color: colors.textSecondary }]}
                      >
                        no mês
                      </Text>
                    </View>
                  )}
                />
              </View>
              {othersCount > 0 && (
                <View style={styles.othersRow}>
                  <View style={[styles.othersDot, { backgroundColor: OTHERS_COLOR }]} />
                  <Text style={[styles.othersText, { color: colors.textSecondary }]}>
                    Outras = {othersCount} categorias menores
                  </Text>
                </View>
              )}
            </GlassSurface>

            {/* Lista-legenda: toque abre as transações da categoria */}
            <View style={styles.list}>
              {expensesByCategory.map((item) => (
                <Pressable
                  key={item.category_id}
                  onPress={() => handleCategoryPress(item.category_id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver transações de ${item.category_name}`}
                  style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
                >
                  <View style={styles.listRowItem}>
                    <CategoryExpenseItem item={item} />
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  chartCard: {
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  donutWrap: {
    alignItems: 'center',
  },
  donutCenter: {
    alignItems: 'center',
    maxWidth: 96,
  },
  donutCenterValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  donutCenterLabel: {
    fontSize: FontSize.xs,
  },
  othersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  othersDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  othersText: {
    fontSize: FontSize.xs,
  },
  list: {
    paddingHorizontal: Spacing.xl,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listRowItem: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  skeletonArea: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  skeletonBody: {
    flex: 1,
    gap: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  emptyHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
