import {
  forwardRef,
  memo,
  useImperativeHandle,
  useState,
} from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Colors, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCurrency } from '@/types/finance';

const MAX_CENTS = 9_999_999_999; // R$ 99.999.999,99

export interface AmountInputHandle {
  /** Valor atual em centavos (lido só na hora de salvar). */
  getCents: () => number;
  /** Pré-preenche o valor (ex.: rascunho do scanner de nota fiscal). */
  setCents: (cents: number) => void;
}

interface AmountInputProps {
  /** Cor do valor (verde em receita, branco em despesa, azul em transferência). */
  color: string;
  autoFocus?: boolean;
  /**
   * Dispara apenas na fronteira vazio ↔ preenchido — o pai usa para habilitar
   * o Salvar sem re-renderizar a tela inteira a cada dígito.
   */
  onHasValueChange?: (hasValue: boolean) => void;
}

/**
 * Input herói de valor em centavos com o teclado do dispositivo. O estado vive
 * aqui dentro (componente memoizado): digitar re-renderiza só este componente;
 * o pai lê os centavos via ref na hora de salvar.
 */
export const AmountInput = memo(
  forwardRef<AmountInputHandle, AmountInputProps>(function AmountInput(
    { color, autoFocus = false, onHasValueChange },
    ref
  ) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [cents, setCentsState] = useState(0);

    const applyCents = (next: number) => {
      setCentsState((prev) => {
        if ((prev > 0) !== (next > 0)) onHasValueChange?.(next > 0);
        return next;
      });
    };

    useImperativeHandle(ref, () => ({
      getCents: () => cents,
      setCents: (next) => applyCents(Math.min(Math.max(next, 0), MAX_CENTS)),
    }));

    // Entrada em centavos via teclado do dispositivo: descarta não-dígitos
    const handleChange = (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, 11);
      applyCents(digits ? Math.min(parseInt(digits, 10), MAX_CENTS) : 0);
    };

    // Valor sempre renderizado (mesmo zerado) com a seleção fixada no fim:
    // o caret fica depois do último dígito — nunca antes do "R$" — e o
    // usuário não move o cursor para o meio do valor formatado.
    const display = formatCurrency(cents / 100);

    return (
      <TextInput
        style={[styles.amount, { color: cents > 0 ? color : colors.textSecondary }]}
        value={display}
        selection={{ start: display.length, end: display.length }}
        onChangeText={handleChange}
        keyboardType="decimal-pad"
        textAlign="center"
        autoFocus={autoFocus}
      />
    );
  })
);

const styles = StyleSheet.create({
  amount: {
    fontSize: 44,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
