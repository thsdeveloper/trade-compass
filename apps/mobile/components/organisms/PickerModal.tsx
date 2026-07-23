import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { IconSymbol, type IconSymbolName } from '@/components/atoms/icon-symbol';
import { BankLogo } from '@/components/atoms/BankLogo';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type PickerOption = {
  id: string;
  label: string;
  /** Cor do ícone/badge (identidade da categoria/conta) */
  color?: string;
  iconName?: IconSymbolName;
  /** Chave/id/nome do banco — quando presente, exibe a logo do banco no lugar do ícone. */
  bankKey?: string | null;
  subtitle?: string;
  /** Filhos, para exibição hierárquica pai → filhos */
  children?: PickerOption[];
  /**
   * Linha não selecionável — vira cabeçalho de seção (ex.: "Contas"/"Cartões"
   * no seletor unificado de origem do pagamento).
   */
  disabled?: boolean;
};

type PickerModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  selectedId: string | null;
  /** IDs marcados quando o seletor opera em modo de seleção múltipla. */
  selectedIds?: string[];
  multiple?: boolean;
  onSelect: (id: string) => void;
  /** Confirma a seleção múltipla sem tratar cada toque como conclusão. */
  onConfirm?: () => void;
  searchPlaceholder?: string;
  /** Espelha o termo digitado para quem busca no servidor (ex.: catálogo de bancos). */
  onQueryChange?: (query: string) => void;
  /** Desligue quando a lista já vem filtrada do servidor. */
  filterLocally?: boolean;
  /** Mostra indicador de carregamento no lugar da lista vazia. */
  isLoading?: boolean;
  /** Texto quando não há resultado (ou mensagem de erro). */
  emptyText?: string;
  /** Abre o teclado automaticamente; pode ser desligado em seletores sobre outra folha. */
  autoFocusSearch?: boolean;
};

type Row =
  | { kind: 'parent'; option: PickerOption }
  | { kind: 'child'; option: PickerOption }
  | { kind: 'flat'; option: PickerOption };

function buildRows(options: PickerOption[], query: string): Row[] {
  const q = query.trim().toLowerCase();
  const matches = (o: PickerOption) => o.label.toLowerCase().includes(q);
  const rows: Row[] = [];

  for (const opt of options) {
    const children = opt.children ?? [];

    if (children.length === 0) {
      if (!q || matches(opt)) rows.push({ kind: 'flat', option: opt });
      continue;
    }

    const parentMatches = !q || matches(opt);
    const matchedChildren = q ? children.filter(matches) : children;

    if (parentMatches || matchedChildren.length > 0) {
      rows.push({ kind: 'parent', option: opt });
      const shown = q && !parentMatches ? matchedChildren : children;
      for (const child of shown) rows.push({ kind: 'child', option: child });
    }
  }

  return rows;
}

/**
 * Seletor único do app: busca, ícones nas cores correspondentes e visão
 * hierárquica pai → filhos. Abre no mesmo Full Screen Overlay (blur) dos
 * demais modais. Usado por categorias (hierárquico) e contas (lista simples).
 */
export function PickerModal({
  visible,
  onClose,
  title,
  options,
  selectedId,
  selectedIds = [],
  multiple = false,
  onSelect,
  onConfirm,
  searchPlaceholder = 'Buscar...',
  onQueryChange,
  filterLocally = true,
  isLoading = false,
  emptyText = 'Nada encontrado',
  autoFocusSearch = true,
}: PickerModalProps) {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const inputRef = useRef<TextInput>(null);

  // Abre já com o cursor no campo de busca e o teclado aberto — o usuário só
  // digita. Foca por ref (não autoFocus) porque o modal fica montado reabrindo
  // via `visible`, e no iOS focar após a animação garante que o teclado suba.
  useEffect(() => {
    if (!visible || !autoFocusSearch) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [visible, autoFocusSearch]);

  const rows = useMemo(
    () => buildRows(options, filterLocally ? query : ''),
    [options, query, filterLocally]
  );

  const handleQueryChange = (next: string) => {
    setQuery(next);
    onQueryChange?.(next);
  };

  const handleClose = () => {
    handleQueryChange('');
    onClose();
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    if (!multiple) handleClose();
  };

  const handleConfirm = () => {
    handleQueryChange('');
    onConfirm?.();
  };

  const renderRow = ({ item }: { item: Row }) => {
    const { option } = item;
    const isChild = item.kind === 'child';
    const isParent = item.kind === 'parent';
    const selected = multiple
      ? selectedIds.includes(option.id)
      : option.id === selectedId;

    if (option.disabled) {
      return (
        <View style={[styles.row, styles.rowHeader]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {option.label}
          </Text>
        </View>
      );
    }

    const iconBadge = option.iconName ? (
      <View
        style={[
          styles.iconBadge,
          isChild && styles.iconBadgeSmall,
          { backgroundColor: (option.color ?? colors.icon) + '22' },
        ]}
      >
        <IconSymbol
          name={option.iconName}
          size={isChild ? 15 : 18}
          color={option.color ?? colors.icon}
        />
      </View>
    ) : option.color ? (
      <View style={[styles.dot, { backgroundColor: option.color }]} />
    ) : null;

    return (
      <TouchableOpacity
        style={[styles.row, isChild && styles.rowChild]}
        onPress={() => handleSelect(option.id)}
        activeOpacity={0.6}
        accessibilityRole={multiple ? 'checkbox' : 'button'}
        accessibilityState={multiple ? { checked: selected } : undefined}
      >
        {option.bankKey ? (
          <BankLogo
            bank={option.bankKey}
            size={isChild ? 30 : 36}
            formato="quadrado"
            fallback={iconBadge}
          />
        ) : (
          iconBadge
        )}

        <View style={styles.rowBody}>
          <Text
            style={[
              styles.rowLabel,
              { color: colors.text },
              isParent && styles.rowLabelParent,
            ]}
            numberOfLines={1}
          >
            {option.label}
          </Text>
          {option.subtitle ? (
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {option.subtitle}
            </Text>
          ) : null}
        </View>

        {selected ? (
          <IconSymbol name="checkmark" size={20} color={colors.tint} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <FullScreenOverlay
        title={title}
        onClose={handleClose}
        headerRight={
          multiple ? (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="Concluir seleção de categorias"
              hitSlop={10}
            >
              <IconSymbol name="checkmark" size={22} color={colors.tint} />
            </TouchableOpacity>
          ) : undefined
        }
      >
        <View
          style={[
            styles.searchBar,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EFEFF2' },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={handleQueryChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => handleQueryChange('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          style={styles.list}
          data={rows}
          keyExtractor={(item) => `${item.kind}-${item.option.id}`}
          renderItem={renderRow}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing['2xl'] }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator style={styles.empty} color={colors.textSecondary} />
            ) : (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                {emptyText}
              </Text>
            )
          }
        />
      </FullScreenOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  confirmButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowChild: {
    paddingLeft: Spacing['3xl'],
  },
  rowHeader: {
    paddingBottom: Spacing.xs,
    paddingTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeSmall: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FontSize.md,
  },
  rowLabelParent: {
    fontWeight: FontWeight.semibold,
  },
  rowSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    paddingVertical: Spacing['3xl'],
  },
});
