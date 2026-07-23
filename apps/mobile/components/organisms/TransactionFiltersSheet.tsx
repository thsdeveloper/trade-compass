import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { BottomSheet } from '@/components/organisms/BottomSheet';
import { SelectableChip } from '@/components/molecules/SelectableChip';
import { DateRangePicker } from '@/components/molecules/DateRangePicker';
import { BankLogo } from '@/components/atoms/BankLogo';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import type { FeedAdvancedFilters } from '@/hooks/use-transactions-feed';

export type TransactionsPeriod =
  | 'this_month'
  | 'last_30'
  | 'last_90'
  | 'this_year'
  | 'custom';

type TransactionsStatus = 'PAGO' | 'PENDENTE' | 'VENCIDO';

/** CARTAO não é um tipo do backend: vira o filtro source=card (compras de cartão). */
type TransactionsType = 'RECEITA' | 'DESPESA' | 'CARTAO';

export interface TransactionsFilterState {
  type: TransactionsType | null;
  period: TransactionsPeriod | null;
  /** Datas do período personalizado (YYYY-MM-DD); usadas quando period === 'custom'. */
  customStart: string | null;
  customEnd: string | null;
  status: TransactionsStatus | null;
  categoryId: string | null;
  accountId: string | null;
}

export const EMPTY_TRANSACTIONS_FILTERS: TransactionsFilterState = {
  type: null,
  period: null,
  customStart: null,
  customEnd: null,
  status: null,
  categoryId: null,
  accountId: null,
};

const TYPES: { key: TransactionsType; label: string }[] = [
  { key: 'RECEITA', label: 'Receitas' },
  { key: 'DESPESA', label: 'Despesas' },
  { key: 'CARTAO', label: 'Cartão' },
];

const PERIODS: { key: TransactionsPeriod; label: string }[] = [
  { key: 'this_month', label: 'Este mês' },
  { key: 'last_30', label: 'Últimos 30 dias' },
  { key: 'last_90', label: 'Últimos 90 dias' },
  { key: 'this_year', label: 'Este ano' },
  { key: 'custom', label: 'Personalizado' },
];

const STATUSES: { key: TransactionsStatus; label: string }[] = [
  { key: 'PAGO', label: 'Pagas' },
  { key: 'PENDENTE', label: 'Pendentes' },
  { key: 'VENCIDO', label: 'Vencidas' },
];

function formatLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Converte o estado da folha nos parâmetros aceitos por GET /finance/transactions. */
export function toFeedAdvancedFilters(state: TransactionsFilterState): FeedAdvancedFilters {
  const filters: FeedAdvancedFilters = {};
  const today = new Date();

  if (state.period === 'this_month') {
    filters.start_date = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
    // Último dia do mês: inclui lançamentos futuros (pendências) do próprio mês
    filters.end_date = formatLocalDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  } else if (state.period === 'last_30' || state.period === 'last_90') {
    const days = state.period === 'last_30' ? 30 : 90;
    const start = new Date(today);
    start.setDate(start.getDate() - days);
    filters.start_date = formatLocalDate(start);
    filters.end_date = formatLocalDate(today);
  } else if (state.period === 'this_year') {
    filters.start_date = formatLocalDate(new Date(today.getFullYear(), 0, 1));
    filters.end_date = formatLocalDate(new Date(today.getFullYear(), 11, 31));
  } else if (state.period === 'custom') {
    if (state.customStart) filters.start_date = state.customStart;
    if (state.customEnd) filters.end_date = state.customEnd;
  }

  if (state.type === 'CARTAO') filters.source = 'card';
  if (state.status) filters.status = state.status;
  if (state.categoryId) filters.category_id = state.categoryId;
  if (state.accountId) filters.account_id = state.accountId;
  return filters;
}

export function countActiveFilters(state: TransactionsFilterState): number {
  return [state.type, state.period, state.status, state.categoryId, state.accountId].filter(
    Boolean
  ).length;
}

type TransactionFiltersSheetProps = {
  visible: boolean;
  filters: TransactionsFilterState;
  onChange: (filters: TransactionsFilterState) => void;
  onClose: () => void;
};

/**
 * Folha de filtros da tela de transações. Cada seleção é aplicada na hora
 * (o pai repassa ao feed) — tocar num chip já selecionado desmarca.
 */
export function TransactionFiltersSheet({
  visible,
  filters,
  onChange,
  onClose,
}: TransactionFiltersSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { categories, accounts } = useFinance();

  const activeCategories = categories.filter((c) => c.is_active);
  const activeAccounts = accounts.filter((a) => a.is_active);
  const hasActiveFilters = countActiveFilters(filters) > 0;

  const toggle = <K extends keyof TransactionsFilterState>(
    key: K,
    value: TransactionsFilterState[K]
  ) => {
    Haptics.selectionAsync();
    onChange({ ...filters, [key]: filters[key] === value ? null : value });
  };

  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(EMPTY_TRANSACTIONS_FILTERS);
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {children}
      </ScrollView>
    </View>
  );

  return (
    <BottomSheet visible={visible} title="Filtros" onClose={onClose}>
      {renderSection(
        'Tipo',
        TYPES.map((type) => (
          <SelectableChip
            key={type.key}
            label={type.label}
            selected={filters.type === type.key}
            onToggle={() => toggle('type', type.key)}
            accessibilityRole="radio"
            compact
          />
        ))
      )}

      {renderSection(
        'Período',
        PERIODS.map((period) => (
          <SelectableChip
            key={period.key}
            label={period.label}
            selected={filters.period === period.key}
            onToggle={() => toggle('period', period.key)}
            accessibilityRole="radio"
            compact
          />
        ))
      )}

      {filters.period === 'custom' && (
        <View style={styles.customRange}>
          <DateRangePicker
            value={{ start: filters.customStart, end: filters.customEnd }}
            onChange={(range) =>
              onChange({ ...filters, customStart: range.start, customEnd: range.end })
            }
          />
        </View>
      )}

      {renderSection(
        'Status',
        STATUSES.map((status) => (
          <SelectableChip
            key={status.key}
            label={status.label}
            selected={filters.status === status.key}
            onToggle={() => toggle('status', status.key)}
            accessibilityRole="radio"
            compact
          />
        ))
      )}

      {activeAccounts.length > 0 &&
        renderSection(
          'Conta',
          activeAccounts.map((account) => (
            <SelectableChip
              key={account.id}
              label={account.name}
              leading={
                <BankLogo bank={account.bank?.name} name={account.name} size={16} />
              }
              selected={filters.accountId === account.id}
              onToggle={() => toggle('accountId', account.id)}
              accessibilityRole="radio"
              compact
            />
          ))
        )}

      {activeCategories.length > 0 &&
        renderSection(
          'Categoria',
          activeCategories.map((category) => (
            <SelectableChip
              key={category.id}
              label={category.name}
              selected={filters.categoryId === category.id}
              onToggle={() => toggle('categoryId', category.id)}
              accessibilityRole="radio"
              compact
            />
          ))
        )}

      <TouchableOpacity
        style={[
          styles.clearButton,
          { opacity: hasActiveFilters ? 1 : 0.4 },
        ]}
        onPress={clearAll}
        disabled={!hasActiveFilters}
        accessibilityRole="button"
        accessibilityLabel="Limpar filtros"
      >
        <Text style={[styles.clearText, { color: colors.danger }]}>Limpar filtros</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  customRange: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  clearText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
