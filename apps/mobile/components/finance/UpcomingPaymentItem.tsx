import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getCategoryIcon } from '@/lib/category-icons';
import { formatCurrency, formatDate, type UpcomingPayment } from '@/types/finance';

interface UpcomingPaymentItemProps {
  payment: UpcomingPayment;
}

export function UpcomingPaymentItem({ payment }: UpcomingPaymentItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const getUrgency = () => {
    if (payment.days_until_due < 0) {
      return {
        label: `${Math.abs(payment.days_until_due)}d atrasado`,
        text: colors.danger,
        bg: colors.dangerLight,
      };
    }
    if (payment.days_until_due === 0) {
      return { label: 'Vence hoje', text: colors.danger, bg: colors.dangerLight };
    }
    if (payment.days_until_due === 1) {
      return { label: 'Vence amanhã', text: colors.warning, bg: colors.warningLight };
    }
    if (payment.days_until_due <= 7) {
      return {
        label: `Em ${payment.days_until_due} dias`,
        text: colors.warning,
        bg: colors.warningLight,
      };
    }
    return {
      label: `Em ${payment.days_until_due} dias`,
      text: colors.textSecondary,
      bg: colors.card,
    };
  };

  const urgency = getUrgency();
  const iconBg = payment.category.color + (isDark ? '30' : '15');

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <IconSymbol
            name={getCategoryIcon(payment.category.icon)}
            size={18}
            color={payment.category.color}
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
              <View style={styles.cardBadge}>
                <IconSymbol
                  name="creditcard"
                  size={11}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.cardText, { color: colors.textSecondary }]}
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
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatCurrency(payment.amount)}
        </Text>
        <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
          <Text style={[styles.urgencyText, { color: urgency.text }]}>
            {urgency.label}
          </Text>
        </View>
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
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: 120,
  },
  cardText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  rightContent: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  amount: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  urgencyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  urgencyText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
