import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactionsFeed, type FeedTypeFilter } from '@/hooks/use-transactions-feed';
import { TransactionListItem } from '@/components/finance/TransactionListItem';
import { TransactionDetailModal } from '@/components/finance/TransactionDetailModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AskNorteBar } from '@/components/agent/AskNorteBar';
import {
  groupTransactionsByDate,
  formatCurrency,
  type TransactionWithDetails,
} from '@/types/finance';

const BALANCE_VISIBILITY_KEY = '@balance_visibility';

interface SectionData {
  title: string;
  data: TransactionWithDetails[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

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

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // Set status bar style when screen gains focus
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(colorScheme === 'dark' ? 'light' : 'dark');
    }, [colorScheme])
  );

  // Feed paginado (carrega por demanda, filtros no servidor)
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
  } = useTransactionsFeed();

  // Totais do mês corrente para os chips (mesma fonte do dashboard da Home)
  const { dashboardSummary, loadDashboard } = useFinance();

  useEffect(() => {
    if (!dashboardSummary) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mesma preferência de visibilidade usada na Home
  useEffect(() => {
    AsyncStorage.getItem(BALANCE_VISIBILITY_KEY)
      .then((stored) => {
        if (stored !== null) setIsBalanceVisible(stored === 'true');
      })
      .catch(() => {});
  }, []);

  const toggleBalanceVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsBalanceVisible((prev) => {
      AsyncStorage.setItem(BALANCE_VISIBILITY_KEY, String(!prev)).catch(() => {});
      return !prev;
    });
  }, []);

  const handleTransactionPress = useCallback((transaction: TransactionWithDetails) => {
    setSelectedTransaction(transaction);
    setIsDetailModalVisible(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalVisible(false);
    setSelectedTransaction(null);
  }, []);

  const toggleFilter = useCallback(
    (filter: Exclude<FeedTypeFilter, 'ALL'>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTypeFilter(typeFilter === filter ? 'ALL' : filter);
    },
    [typeFilter, setTypeFilter]
  );

  const sections: SectionData[] = useMemo(() => {
    const grouped = groupTransactionsByDate(items);
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({
        title: formatSectionDate(date),
        data,
      }));
  }, [items]);

  const monthIncome = dashboardSummary?.month_income ?? 0;
  const monthExpenses = dashboardSummary?.month_expenses ?? 0;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Busca (server-side, com debounce) */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
        <IconSymbol name="magnifyingglass" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Chips com totais do mês — tocar filtra por tipo */}
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[
            styles.chip,
            typeFilter === 'RECEITA' && {
              backgroundColor: colors.successLight,
              borderColor: colors.success,
            },
          ]}
          onPress={() => toggleFilter('RECEITA')}
          activeOpacity={0.7}
          accessibilityLabel="Filtrar receitas"
        >
          <View style={[styles.chipIcon, { backgroundColor: colors.successLight }]}>
            <IconSymbol name="arrow.down" size={13} color={colors.success} />
          </View>
          <Text style={[styles.chipValue, { color: colors.text }]}>
            {isBalanceVisible ? formatCurrency(monthIncome) : 'R$ ••••'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.chip,
            typeFilter === 'DESPESA' && {
              backgroundColor: colors.dangerLight,
              borderColor: colors.danger,
            },
          ]}
          onPress={() => toggleFilter('DESPESA')}
          activeOpacity={0.7}
          accessibilityLabel="Filtrar despesas"
        >
          <View style={[styles.chipIcon, { backgroundColor: colors.dangerLight }]}>
            <IconSymbol name="arrow.up" size={13} color={colors.danger} />
          </View>
          <Text style={[styles.chipValue, { color: colors.text }]}>
            {isBalanceVisible ? formatCurrency(monthExpenses) : 'R$ ••••'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Message */}
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
      <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {section.title}
        </Text>
      </View>
    ),
    [colors]
  );

  const renderItem = useCallback(
    ({ item, index, section }: { item: TransactionWithDetails; index: number; section: SectionData }) => (
      <TransactionListItem
        transaction={item}
        onPress={() => handleTransactionPress(item)}
        showDivider={index < section.data.length - 1}
        hideAmount={!isBalanceVisible}
      />
    ),
    [handleTransactionPress, isBalanceVisible]
  );

  const keyExtractor = useCallback(
    (item: TransactionWithDetails) => item.id,
    []
  );

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
              : typeFilter === 'ALL'
                ? 'Você ainda não tem transações'
                : `Você não tem ${typeFilter === 'RECEITA' ? 'receitas' : 'despesas'}`}
        </Text>
      </View>
    ),
    [isLoading, colors, typeFilter, search]
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Barra superior fixa: permanece visível durante o scroll */}
      <View style={[styles.topBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.topBarButton, { backgroundColor: colors.surface }]}
          onPress={toggleBalanceVisibility}
          accessibilityLabel={isBalanceVisible ? 'Ocultar valores' : 'Mostrar valores'}
        >
          <IconSymbol
            name={isBalanceVisible ? 'eye' : 'eye.slash'}
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={[styles.topBarTitle, { color: colors.text }]}>Atividades</Text>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={[styles.topBarButton, { backgroundColor: colors.surface }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/nota-chat');
            }}
            accessibilityLabel="Lançar por nota fiscal"
          >
            <IconSymbol name="qrcode.viewfinder" size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topBarButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/new-transaction');
            }}
            accessibilityLabel="Nova transação"
          >
            <IconSymbol name="plus" size={22} color={colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        onRefresh={refresh}
        refreshing={isRefreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={7}
        removeClippedSubviews
      />

      <AskNorteBar />

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    zIndex: 10,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipIcon: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  listContent: {
    paddingBottom: 160,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
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
