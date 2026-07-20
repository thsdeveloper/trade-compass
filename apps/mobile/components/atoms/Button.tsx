import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Buttons, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Variantes visuais no estilo Revolut:
 * - primary: pill branco sólido, texto quase-preto (CTA principal)
 * - secondary: pill tonal translúcido, texto claro (ação secundária)
 * - tertiary: texto puro, sem fundo (link/ação de baixa ênfase)
 * - destructive: tonal vermelho, texto vermelho (excluir/sair)
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
export type ButtonSize = 'lg' | 'md' | 'sm';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type ButtonProps = {
  /** Texto do botão. Omita apenas em botão icon-only (passe `icon` + `accessibilityLabel`). */
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** Ocupa toda a largura disponível (padrão para CTAs). */
  fullWidth?: boolean;
  /** Ícone à esquerda do texto (ou único ícone, se sem label). */
  icon?: IoniconName;
  /** Ícone à direita do texto. */
  iconRight?: IoniconName;
  /** Botão redondo apenas com ícone. */
  iconOnly?: boolean;
  /** Feedback tátil no toque (padrão true). */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

const SIZE_CONFIG: Record<
  ButtonSize,
  { height: number; fontSize: number; iconSize: number; paddingH: number; gap: number }
> = {
  lg: { height: Buttons.heightLg, fontSize: FontSize.lg, iconSize: 20, paddingH: Spacing['2xl'], gap: Spacing.sm },
  md: { height: Buttons.heightMd, fontSize: FontSize.md, iconSize: 18, paddingH: Spacing.xl, gap: Spacing.sm },
  sm: { height: Buttons.heightSm, fontSize: FontSize.sm, iconSize: 16, paddingH: Spacing.lg, gap: Spacing.xs },
};

/**
 * Botão único do design system (Atomic Design · átomo). Todo botão/CTA do app
 * mobile usa este componente — nunca estilize `TouchableOpacity`/`Pressable`
 * como botão à mão. Estilo Revolut: pill, alto contraste, toque com escala +
 * haptics.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  fullWidth = true,
  icon,
  iconRight,
  iconOnly = false,
  haptic = true,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const scale = useRef(new Animated.Value(1)).current;

  const isInert = disabled || loading;
  const cfg = SIZE_CONFIG[size];

  // Resolve cores por variante (tokens do tema).
  let backgroundColor: string;
  let contentColor: string;
  switch (variant) {
    case 'secondary':
      backgroundColor = Buttons.secondaryBackground;
      contentColor = colors.text;
      break;
    case 'tertiary':
      backgroundColor = 'transparent';
      contentColor = colors.text;
      break;
    case 'destructive':
      backgroundColor = colors.dangerLight;
      contentColor = colors.danger;
      break;
    case 'primary':
    default:
      backgroundColor = Buttons.background;
      contentColor = Buttons.label;
      break;
  }

  const animateTo = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressIn = () => {
    if (isInert) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateTo(0.97);
  };

  const dimensionStyle: ViewStyle = iconOnly
    ? { width: cfg.height, height: cfg.height, borderRadius: cfg.height / 2, paddingHorizontal: 0 }
    : { height: cfg.height, borderRadius: Buttons.radius, paddingHorizontal: cfg.paddingH };

  return (
    <Animated.View
      style={[
        !iconOnly && fullWidth ? styles.fullWidth : styles.selfWidth,
        { transform: [{ scale }] },
        // `style` externo (margens, posicionamento) vai no wrapper, não no
        // Pressable — assim position:absolute e afins se comportam como o
        // chamador espera (o Button é tratado como uma única caixa).
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={() => animateTo(1)}
        disabled={isInert}
        accessibilityRole="button"
        accessibilityState={{ disabled: isInert, busy: loading }}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID}
        style={[
          styles.base,
          dimensionStyle,
          { backgroundColor },
          isInert && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={contentColor} />
        ) : (
          <View style={[styles.content, { gap: cfg.gap }]}>
            {icon ? <Ionicons name={icon} size={cfg.iconSize} color={contentColor} /> : null}
            {label ? (
              <Text
                numberOfLines={1}
                style={[styles.label, { color: contentColor, fontSize: cfg.fontSize }, textStyle]}
              >
                {label}
              </Text>
            ) : null}
            {iconRight ? (
              <Ionicons name={iconRight} size={cfg.iconSize} color={contentColor} />
            ) : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  selfWidth: {
    alignSelf: 'flex-start',
  },
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: FontWeight.semibold,
  },
  disabled: {
    opacity: 0.5,
  },
});
