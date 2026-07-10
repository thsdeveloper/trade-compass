import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TransactionType } from '@/types/finance';

interface TransactionTypeToggleProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

export function TransactionTypeToggle({
  value,
  onChange,
}: TransactionTypeToggleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isExpense = value === 'DESPESA';

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <TouchableOpacity
        style={[
          styles.button,
          styles.leftButton,
          {
            backgroundColor: isExpense ? colors.danger : colors.surface,
            borderRightColor: colors.border,
          },
        ]}
        onPress={() => onChange('DESPESA')}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.text,
            { color: isExpense ? '#fff' : colors.textSecondary },
          ]}
        >
          Despesa
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.rightButton,
          {
            backgroundColor: !isExpense ? colors.success : colors.surface,
            borderLeftColor: colors.border,
          },
        ]}
        onPress={() => onChange('RECEITA')}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.text,
            { color: !isExpense ? '#fff' : colors.textSecondary },
          ]}
        >
          Receita
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  leftButton: {
    borderRightWidth: 0.5,
  },
  rightButton: {
    borderLeftWidth: 0.5,
  },
  text: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
