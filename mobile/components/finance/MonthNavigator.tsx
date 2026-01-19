import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MonthNavigatorProps {
  date: Date;
  onPrevious: () => void;
  onNext: () => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Marco',
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
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPrevious}
        style={styles.button}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <IconSymbol name="chevron.left" size={24} color={colors.tint} />
      </TouchableOpacity>

      <Text style={[styles.text, { color: colors.text }]}>
        {monthName} {year}
      </Text>

      <TouchableOpacity
        onPress={onNext}
        style={styles.button}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <IconSymbol name="chevron.right" size={24} color={colors.tint} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 24,
  },
  button: {
    padding: 8,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 150,
    textAlign: 'center',
  },
});
