import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { getCategoryIcon } from '@/lib/category-icons';
import { MoneyText } from '@/components/atoms/MoneyText';
import { formatDate, type UpcomingPayment } from '@/types/finance';

interface UpcomingPaymentItemProps {
  payment: UpcomingPayment;
}

// Luminância relativa (WCAG) de um hex #RRGGBB, 0 (preto) a 1 (branco).
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * toLinear((n >> 16) & 255) +
    0.7152 * toLinear((n >> 8) & 255) +
    0.0722 * toLinear(n & 255)
  );
}

// Mistura dois hex #RRGGBB (ratio 0 = a, 1 = b).
function mixHex(a: string, b: string, ratio: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const m = (x: number, y: number) => Math.round(x + (y - x) * ratio);
  const r = m((na >> 16) & 255, (nb >> 16) & 255);
  const g = m((na >> 8) & 255, (nb >> 8) & 255);
  const bl = m(na & 255, nb & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

// Garante um tom legível do accent contra o fundo do tema: cartões com cor
// escura (ex.: preto) somem no dark mode — clareia-os mantendo a matiz.
// Retorna a cor original se não for um hex #RRGGBB válido.
function legibleAccent(hex: string, isDark: boolean): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const l = luminance(hex);
  if (isDark && l < 0.45) return mixHex(hex, '#FFFFFF', 0.55);
  if (!isDark && l > 0.72) return mixHex(hex, '#000000', 0.4);
  return hex;
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
  // Fatura de cartão agregada não tem categoria: usa a cor do cartão, que pode
  // ser escura demais para o fundo do app — aí garantimos um tom legível. As
  // categorias mantêm a cor exata (já escolhidas para contrastar).
  const rawAccent =
    payment.category?.color ?? payment.credit_card?.color ?? colors.textSecondary;
  const accentColor = payment.category
    ? rawAccent
    : legibleAccent(rawAccent, isDark);
  const iconBg = accentColor + (isDark ? '30' : '15');

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <IconSymbol
            name={payment.category ? getCategoryIcon(payment.category.icon) : 'creditcard'}
            size={18}
            color={accentColor}
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
        <MoneyText value={payment.amount} style={styles.amount} />
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
