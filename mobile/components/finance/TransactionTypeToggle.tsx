import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { TransactionType } from '@/types/finance';

interface TransactionTypeToggleProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

const EXPENSE_COLOR = '#dc2626';
const INCOME_COLOR = '#059669';

export function TransactionTypeToggle({
  value,
  onChange,
}: TransactionTypeToggleProps) {
  const isExpense = value === 'DESPESA';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          styles.leftButton,
          isExpense && { backgroundColor: EXPENSE_COLOR },
        ]}
        onPress={() => onChange('DESPESA')}
        activeOpacity={0.8}
      >
        <Text style={[styles.text, isExpense && styles.activeText]}>
          Despesa
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.rightButton,
          !isExpense && { backgroundColor: INCOME_COLOR },
        ]}
        onPress={() => onChange('RECEITA')}
        activeOpacity={0.8}
      >
        <Text style={[styles.text, !isExpense && styles.activeText]}>
          Receita
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  leftButton: {
    borderRightWidth: 0.5,
    borderRightColor: '#e5e7eb',
  },
  rightButton: {
    borderLeftWidth: 0.5,
    borderLeftColor: '#e5e7eb',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeText: {
    color: '#fff',
  },
});
