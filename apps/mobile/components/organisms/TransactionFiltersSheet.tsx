import { useEffect } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { BottomSheet } from '@/components/organisms/BottomSheet';
import { CategoryPicker } from '@/components/organisms/CategoryPicker';
import { SelectableChip } from '@/components/molecules/SelectableChip';
import { DateRangePicker } from '@/components/molecules/DateRangePicker';
import { BankLogo } from '@/components/atoms/BankLogo';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { getCategoryIcon } from '@/lib/category-icons';
import type { FeedAdvancedFilters } from '@/hooks/use-transactions-feed';

export type TransactionsPeriod =
  | 'today'
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
  categoryIds: string[];
  accountId: string | null;
  /** Cartão selecionado quando o tipo é CARTAO. */
  creditCardId: string | null;
  /** Agrupa as compras de cartão em itens de fatura (cartão + mês) na lista. */
  groupCardByInvoice: boolean;
}

export const EMPTY_TRANSACTIONS_FILTERS: TransactionsFilterState = {
  type: null,
  period: null,
  customStart: null,
  customEnd: null,
  status: null,
  categoryIds: [],
  accountId: null,
  creditCardId: null,
  groupCardByInvoice: false,
};

const TYPES: { key: TransactionsType; label: string }[] = [
  { key: 'RECEITA', label: 'Receitas' },
  { key: 'DESPESA', label: 'Despesas' },
  { key: 'CARTAO', label: 'Cartão de crédito' },
];

const PERIODS: { key: TransactionsPeriod; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'this_month', label: 'Este mês' },
  { key: 'last_30', label: 'Últimos 30 dias' },
  { key: 'last_90', label: 'Últimos 90 dias' },
  { key: 'this_year', label: 'Este ano' },
  { key: 'custom', label: 'Personalizado' },
];

// Cada status carrega sua cor: pago=verde, pendente=amarelo, vencido=vermelho.
// A cor real vem do tema (success/warning/danger) no render.
const STATUSES: { key: TransactionsStatus; label: string; tone: 'success' | 'warning' | 'danger' }[] = [
  { key: 'PAGO', label: 'Pagas', tone: 'success' },
  { key: 'PENDENTE', label: 'Pendentes', tone: 'warning' },
  { key: 'VENCIDO', label: 'Vencidas', tone: 'danger' },
];

function formatLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Converte o estado da folha nos parâmetros aceitos por GET /finance/transactions. */
export function toFeedAdvancedFilters(state: TransactionsFilterState): FeedAdvancedFilters {
  const filters: FeedAdvancedFilters = {};
  const today = new Date();

  if (state.period === 'today') {
    const iso = formatLocalDate(today);
    filters.start_date = iso;
    filters.end_date = iso;
  } else if (state.period === 'this_month') {
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

  if (state.type === 'CARTAO') {
    filters.source = 'card';
    if (state.creditCardId) filters.credit_card_id = state.creditCardId;
  } else if (state.accountId) {
    filters.account_id = state.accountId;
  }
  if (state.status) filters.status = state.status;
  if (state.categoryIds.length > 0) {
    filters.category_ids = state.categoryIds.join(',');
  }
  return filters;
}

// O switch de agrupamento é um modo de exibição, não um filtro de dados — fora da contagem.
export function countActiveFilters(state: TransactionsFilterState): number {
  return state.categoryIds.length + [
    state.type,
    state.period,
    state.status,
    state.accountId,
    state.creditCardId,
  ].filter(Boolean).length;
}

type TransactionFiltersSheetProps = {
  visible: boolean;
  filters: TransactionsFilterState;
  onChange: (filters: TransactionsFilterState) => void;
  onClose: () => void;
};

/**
 * Folha de filtros da tela de transações. Chips simples são aplicados na hora;
 * categorias usam uma seleção múltipla temporária e só são aplicadas ao confirmar.
 */
export function TransactionFiltersSheet({
  visible,
  filters,
  onChange,
  onClose,
}: TransactionFiltersSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const {
    categories,
    accounts,
    creditCards,
    loadCategories,
    loadCreditCards,
  } = useFinance();

  // Garante que as opções dos seletores estejam carregadas quando a folha abrir.
  useEffect(() => {
    if (!visible) return;
    loadCategories();
    loadCreditCards();
  }, [visible, loadCategories, loadCreditCards]);

  const activeCategories = categories.filter((c) => c.is_active);
  const activeAccounts = accounts.filter((a) => a.is_active);
  const isCardType = filters.type === 'CARTAO';
  const hasActiveFilters = countActiveFilters(filters) > 0;

  const statusColor = { success: colors.success, warning: colors.warning, danger: colors.danger };

  const toggle = <K extends keyof TransactionsFilterState>(
    key: K,
    value: TransactionsFilterState[K]
  ) => {
    Haptics.selectionAsync();
    onChange({ ...filters, [key]: filters[key] === value ? null : value });
  };

  // Trocar o tipo limpa o seletor oposto (conta ↔ cartão) para não filtrar por
  // uma origem que não existe mais no contexto do tipo escolhido.
  const selectType = (value: TransactionsFilterState['type']) => {
    Haptics.selectionAsync();
    const next = filters.type === value ? null : value;
    onChange({ ...filters, type: next, accountId: null, creditCardId: null });
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
            onToggle={() => selectType(type.key)}
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
            selectedColor={statusColor[status.tone]}
            onToggle={() => toggle('status', status.key)}
            accessibilityRole="radio"
            compact
          />
        ))
      )}

      {/* Origem depende do tipo: cartão de crédito quando tipo=CARTAO, conta caso contrário */}
      {isCardType
        ? creditCards.length > 0 &&
          renderSection(
            'Cartão de crédito',
            creditCards.map((card) => (
              <SelectableChip
                key={card.id}
                label={card.name}
                icon="card"
                selected={filters.creditCardId === card.id}
                onToggle={() => toggle('creditCardId', card.id)}
                accessibilityRole="radio"
                compact
              />
            ))
          )
        : activeAccounts.length > 0 &&
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

      {renderSection(
        'Categoria',
        <CategoryPicker
          categories={activeCategories}
          selectedIds={filters.categoryIds}
          multiple
          onSelectMany={(selectedCategories) => {
            Haptics.selectionAsync();
            onChange({
              ...filters,
              categoryIds: selectedCategories.map((category) => category.id),
            });
          }}
          renderTrigger={({ open, selectedCategories }) => {
            const count = filters.categoryIds.length;
            const selected = count === 1 ? selectedCategories[0] : undefined;

            return (
              <View style={styles.categoryFilterRow}>
                <SelectableChip
                  label={
                    selected?.name ??
                    (count > 1 ? `${count} categorias` : 'Categoria')
                  }
                  icon={
                    selected
                      ? undefined
                      : count > 1
                        ? 'pricetags-outline'
                        : 'pricetag-outline'
                  }
                  leading={
                    selected ? (
                      <IconSymbol
                        name={getCategoryIcon(selected.icon)}
                        size={14}
                        color={selected.color}
                      />
                    ) : undefined
                  }
                  selected={count > 0}
                  selectedColor={selected?.color}
                  onToggle={() => {
                    Haptics.selectionAsync();
                    open();
                  }}
                  accessibilityRole="checkbox"
                  compact
                />
                {count > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.clearCategoryButton,
                      { backgroundColor: colors.border },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onChange({ ...filters, categoryIds: [] });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Remover filtros de categoria"
                    hitSlop={6}
                  >
                    <IconSymbol name="xmark" size={13} color={colors.icon} />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Modo de exibição: agrupa compras de cartão em itens de fatura na lista */}
      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={[styles.switchTitle, { color: colors.text }]}>
            Agrupar cartão por fatura
          </Text>
          <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
            Junta as compras de cada cartão num único item por mês de fatura
          </Text>
        </View>
        <Switch
          value={filters.groupCardByInvoice}
          onValueChange={(next) => {
            Haptics.selectionAsync();
            onChange({ ...filters, groupCardByInvoice: next });
          }}
          trackColor={{ true: colors.primary }}
          accessibilityLabel="Agrupar cartão por fatura"
        />
      </View>

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
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  categoryFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  clearCategoryButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRange: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  switchHint: {
    fontSize: FontSize.xs,
    lineHeight: 16,
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
