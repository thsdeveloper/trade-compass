import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { Skeleton, SkeletonProvider } from '@/components/atoms/Skeleton';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { TransactionDetailModal } from '@/components/organisms/TransactionDetailModal';
import { TransactionListItem } from '@/components/molecules/TransactionListItem';
import { getCategoryIcon } from '@/lib/category-icons';
import { getTransactions } from '@/lib/finance-api';
import { MoneyText } from '@/components/atoms/MoneyText';
import type { TransactionWithDetails } from '@/types/finance';

const PAGE_SIZE = 30;

/** Primeiro e último dia do mês em YYYY-MM-DD (fuso local, sem UTC-shift) */
function monthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  return {
    start: toIso(new Date(year, month, 1)),
    end: toIso(new Date(year, month + 1, 0)),
  };
}

export default function CategoriaTransacoesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const { id, name, color, icon } = useLocalSearchParams<{
    id: string;
    name: string;
    color: string;
    icon: string;
  }>();
  const { selectedMonth, expensesByCategory } = useFinance();

  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TransactionWithDetails | null>(null);

  const categoryColor = color || colors.textSecondary;
  const range = useMemo(() => monthRange(selectedMonth), [selectedMonth]);

  // Total/participação da categoria no mês (já carregados no dashboard)
  const summary = useMemo(
    () => expensesByCategory.find((item) => item.category_id === id) ?? null,
    [expensesByCategory, id]
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'more', currentCount = 0) => {
      if (!id) return;
      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);
      if (mode === 'more') setIsLoadingMore(true);
      setError(null);

      try {
        const page = await getTransactions({
          category_id: id,
          type: 'DESPESA',
          start_date: range.start,
          end_date: range.end,
          limit: PAGE_SIZE,
          offset: mode === 'more' ? currentCount : 0,
        });
        setTransactions((prev) => (mode === 'more' ? [...prev, ...page] : page));
        setHasMore(page.length === PAGE_SIZE);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar as transações'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [id, range]
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const handleEndReached = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      load('more', transactions.length);
    }
  }, [isLoading, isLoadingMore, hasMore, load, transactions.length]);

  const monthLabel = selectedMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const renderItem = useCallback(
    ({ item, index }: { item: TransactionWithDetails; index: number }) => (
      <TransactionListItem
        transaction={item}
        onPress={() => setSelected(item)}
        showDivider={index < transactions.length - 1}
      />
    ),
    [transactions.length]
  );

  return (
    <FullScreenOverlay title={name ?? 'Categoria'} onClose={() => router.back()}>
      {/* Cabeçalho de identidade: ícone + total da categoria no mês */}
      <View style={styles.summary}>
        <View
          style={[
            styles.summaryIcon,
            { backgroundColor: categoryColor + (isDark ? '30' : '15') },
          ]}
        >
          <IconSymbol name={getCategoryIcon(icon)} size={22} color={categoryColor} />
        </View>
        <View style={styles.summaryText}>
          {summary ? (
            <MoneyText value={summary.total} style={styles.summaryValue} />
          ) : (
            <Text style={[styles.summaryValue, { color: colors.text }]}>—</Text>
          )}
          <Text style={[styles.summaryCaption, { color: colors.textSecondary }]}>
            {summary
              ? `${Math.round(summary.percentage)}% das despesas de ${monthLabel}`
              : `Despesas de ${monthLabel}`}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <SkeletonProvider>
          <View style={styles.skeletonList}>
            {Array.from({ length: 8 }).map((_, index) => (
              <View key={index} style={styles.skeletonRow}>
                <Skeleton width={40} height={40} radius={BorderRadius.full} />
                <View style={styles.skeletonBody}>
                  <Skeleton width="62%" height={14} />
                  <Skeleton width="40%" height={11} />
                </View>
                <Skeleton width={64} height={14} />
              </View>
            ))}
          </View>
        </SkeletonProvider>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load('refresh')}
              tintColor={colors.textSecondary}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {error ?? 'Nenhuma despesa nesta categoria no mês'}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                {error
                  ? 'Arraste para baixo para tentar novamente.'
                  : 'Troque o mês na tela anterior para ver outros períodos.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                style={styles.footerLoader}
                size="small"
                color={colors.textSecondary}
              />
            ) : null
          }
        />
      )}

      <TransactionDetailModal
        transaction={selected}
        visible={selected !== null}
        onClose={() => setSelected(null)}
      />
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  summaryValue: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  summaryCaption: {
    fontSize: FontSize.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  skeletonList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  skeletonBody: {
    flex: 1,
    gap: Spacing.xs,
  },
});
