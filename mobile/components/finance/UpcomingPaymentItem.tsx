import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCurrency, formatDate, type UpcomingPayment } from '@/types/finance';

interface UpcomingPaymentItemProps {
  payment: UpcomingPayment;
}

export function UpcomingPaymentItem({ payment }: UpcomingPaymentItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getUrgencyColor = () => {
    if (payment.days_until_due <= 0) {
      return colors.danger; // Vencido
    }
    if (payment.days_until_due <= 3) {
      return colors.warning; // Muito urgente
    }
    if (payment.days_until_due <= 7) {
      return colors.warning; // Urgente
    }
    return colors.textSecondary; // Normal
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
            <Text style={[styles.dueDate, { color: colors.textSecondary }]}>
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
        <Text style={[styles.amount, { color: colors.danger }]}>
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
    paddingVertical: Spacing.md,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
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
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dueDate: {
    fontSize: FontSize.xs,
  },
  cardBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
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
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  daysLeft: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
