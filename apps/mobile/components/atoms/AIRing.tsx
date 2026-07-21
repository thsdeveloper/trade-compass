import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Espectro "IA" vivo — violeta → fúcsia → ciano, contrastando com o azul de
// marca do app. O último stop repete o primeiro para o anel girar sem emenda.
export const AI_RING_GRADIENT = [
  '#7C3AED',
  '#D946EF',
  '#F472B6',
  '#22D3EE',
  '#7C3AED',
] as const;
// Tint violeta "IA" — use em UM único elemento com tintColor por tela (alpha
// contido: tint forte mata o efeito do Liquid Glass).
export const AI_TINT = 'rgba(168, 85, 247, 0.45)';
export const AI_GLOW = '#A855F7';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

type AIRingProps = PropsWithChildren<{
  /** Espessura do anel de gradiente */
  width?: number;
  /** Raio externo do anel (interno fica por conta do filho) */
  borderRadius: number;
  /** Liga/desliga o anel sem desmontar o conteúdo (o espaço é preservado) */
  active?: boolean;
  /** Duração de uma volta completa, em ms */
  duration?: number;
  /**
   * Espectro do anel (default: AI_RING_GRADIENT do Norte). Para girar sem
   * emenda, o último stop deve repetir o primeiro.
   */
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Anel de gradiente "IA" em rotação contínua (Atomic Design · átomo).
 * Envolve qualquer conteúdo com uma borda de cores circulando — a assinatura
 * visual do Norte. O gradiente é um quadrado do tamanho da diagonal girando
 * por baixo; o filho cobre o centro, deixando visível só a borda.
 * Com Reduce Motion ativo, a borda fica colorida porém estática.
 */
export function AIRing({
  width = 2.5,
  borderRadius,
  active = true,
  duration = 3200,
  colors = AI_RING_GRADIENT,
  style,
  children,
}: AIRingProps) {
  const reduceMotion = useReducedMotion();

  // Medidas do conteúdo para dimensionar o quadrado do gradiente em rotação
  // (precisa cobrir a diagonal para nunca mostrar canto vazio ao girar)
  const [size, setSize] = useState({ width: 0, height: 0 });
  const side = Math.ceil(Math.hypot(size.width, size.height));

  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !active) {
      rotation.value = 0;
      return;
    }
    // Cores circulando em volta da borda, em loop contínuo
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1
    );
  }, [rotation, reduceMotion, active, duration]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={[styles.ring, { borderRadius, padding: width }, style]}
      onLayout={(e) => setSize(e.nativeEvent.layout)}
    >
      {active && side > 0 && (
        <AnimatedGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            ringStyle,
            {
              width: side,
              height: side,
              left: (size.width - side) / 2,
              top: (size.height - side) / 2,
            },
          ]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
  },
});
