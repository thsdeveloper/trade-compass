import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCurrency } from '@/types/finance';

interface SummaryCardProps {
  title: string;
  value: number;
  iconName: IconSymbolName;
  variant?: 'default' | 'success' | 'danger';
}

const VARIANT_COLORS = {
  default: {
    light: { icon: '#3b82f6', iconBg: '#dbeafe' },
    dark: { icon: '#60a5fa', iconBg: '#1e3a5f' },
  },
  success: {
    light: { icon: '#059669', iconBg: '#d1fae5' },
    dark: { icon: '#10b981', iconBg: '#064e3b' },
  },
  danger: {
    light: { icon: '#dc2626', iconBg: '#fee2e2' },
    dark: { icon: '#f87171', iconBg: '#7f1d1d' },
  },
};

export function SummaryCard({
  title,
  value,
  iconName,
  variant = 'default',
}: SummaryCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const variantColors = VARIANT_COLORS[variant][isDark ? 'dark' : 'light'];
  const valueColor = variant === 'default' ? colors.text : variantColors.icon;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1f2937' : '#fff',
          borderColor: isDark ? '#374151' : '#e5e7eb',
        },
      ]}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: variantColors.iconBg }]}
      >
        <IconSymbol name={iconName} size={20} color={variantColors.icon} />
      </View>
      <Text style={[styles.title, { color: colors.icon }]}>{title}</Text>
      <Text style={[styles.value, { color: valueColor }]}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: '48%',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
  },
});
