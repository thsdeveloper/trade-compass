import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { Skeleton, SkeletonProvider } from '@/components/atoms/Skeleton';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCategoryIcon } from '@/lib/category-icons';
import { getBudgetTransactions } from '@/lib/finance-api';
import {
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_ICONS,
  BUDGET_CATEGORY_LABELS,
  formatCurrency,
  type BudgetCategory,
  type BudgetTransactionItem,
} from '@/types/finance';

const PAGE_SIZE = 30;
/** Altura fixa da linha — habilita getItemLayout (scroll O(1) em listas longas). */
const ROW_HEIGHT = 72;
const SEARCH_DEBOUNCE_MS = 350;

type ThemeColors = (typeof Colors)['light'];
type StatusFilter = 'PAGO' | 'PENDENTE' | undefined;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Pagos', value: 'PAGO' },
  { label: 'Pendentes', value: 'PENDENTE' },
];

function formatItemDate(dateString: string): string {
  const date = new Date(dateString.split('T')[0] + 'T12:00:00');
  return date
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    .replace('.', '');
}

/** Linha memoizada: altura fixa, sem recomputar quando outras páginas chegam. */
const TransactionRow = memo(function TransactionRow({
  item,
  colors,
}: {
  item: BudgetTransactionItem;
  colors: ThemeColors;
}) {
  const categoryColor = item.category_color || colors.textSecondary;

  return (
    <View style={styles.row}>
      <View style={[styles.rowIconBadge, { backgroundColor: categoryColor + '22' }]}>
        <IconSymbol name={getCategoryIcon(item.category_icon)} size={18} color={categoryColor} />
      </View>

      <View style={styles.rowBody}>
        <Text style={[styles.rowDescription, { color: colors.text }]} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.source_name
            ? `${item.category_name} • ${item.source_name}`
            : item.category_name}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <View style={styles.rowAmountLine}>
          {item.is_credit_card ? (
            <IconSymbol name="creditcard.fill" size={12} color={colors.textSecondary} />
          ) : null}
          <Text style={[styles.rowAmount, { color: colors.text }]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View style={styles.rowMetaLine}>
          {item.status === 'PENDENTE' ? (
            <View style={[styles.pendingPill, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.pendingPillText, { color: colors.warning }]}>Pendente</Text>
            </View>
          ) : null}
          <Text style={[styles.rowDate, { color: colors.textSecondary }]}>
            {formatItemDate(item.due_date)}
          </Text>
        </View>
      </View>
    </View>
  );
});

/** Placeholder do carregamento inicial: ~8 linhas espelhando a anatomia da lista. */
function SkeletonList() {
  return (
    <SkeletonProvider>
      <View>
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
  );
}

export default function OrcamentoCategoriaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bucket?: string; month?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const bucketParam = typeof params.bucket === 'string' ? params.bucket : undefined;
  const isValidBucket =
    bucketParam !== undefined && bucketParam in BUDGET_CATEGORY_LABELS;
  const bucket = (isValidBucket ? bucketParam : 'ESSENCIAL') as BudgetCategory;

  const now = new Date();
  const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month =
    typeof params.month === 'string' && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : fallbackMonth;

  const [items, setItems] = useState<BudgetTransactionItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appending, setAppending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>(undefined);

  // Proteção contra respostas fora de ordem: cada busca de primeira página
  // incrementa o id; respostas de gerações antigas são descartadas.
  const requestIdRef = useRef(0);
  // Guarda de append em voo — evita disparar a mesma página duas vezes.
  const appendingRef = useRef(false);

  // Bucket inválido na rota: volta e não renderiza nada.
  useEffect(() => {
    if (!isValidBucket) router.back();
  }, [isValidBucket, router]);

  // Debounce da busca (350ms) — só o valor "assentado" dispara refetch.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchFirstPage = useCallback(
    (mode: 'load' | 'refresh') => {
      const id = ++requestIdRef.current;
      setError(null);
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);

      getBudgetTransactions({
        bucket,
        month,
        search: search || undefined,
        status,
        limit: PAGE_SIZE,
        offset: 0,
      })
        .then((page) => {
          if (id !== requestIdRef.current) return;
          setItems(page.items);
          setTotalCount(page.total_count);
          setTotalAmount(page.total_amount);
          setHasMore(page.has_more);
        })
        .catch((err: unknown) => {
          if (id !== requestIdRef.current) return;
          setError(err instanceof Error ? err.message : 'Erro ao carregar');
        })
        .finally(() => {
          if (id !== requestIdRef.current) return;
          setLoading(false);
          setRefreshing(false);
        });
    },
    [bucket, month, search, status]
  );

  // Mudança de busca/filtro/mês reseta a paginação e refaz a primeira página.
  useEffect(() => {
    if (!isValidBucket) return;
    fetchFirstPage('load');
  }, [fetchFirstPage, isValidBucket]);

  const handleEndReached = useCallback(() => {
    if (appendingRef.current || loading || refreshing || error || !hasMore) return;
    appendingRef.current = true;
    setAppending(true);
    const id = requestIdRef.current;

    getBudgetTransactions({
      bucket,
      month,
      search: search || undefined,
      status,
      limit: PAGE_SIZE,
      offset: items.length,
    })
      .then((page) => {
        if (id !== requestIdRef.current) return;
        setItems((prev) => [...prev, ...page.items]);
        setTotalCount(page.total_count);
        setTotalAmount(page.total_amount);
        setHasMore(page.has_more);
      })
      .catch(() => {
        // Falha ao paginar: mantém o que já está na tela; o usuário pode
        // rolar de novo (has_more permanece true) ou puxar para atualizar.
      })
      .finally(() => {
        appendingRef.current = false;
        setAppending(false);
      });
  }, [bucket, month, search, status, items.length, hasMore, loading, refreshing, error]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<BudgetTransactionItem>) => (
      <TransactionRow item={item} colors={colors} />
    ),
    [colors]
  );

  const keyExtractor = useCallback((item: BudgetTransactionItem) => item.id, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<BudgetTransactionItem> | null | undefined, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    []
  );

  if (!isValidBucket) return null;

  const bucketColor = BUDGET_CATEGORY_COLORS[bucket];

  return (
    <FullScreenOverlay
      title={BUDGET_CATEGORY_LABELS[bucket]}
      onClose={() => router.back()}
    >
      {/* Resumo do bucket: ícone + total + contagem */}
      <View style={styles.summary}>
        <View style={[styles.summaryBadge, { backgroundColor: bucketColor + '22' }]}>
          <IconSymbol name={BUDGET_CATEGORY_ICONS[bucket]} size={24} color={bucketColor} />
        </View>
        <View style={styles.summaryBody}>
          <Text style={[styles.summaryAmount, { color: colors.text }]}>
            {formatCurrency(totalAmount)}
          </Text>
          <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
            {totalCount === 1 ? '1 lançamento' : `${totalCount} lançamentos`}
          </Text>
        </View>
      </View>

      {/* Busca (debounced) */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EFEFF2' },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar lançamento..."
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchText.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchText('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filtro de status (single-select) */}
      <View style={styles.chipsRow}>
        {STATUS_FILTERS.map((filter) => {
          const selected = filter.value === status;
          return (
            <TouchableOpacity
              key={filter.label}
              onPress={() => setStatus(filter.value)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.chip,
                selected
                  ? {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : '#E5E7EB',
                      borderColor: 'transparent',
                    }
                  : { backgroundColor: 'transparent', borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  {
                    color: selected ? colors.text : colors.textSecondary,
                    fontWeight: selected ? FontWeight.semibold : FontWeight.normal,
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateTitle, { color: colors.text }]}>
            Não foi possível carregar os lançamentos
          </Text>
          <Text style={[styles.stateHint, { color: colors.textSecondary }]}>{error}</Text>
          <Button
            label="Tentar novamente"
            variant="secondary"
            size="md"
            fullWidth={false}
            onPress={() => fetchFirstPage('load')}
            style={styles.retryButton}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          removeClippedSubviews
          initialNumToRender={15}
          windowSize={10}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing['2xl'] }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchFirstPage('refresh')}
              tintColor={colors.textSecondary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={[styles.stateTitle, { color: colors.text }]}>
                Nenhum lançamento encontrado
              </Text>
              {search.length > 0 ? (
                <Text style={[styles.stateHint, { color: colors.textSecondary }]}>
                  Tente limpar a busca ou mudar os filtros.
                </Text>
              ) : null}
            </View>
          }
          ListFooterComponent={
            appending ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
              </View>
            ) : null
          }
        />
      )}
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  summaryBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBody: {
    flex: 1,
  },
  summaryAmount: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  summaryCount: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    height: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: FontSize.sm,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rowIconBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowDescription: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  rowSubtitle: {
    fontSize: FontSize.xs,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowAmountLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowDate: {
    fontSize: FontSize.xs,
  },
  pendingPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  pendingPillText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
  },
  skeletonRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  skeletonBody: {
    flex: 1,
    gap: Spacing.sm,
  },
  centerState: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['4xl'],
    gap: Spacing.sm,
  },
  stateTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  stateHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
