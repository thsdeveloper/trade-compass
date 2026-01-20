import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCurrency, formatDate, type UpcomingPayment } from '@/types/finance';

interface UpcomingPaymentItemProps {
  payment: UpcomingPayment;
}

export function UpcomingPaymentItem({ payment }: UpcomingPaymentItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const getUrgencyColor = () => {
    if (payment.days_until_due <= 0) {
      return isDark ? '#f87171' : '#dc2626'; // Vencido
    }
    if (payment.days_until_due <= 3) {
      return isDark ? '#fb923c' : '#ea580c'; // Muito urgente
    }
    if (payment.days_until_due <= 7) {
      return isDark ? '#fbbf24' : '#d97706'; // Urgente
    }
    return colors.icon; // Normal
  };

  const getDaysLabel = () => {
    if (payment.days_until_due < 0) {
      return `${Math.abs(payment.days_until_due)} dias atrasado`;
    }
    if (payment.days_until_due === 0) {
      return 'Vence hoje';
    }
    if (payment.days_until_due === 1) {
      return 'Vence amanha';
    }
    return `${payment.days_until_due} dias`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: payment.category.color + '20' },
          ]}
        >
          <View
            style={[
              styles.colorDot,
              { backgroundColor: payment.category.color },
            ]}
          />
        </View>
        <View style={styles.textContent}>
          <Text
            style={[styles.description, { color: colors.text }]}
            numberOfLines={1}
          >
            {payment.description}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.dueDate, { color: colors.icon }]}>
              {formatDate(payment.due_date)}
            </Text>
            {payment.credit_card && (
              <View
                style={[
                  styles.cardBadge,
                  { backgroundColor: payment.credit_card.color + '20' },
                ]}
              >
                <Text
                  style={[styles.cardText, { color: payment.credit_card.color }]}
                  numberOfLines={1}
                >
                  {payment.credit_card.name}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.rightContent}>
        <Text style={[styles.amount, { color: isDark ? '#f87171' : '#dc2626' }]}>
          -{formatCurrency(payment.amount)}
        </Text>
        <Text style={[styles.daysLeft, { color: getUrgencyColor() }]}>
          {getDaysLabel()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  textContent: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueDate: {
    fontSize: 12,
  },
  cardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 100,
  },
  cardText: {
    fontSize: 10,
    fontWeight: '500',
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  daysLeft: {
    fontSize: 11,
    fontWeight: '500',
  },
});
