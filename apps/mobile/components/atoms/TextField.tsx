import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontSize } from '@/constants/theme';

type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholder'> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: boolean;
  /** Elemento à direita (ex.: olho de senha); substitui o botão de limpar */
  rightElement?: ReactNode;
};

/**
 * Campo de texto do design system: contêiner preenchido e arredondado,
 * sem borda, com label flutuante dentro do campo (vira placeholder quando
 * vazio) e botão de limpar durante a edição.
 */
export function TextField({
  label,
  value,
  onChangeText,
  error,
  rightElement,
  onFocus,
  onBlur,
  multiline,
  editable,
  ...rest
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Label flutua quando há foco ou conteúdo; caso contrário é o placeholder
  const isLifted = isFocused || value.length > 0;
  const lift = useRef(new Animated.Value(isLifted ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(lift, {
      toValue: isLifted ? 1 : 0,
      duration: 140,
      useNativeDriver: false,
    }).start();
  }, [isLifted, lift]);

  const labelFontSize = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [FontSize.lg, FontSize.xs],
  });
  const labelTop = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [multiline ? 16 : 19, 9],
  });

  const showClear =
    !rightElement && isFocused && value.length > 0 && editable !== false;

  return (
    <Pressable
      style={[
        styles.container,
        multiline && styles.containerMultiline,
        error && styles.containerError,
      ]}
      onPress={() => inputRef.current?.focus()}
    >
      <Animated.Text
        style={[styles.label, { fontSize: labelFontSize, top: labelTop }]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>

      <TextInput
        ref={inputRef}
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        multiline={multiline}
        editable={editable}
        placeholderTextColor="transparent"
        selectionColor="#FFFFFF"
        {...rest}
      />

      {showClear ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityLabel={`Limpar ${label}`}
        >
          <Ionicons
            name="close-circle"
            size={20}
            color="rgba(255,255,255,0.45)"
          />
        </TouchableOpacity>
      ) : (
        rightElement ?? null
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 16,
  },
  containerMultiline: {
    minHeight: 104,
    alignItems: 'flex-start',
  },
  containerError: {
    borderWidth: 1.5,
    borderColor: Colors.dark.danger,
  },
  label: {
    position: 'absolute',
    left: 16,
    color: 'rgba(255,255,255,0.55)',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    paddingTop: 24,
    paddingBottom: 10,
  },
  inputMultiline: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
  clearButton: {
    marginLeft: 8,
  },
});
