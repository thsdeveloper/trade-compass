import { useMemo, useState } from 'react';
import {
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
};

type PickerModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchPlaceholder?: string;
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
  onSelect,
  searchPlaceholder = 'Buscar...',
}: PickerModalProps) {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const rows = useMemo(() => buildRows(options, query), [options, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    handleClose();
  };

  const renderRow = ({ item }: { item: Row }) => {
    const { option } = item;
    const isChild = item.kind === 'child';
    const isParent = item.kind === 'parent';
    const selected = option.id === selectedId;

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
      <FullScreenOverlay title={title} onClose={handleClose}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EFEFF2' },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Nada encontrado
            </Text>
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
