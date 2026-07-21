import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol, type IconSymbolName } from '@/components/atoms/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MoneyText } from '@/components/atoms/MoneyText';

interface SummaryCardProps {
  title: string;
  value: number;
  iconName: IconSymbolName;
  variant?: 'default' | 'success' | 'danger';
}

export function SummaryCard({
  title,
  value,
  iconName,
  variant = 'default',
}: SummaryCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return { icon: colors.success, iconBg: colors.successLight };
      case 'danger':
        return { icon: colors.danger, iconBg: colors.dangerLight };
      default:
        return { icon: colors.primary, iconBg: colors.primaryLight };
    }
  };

  const variantColors = getVariantColors();
  // Regra global de valores: só receita (success) fica colorida; o resto usa
  // a cor de texto — o ícone do card já carrega a identidade da variante
  const valueColor = variant === 'success' ? colors.success : colors.text;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: variantColors.iconBg }]}
      >
        <IconSymbol name={iconName} size={20} color={variantColors.icon} />
      </View>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      <MoneyText value={value} color={valueColor} style={styles.value} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: '48%',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
