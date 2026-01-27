import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { MonthSlider } from '@/components/finance/MonthSlider';
import { TransactionListItem } from '@/components/finance/TransactionListItem';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import {
  groupTransactionsByDate,
  formatCurrency,
  type TransactionWithDetails,
} from '@/types/finance';

interface SectionData {
  title: string;
  data: TransactionWithDetails[];
}

type FilterType = 'ALL' | 'RECEITA' | 'DESPESA';

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'RECEITA', label: 'Receitas' },
  { key: 'DESPESA', label: 'Despesas' },
];

function formatSectionDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase().replace('.', '');
}

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set status bar style when screen gains focus
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(colorScheme === 'dark' ? 'light' : 'dark');
    }, [colorScheme])
  );

  const {
    transactions,
    selectedMonth,
    isLoading,
    error,
    setSelectedMonth,
    loadTransactions,
    refreshAll,
  } = useFinance();

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [selectedMonth, loadTransactions]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadTransactions();
    setIsRefreshing(false);
  }, [loadTransactions]);

  const handleMonthChange = useCallback(
    (date: Date) => {
      setSelectedMonth(date);
    },
    [setSelectedMonth]
  );

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'ALL') return transactions;
    return transactions.filter((t) => t.type === activeFilter);
  }, [transactions, activeFilter]);

  const monthTotals = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'RECEITA')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === 'DESPESA')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense };
  }, [transactions]);

  const sections: SectionData[] = useMemo(() => {
    const grouped = groupTransactionsByDate(filteredTransactions);
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        title: formatSectionDate(date),
        data: items,
      }));
  }, [filteredTransactions]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]}>Transações</Text>

      {/* Month Slider */}
      <MonthSlider
        selectedDate={selectedMonth}
        onMonthChange={handleMonthChange}
      />

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryIconContainer}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.successLight }]}>
              <IconSymbol name="arrow.down" size={16} color={colors.success} />
            </View>
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Receitas
            </Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(monthTotals.income)}
            </Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryIconContainer}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.dangerLight }]}>
              <IconSymbol name="arrow.up" size={16} color={colors.danger} />
            </View>
          </View>
          <View style={styles.summaryTextContainer}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Despesas
            </Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>
              {formatCurrency(monthTotals.expense)}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
        {FILTER_OPTIONS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: colors.primary },
              ]}
              onPress={() => setActiveFilter(filter.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: isActive ? colors.textOnPrimary : colors.textSecondary },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
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
        showDivider={index < section.data.length - 1}
      />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: TransactionWithDetails) => item.id,
    []
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
          <IconSymbol
            name="doc.text"
            size={48}
            color={colors.textSecondary}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {isLoading ? 'Carregando...' : 'Nenhuma transação'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {isLoading
            ? 'Aguarde enquanto buscamos suas transações'
            : activeFilter === 'ALL'
              ? 'Você não tem transações neste mês'
              : `Você não tem ${activeFilter === 'RECEITA' ? 'receitas' : 'despesas'} neste mês`}
        </Text>
      </View>
    ),
    [isLoading, colors, activeFilter]
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
      />
      <FloatingActionButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: 'bold',
    paddingTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  summaryIconContainer: {},
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    fontWeight: '600',
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
