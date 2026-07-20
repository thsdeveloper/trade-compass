import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { IconSymbol, type IconSymbolName } from '@/components/atoms/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TransactionType } from '@/types/finance';

interface TransactionTypeToggleProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

/**
 * Seletor Despesa/Receita em pill segmentado: o segmento ativo é preenchido
 * com a cor semântica (vermelho/verde) e ganha ícone, coerente com o dark
 * da tela de nova transação.
 */
export function TransactionTypeToggle({
  value,
  onChange,
}: TransactionTypeToggleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const segments: {
    key: TransactionType;
    label: string;
    icon: IconSymbolName;
    color: string;
  }[] = [
    { key: 'DESPESA', label: 'Despesa', icon: 'arrow.down', color: colors.danger },
    { key: 'RECEITA', label: 'Receita', icon: 'arrow.up', color: colors.success },
  ];

  const select = (next: TransactionType) => {
    if (next === value) return;
    Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(118,118,128,0.12)' },
      ]}
    >
      {segments.map((seg) => {
        const active = value === seg.key;
        return (
          <TouchableOpacity
            key={seg.key}
            style={[styles.segment, active && { backgroundColor: seg.color }]}
            onPress={() => select(seg.key)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <IconSymbol
              name={seg.icon}
              size={16}
              color={active ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.label,
                { color: active ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {seg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
