import { type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SelectableChipProps = {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Elemento à esquerda do label (ex.: logo de bandeira); tem precedência sobre `icon`. */
  leading?: ReactNode;
  selected: boolean;
  onToggle: () => void;
  /** 'radio' quando o grupo é de escolha única (padrão: múltipla escolha). */
  accessibilityRole?: 'checkbox' | 'radio';
  /** Versão reduzida (ex.: linha de tags da nova transação). */
  compact?: boolean;
};

/** Chip de seleção múltipla usado na personalização do onboarding. */
export function SelectableChip({
  label,
  icon,
  leading,
  selected,
  onToggle,
  accessibilityRole = 'checkbox',
  compact = false,
}: SelectableChipProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const idleBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.80)';
  const idleBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.06)';
  const contentColor = selected ? colors.textOnPrimary : colors.text;

  return (
    <TouchableOpacity
      onPress={onToggle}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ checked: selected }}
      style={[
        styles.chip,
        compact && styles.chipCompact,
        { backgroundColor: idleBg, borderColor: idleBorder },
        selected && {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
      ]}
    >
      {leading ??
        (icon ? (
          <Ionicons name={icon} size={compact ? 13 : 16} color={contentColor} />
        ) : null)}
      <Text style={[styles.label, compact && styles.labelCompact, { color: contentColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipCompact: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  labelCompact: {
    fontSize: FontSize.sm,
  },
});
