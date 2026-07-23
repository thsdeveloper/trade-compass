import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionsFeed } from '@/hooks/use-transactions-feed';
import { TransactionListItem } from '@/components/molecules/TransactionListItem';
import { TransactionDetailModal } from '@/components/organisms/TransactionDetailModal';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface, useReduceTransparency } from '@/components/atoms/GlassSurface';
import { MoneyText } from '@/components/atoms/MoneyText';
import { ScrollEdgeEffect } from '@/components/atoms/ScrollEdgeEffect';
import { Skeleton, SkeletonProvider } from '@/components/atoms/Skeleton';
import { AskNorteBar } from '@/components/organisms/AskNorteBar';
import {
  TransactionFiltersSheet,
  EMPTY_TRANSACTIONS_FILTERS,
  countActiveFilters,
  toFeedAdvancedFilters,
  type TransactionsFilterState,
} from '@/components/organisms/TransactionFiltersSheet';
import { bulkDeleteTransactions, type BulkDeleteSkipReason } from '@/lib/finance-api';
import {
  groupTransactionsByDate,
  type TransactionWithDetails,
} from '@/types/finance';

const BALANCE_VISIBILITY_KEY = '@balance_visibility';

interface SectionData {
  title: string;
  net: number;
  data: TransactionWithDetails[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const SKIP_REASON_LABEL: Record<BulkDeleteSkipReason, string> = {
  not_found: 'não encontradas',
  transfer: 'transferências (cancele pela própria transferência)',
  already_cancelled: 'já canceladas',
  credit_card_paid: 'compras de cartão já pagas via fatura',
};

/** "Hoje", "Ontem", dia da semana (últimos/próximos 7 dias) ou "10 de julho" */
function formatSectionDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - date.getTime()) / DAY_MS);

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays === -1) return 'Amanhã';

  if (Math.abs(diffDays) < 7) {
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }

  const label = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const sameYear = date.getFullYear() === today.getFullYear();
  return sameYear ? label : `${label} de ${date.getFullYear()}`;
}

/**
 * Linha do feed com barreira de memo própria: os handlers chegam estáveis
 * (identidade fixa) e o closure por item é criado só aqui dentro — assim,
 * mudanças de seleção/filtro re-renderizam apenas as linhas afetadas.
 */
const FeedRow = memo(function FeedRow({
  item,
  showDivider,
  hideAmount,
  selectionMode,
  selected,
  onPressItem,
  onLongPressItem,
}: {
  item: TransactionWithDetails;
  showDivider: boolean;
  hideAmount: boolean;
  selectionMode: boolean;
  selected: boolean;
  onPressItem: (transaction: TransactionWithDetails) => void;
  onLongPressItem: (transaction: TransactionWithDetails) => void;
}) {
  return (
    <TransactionListItem
      transaction={item}
      onPress={() => onPressItem(item)}
      onLongPress={() => onLongPressItem(item)}
      showDivider={showDivider}
      hideAmount={hideAmount}
      selectionMode={selectionMode}
      selected={selected}
    />
  );
});

/** Placeholder do feed enquanto filtros/busca recarregam a primeira página. */
function FeedSkeleton({ isDark }: { isDark: boolean }) {
  const tint = {
    backgroundColor: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.08)',
  };
  const renderRows = (count: number, keyPrefix: string) =>
    Array.from({ length: count }).map((_, index) => (
      <View key={`${keyPrefix}-${index}`} style={skeletonStyles.row}>
        <Skeleton width={40} height={40} radius={20} style={tint} />
        <View style={skeletonStyles.rowText}>
          <Skeleton width="55%" height={13} style={tint} />
          <Skeleton width="30%" height={11} style={tint} />
        </View>
        <Skeleton width={64} height={14} style={tint} />
      </View>
    ));

  return (
    <SkeletonProvider>
      <View style={skeletonStyles.container}>
        <Skeleton width={72} height={16} style={tint} />
        {renderRows(5, 'a')}
        <Skeleton width={96} height={16} style={{ ...tint, marginTop: Spacing.xl }} />
        {renderRows(4, 'b')}
      </View>
    </SkeletonProvider>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowText: {
    flex: 1,
    gap: Spacing.xs,
  },
});

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const screenBg = isDark ? colors.background : '#F6F7F9';
  // Fallback (Android / transparência reduzida): mesmas cores do ScrollEdgeEffect
  const sectionHeaderBg = isDark
    ? 'rgba(18, 18, 18, 0.94)'
    : 'rgba(246, 247, 249, 0.94)';
  const reduceTransparency = useReduceTransparency();

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [filterState, setFilterState] = useState<TransactionsFilterState>(
    EMPTY_TRANSACTIONS_FILTERS
  );
  const scrollY = useSharedValue(0);

  const selectionMode = selectedIds.size > 0;
  const activeFilterCount = countActiveFilters(filterState);

  // A visibilidade de valores é controlada na home; aqui só refletimos a
  // preferência salva (relida a cada foco para acompanhar mudanças lá).
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(colorScheme === 'dark' ? 'light' : 'dark');
      AsyncStorage.getItem(BALANCE_VISIBILITY_KEY)
        .then((stored) => {
          if (stored !== null) setIsBalanceVisible(stored === 'true');
        })
        .catch(() => {});
    }, [colorScheme])
  );

  const {
    items,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    typeFilter,
    search,
    loadMore,
    refresh,
    setTypeFilter,
    setSearch,
    setAdvancedFilters,
    removeItems,
  } = useTransactionsFeed();

  // Cada mudança na folha de filtros é aplicada imediatamente ao feed.
  // CARTAO não é um tipo do backend — vira source=card nos filtros avançados.
  useEffect(() => {
    setAdvancedFilters(toFeedAdvancedFilters(filterState));
    setTypeFilter(
      filterState.type === 'CARTAO' ? 'ALL' : (filterState.type ?? 'ALL')
    );
  }, [filterState, setAdvancedFilters, setTypeFilter]);

  const openSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSearching(true);
  }, []);

  const closeSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSearching(false);
    setSearch('');
  }, [setSearch]);

  const openFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsFiltersVisible(true);
  }, []);

  // Título pequeno se materializa no header conforme o grande rola para fora
  const collapsedTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
  }));

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = event.nativeEvent.contentOffset.y;
    },
    [scrollY]
  );

  // Recarga por filtro/busca substitui a lista pelo skeleton (volta ao topo);
  // zera o driver de scroll para o header não ficar "colapsado" à toa.
  useEffect(() => {
    if (isLoading) scrollY.value = 0;
  }, [isLoading, scrollY]);

  // Ref espelha o modo de seleção para os handlers das linhas manterem
  // identidade estável (pré-requisito do memo de FeedRow).
  const selectionModeRef = useRef(selectionMode);
  selectionModeRef.current = selectionMode;

  const handleTransactionPress = useCallback((transaction: TransactionWithDetails) => {
    if (selectionModeRef.current) {
      Haptics.selectionAsync();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(transaction.id)) {
          next.delete(transaction.id);
        } else {
          next.add(transaction.id);
        }
        return next;
      });
      return;
    }
    setSelectedTransaction(transaction);
    setIsDetailModalVisible(true);
  }, []);

  const handleTransactionLongPress = useCallback((transaction: TransactionWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIds((prev) => new Set(prev).add(transaction.id));
  }, []);

  const clearSelection = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length === 0 || isDeleting) return;

    Alert.alert(
      ids.length === 1 ? 'Excluir transação?' : `Excluir ${ids.length} transações?`,
      'Transações pagas terão o valor estornado do saldo da conta. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const result = await bulkDeleteTransactions(ids);
              removeItems(result.deleted);
              setSelectedIds(new Set());
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              if (result.skipped.length > 0) {
                const byReason = new Map<BulkDeleteSkipReason, number>();
                for (const item of result.skipped) {
                  byReason.set(item.reason, (byReason.get(item.reason) || 0) + 1);
                }
                const details = [...byReason]
                  .map(([reason, count]) => `• ${count} ${SKIP_REASON_LABEL[reason]}`)
                  .join('\n');
                Alert.alert(
                  result.deleted.length > 0
                    ? `${result.deleted.length} excluída(s)`
                    : 'Nenhuma transação excluída',
                  `Não foi possível excluir:\n${details}`
                );
              }
            } catch (err) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                'Erro ao excluir',
                err instanceof Error ? err.message : 'Tente novamente mais tarde'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [selectedIds, isDeleting, removeItems]);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalVisible(false);
    setSelectedTransaction(null);
  }, []);

  const sections: SectionData[] = useMemo(() => {
    const grouped = groupTransactionsByDate(items);
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({
        title: formatSectionDate(date),
        net: data.reduce(
          (sum, t) => sum + (t.type === 'RECEITA' ? t.amount : -t.amount),
          0
        ),
        data,
      }));
  }, [items]);


  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.bigTitle, { color: colors.text }]}>Transações</Text>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.dangerLight }]}>
          <IconSymbol name="exclamationmark.triangle" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}
    </View>
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View style={styles.sectionHeader}>
        {/* Mesmo material do header principal (ScrollEdgeEffect): blur de
            sistema no iOS, cor sólida equivalente como fallback */}
        {Platform.OS === 'ios' && !reduceTransparency ? (
          <BlurView
            intensity={60}
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: sectionHeaderBg }]}
          />
        )}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {section.title}
        </Text>
        {/* Saldo do dia: verde quando positivo; sem prefixo de sinal
            (negativo já sai do formatCurrency como -R$) */}
        <MoneyText
          value={section.net}
          color={section.net >= 0 ? colors.success : colors.textSecondary}
          hidden={!isBalanceVisible}
          style={styles.sectionNet}
        />
      </View>
    ),
    [colors, sectionHeaderBg, isBalanceVisible, isDark, reduceTransparency]
  );

  const renderItem = useCallback(
    ({ item, index, section }: { item: TransactionWithDetails; index: number; section: SectionData }) => (
      <FeedRow
        item={item}
        showDivider={index < section.data.length - 1}
        hideAmount={!isBalanceVisible}
        selectionMode={selectionMode}
        selected={selectedIds.has(item.id)}
        onPressItem={handleTransactionPress}
        onLongPressItem={handleTransactionLongPress}
      />
    ),
    [handleTransactionPress, handleTransactionLongPress, isBalanceVisible, selectionMode, selectedIds]
  );

  const keyExtractor = useCallback((item: TransactionWithDetails) => item.id, []);

  const ListFooterComponent = useCallback(
    () =>
      isLoadingMore ? (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      ) : null,
    [isLoadingMore, colors]
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
          <IconSymbol name="doc.text" size={48} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {isLoading ? 'Carregando...' : 'Nenhuma transação'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {isLoading
            ? 'Aguarde enquanto buscamos suas transações'
            : search
              ? 'Nada encontrado para essa busca'
              : activeFilterCount > 0
                ? 'Nada encontrado para os filtros selecionados'
                : typeFilter === 'ALL'
                  ? 'Você ainda não tem transações'
                  : `Você não tem ${typeFilter === 'RECEITA' ? 'receitas' : 'despesas'}`}
        </Text>
      </View>
    ),
    [isLoading, colors, typeFilter, search, activeFilterCount]
  );

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <LinearGradient
        colors={
          isDark
            ? ['#1D4ED8', '#16233F', colors.background]
            : ['#0066FF', '#7FB0FF', screenBg]
        }
        locations={[0, 0.55, 1]}
        style={styles.ambientBackground}
        pointerEvents="none"
      />

      {/* Barra superior fixa (ações em Liquid Glass) */}
      {selectionMode ? (
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          <ScrollEdgeEffect scrollY={scrollY} />
          <Pressable
            onPress={clearSelection}
            accessibilityRole="button"
            accessibilityLabel="Cancelar seleção"
          >
            {({ pressed }) => (
              <View style={pressed && styles.buttonPressed}>
                <GlassSurface variant="glass" isInteractive style={styles.topBarButton}>
                  <IconSymbol name="xmark" size={18} color={colors.text} />
                </GlassSurface>
              </View>
            )}
          </Pressable>

          <GlassSurface variant="glass" style={styles.selectionCountPill}>
            <Text style={[styles.selectionCount, { color: colors.text }]}>
              {selectedIds.size} {selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
            </Text>
          </GlassSurface>

          <Pressable
            onPress={handleBulkDelete}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel="Excluir transações selecionadas"
          >
            {({ pressed }) => (
              <View style={pressed && styles.buttonPressed}>
                <GlassSurface variant="glass" isInteractive style={styles.topBarButton}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <IconSymbol name="trash.fill" size={20} color={colors.danger} />
                  )}
                </GlassSurface>
              </View>
            )}
          </Pressable>
        </View>
      ) : isSearching ? (
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <ScrollEdgeEffect scrollY={scrollY} />
        {/* Modo busca: o input toma o header, escondendo os demais elementos */}
        <View
          style={[
            styles.headerSearchBar,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.85)' },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar transações"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoFocus
          />
        </View>

        <Pressable
          onPress={closeSearch}
          accessibilityRole="button"
          accessibilityLabel="Fechar busca"
        >
          {({ pressed }) => (
            <View style={pressed && styles.buttonPressed}>
              <GlassSurface variant="glass" isInteractive style={styles.topBarButton}>
                <IconSymbol name="xmark" size={18} color={colors.text} />
              </GlassSurface>
            </View>
          )}
        </Pressable>
      </View>
      ) : (
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <ScrollEdgeEffect scrollY={scrollY} />

        {/* Título colapsado: aparece conforme o título grande rola para fora */}
        <Animated.View
          style={[styles.collapsedTitleWrap, collapsedTitleStyle]}
          pointerEvents="none"
        >
          <Text style={[styles.collapsedTitle, { color: colors.text }]}>Transações</Text>
        </Animated.View>

        <Pressable
          onPress={openFilters}
          accessibilityRole="button"
          accessibilityLabel="Filtrar transações"
        >
          {({ pressed }) => (
            <View style={pressed && styles.buttonPressed}>
              <GlassSurface variant="glass" isInteractive style={styles.topBarButton}>
                <IconSymbol name="line.3.horizontal.decrease" size={20} color={colors.text} />
                {activeFilterCount > 0 && (
                  <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </GlassSurface>
            </View>
          )}
        </Pressable>

        <View style={styles.topBarActions}>
          <Pressable
            onPress={openSearch}
            accessibilityRole="button"
            accessibilityLabel="Buscar transações"
          >
            {({ pressed }) => (
              <View style={pressed && styles.buttonPressed}>
                <GlassSurface variant="glass" isInteractive style={styles.topBarButton}>
                  <IconSymbol name="magnifyingglass" size={20} color={colors.text} />
                </GlassSurface>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/nota-chat');
            }}
            accessibilityRole="button"
            accessibilityLabel="Lançar por nota fiscal"
          >
            {({ pressed }) => (
              <View style={pressed && styles.buttonPressed}>
                <GlassSurface variant="glass" isInteractive style={styles.topBarButton}>
                  <IconSymbol name="qrcode.viewfinder" size={20} color={colors.text} />
                </GlassSurface>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/new-transaction');
            }}
            accessibilityRole="button"
            accessibilityLabel="Nova transação"
          >
            {({ pressed }) => (
              <View style={pressed && styles.buttonPressed}>
                <GlassSurface variant="glass" isInteractive style={styles.topBarButton}>
                  <IconSymbol name="plus" size={22} color="#FFFFFF" />
                </GlassSurface>
              </View>
            )}
          </Pressable>
        </View>
      </View>
      )}

      {isLoading ? (
        // Skeleton imediato a cada mudança de filtro/busca (primeira página)
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={[styles.bigTitle, { color: colors.text }]}>Transações</Text>
          </View>
          <FeedSkeleton isDark={isDark} />
        </View>
      ) : (
      <SectionList
        sections={sections}
        extraData={selectedIds}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onRefresh={refresh}
        refreshing={isRefreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        updateCellsBatchingPeriod={40}
        windowSize={7}
        removeClippedSubviews
      />
      )}

      <AskNorteBar />

      <TransactionFiltersSheet
        visible={isFiltersVisible}
        filters={filterState}
        onChange={setFilterState}
        onClose={() => setIsFiltersVisible(false)}
      />

      <TransactionDetailModal
        transaction={selectedTransaction}
        visible={isDetailModalVisible}
        onClose={handleCloseDetailModal}
      />
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
    height: 300,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    zIndex: 10,
    gap: Spacing.sm,
  },
  collapsedTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.sm,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  filterBadge: {
    // GlassSurface tem overflow hidden — o badge precisa ficar dentro do botão
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCountPill: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  buttonPressed: {
    transform: [{ scale: 0.92 }],
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
  },
  bigTitle: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.bold,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 160,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  sectionNet: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  footerLoading: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
});
