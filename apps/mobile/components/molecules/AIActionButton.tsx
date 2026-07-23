import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { AIRing, AI_TINT, AI_GLOW } from '@/components/atoms/AIRing';
import { Buttons, Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Espessura do anel de gradiente (mesma da barra "Pergunte ao Norte")
const RING_WIDTH = 2.5;

interface AIActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Botão inline de ação com IA (molécula) — a mesma assinatura visual da barra
 * "Pergunte ao Norte" da home: cápsula de Liquid Glass com tint violeta,
 * envolta pelo AIRing girando, sparkles "respirando" e glow. Use-o em toda
 * ação disparada por IA (ex.: ler fatura), no lugar do <Button> comum — as
 * cores circulando são o sinal de "isto é inteligência artificial".
 */
export function AIActionButton({
  label,
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
}: AIActionButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const reduceMotion = useReducedMotion();

  const pressScale = useSharedValue(1);
  const badgeScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion || disabled) {
      badgeScale.value = 1;
      return;
    }
    // Pulso sutil no ícone de sparkles — "respiração" da IA
    badgeScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [badgeScale, reduceMotion, disabled]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    pressScale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 14, stiffness: 220 });
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View
      style={[styles.shadowWrap, pressStyle, disabled && styles.disabled, style]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={accessibilityLabel ?? label}
      >
        <AIRing width={RING_WIDTH} borderRadius={BorderRadius.full} active={!disabled}>
          <GlassSurface
            variant="glass"
            isInteractive
            tintColor={AI_TINT}
            style={styles.pill}
          >
            <Animated.View style={badgeStyle}>
              <IconSymbol name="sparkles" size={18} color="#FFFFFF" />
            </Animated.View>
            <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
              {label}
            </Text>
          </GlassSurface>
        </AIRing>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    // Mesmo footprint do <Button> primário (fullWidth): CTA de largura total
    alignSelf: 'stretch',
    borderRadius: BorderRadius.full,
    // Glow violeta em vez de sombra neutra: reforça a identidade "IA"
    shadowColor: AI_GLOW,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    // Altura do <Button> size 'lg' descontando o anel, para o conjunto
    // (anel + cápsula) fechar nos mesmos 56pt do CTA primário
    height: Buttons.heightLg - RING_WIDTH * 2,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.full,
  },
  label: {
    // Mesma tipografia do <Button> size 'lg'
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  disabled: {
    opacity: 0.5,
  },
});
