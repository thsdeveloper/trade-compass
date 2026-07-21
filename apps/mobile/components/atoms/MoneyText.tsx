import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCurrency } from '@/types/finance';

interface MoneyTextProps {
  value: number;
  /**
   * Tipo da transação: RECEITA pinta de verde; DESPESA e qualquer outro caso
   * ficam na cor padrão de texto (nunca vermelho, nunca com sinal +/-).
   */
  type?: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA' | null;
  /** Modo privacidade: mostra R$ •••• no lugar do valor */
  hidden?: boolean;
  /**
   * Sobrescreve a cor em casos de STATUS (ex: estouro de orçamento).
   * Não usar para "despesa = vermelho" — essa convenção foi abolida.
   */
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}

/**
 * Exibição canônica de valores em R$ (Atomic Design · átomo). TODO lugar do
 * app que mostra dinheiro usa este componente: sem prefixo de sinal, receitas
 * em verde, o resto na cor de texto do tema, algarismos tabulares.
 */
export function MoneyText({
  value,
  type = null,
  hidden = false,
  color,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
}: MoneyTextProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const resolvedColor = color ?? (type === 'RECEITA' ? colors.success : colors.text);

  return (
    <Text
      style={[styles.base, { color: resolvedColor }, style]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
    >
      {hidden ? 'R$ ••••' : formatCurrency(value)}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontVariant: ['tabular-nums'],
  },
});
