import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MonthNavigatorProps {
  date: Date;
  onPrevious: () => void;
  onNext: () => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const BAR_HEIGHT = 44;

/**
 * Controle de mês em cápsula de vidro. Os botões internos são pressáveis
 * planos (vibrancy) — nunca vidro sobre vidro.
 */
export function MonthNavigator({
  date,
  onPrevious,
  onNext,
}: MonthNavigatorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const monthName = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();

  return (
    <GlassSurface variant="glass" style={styles.capsule}>
      <TouchableOpacity
        onPress={onPrevious}
        style={styles.button}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Mês anterior"
        activeOpacity={0.6}
      >
        <IconSymbol name="chevron.left" size={18} color={colors.text} />
      </TouchableOpacity>

      <Text style={[styles.text, { color: colors.text }]}>
        {monthName} {year}
      </Text>

      <TouchableOpacity
        onPress={onNext}
        style={styles.button}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Próximo mês"
        activeOpacity={0.6}
      >
        <IconSymbol name="chevron.right" size={18} color={colors.text} />
      </TouchableOpacity>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    paddingHorizontal: Spacing.sm,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: FontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
});
