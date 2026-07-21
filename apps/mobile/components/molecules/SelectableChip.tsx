import { type ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SelectableChipProps = {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  onToggle: () => void;
  /** 'radio' quando o grupo é de escolha única (padrão: múltipla escolha). */
  accessibilityRole?: 'checkbox' | 'radio';
};

/** Chip de seleção múltipla usado na personalização do onboarding. */
export function SelectableChip({
  label,
  icon,
  selected,
  onToggle,
  accessibilityRole = 'checkbox',
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
        { backgroundColor: idleBg, borderColor: idleBorder },
        selected && {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={contentColor} /> : null}
      <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
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
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});
