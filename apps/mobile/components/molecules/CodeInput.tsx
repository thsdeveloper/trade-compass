import { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CodeInputProps = {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
};

/**
 * Campo de código OTP: caixas visuais sobre um TextInput invisível,
 * para manter autofill do iOS (oneTimeCode) e um único foco de teclado.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  error,
  disabled,
}: CodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const digits = value.split('');
  const activeIndex = Math.min(value.length, length - 1);

  const boxBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)';
  const boxBorder = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.08)';

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <View style={styles.row}>
        {Array.from({ length }).map((_, index) => {
          const isActive = !disabled && index === activeIndex && value.length < length;
          return (
            <View
              key={index}
              style={[
                styles.box,
                { backgroundColor: boxBg, borderColor: boxBorder },
                isActive && { borderColor: colors.primary, borderWidth: 2 },
                error && { borderColor: colors.danger, borderWidth: 2 },
              ]}
            >
              <Text style={[styles.digit, { color: colors.text }]}>
                {digits[index] ?? ''}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(text) => {
          const sanitized = text.replace(/\D/g, '').slice(0, length);
          onChange(sanitized);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        editable={!disabled}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  box: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
