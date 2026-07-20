import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { StyleSheet, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BorderRadius } from '@/constants/theme';

const PULSE_DURATION = 850;
const PulseContext = createContext<SharedValue<number> | null>(null);

/**
 * Fornece UM único driver de pulso para todos os Skeletons abaixo, mantendo
 * a animação sincronizada e barata — uma só timing loop na UI thread,
 * independente de quantos placeholders estejam na tela. Passe `active={false}`
 * quando tudo já carregou para encerrar o loop.
 */
export function SkeletonProvider({
  active = true,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || !active) {
      cancelAnimation(progress);
      progress.value = 0.5;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion, active]);

  return <PulseContext.Provider value={progress}>{children}</PulseContext.Provider>;
}

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

/**
 * Bloco de placeholder animado. Consome o pulso do SkeletonProvider quando
 * presente; caso contrário anima sozinho (para uso isolado).
 */
export function Skeleton({
  width = '100%',
  height = 14,
  radius,
  style,
}: SkeletonProps) {
  const shared = useContext(PulseContext);
  const local = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (shared || reduceMotion) {
      local.value = 0.5;
      return;
    }
    local.value = withRepeat(
      withTiming(1, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [shared, local, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const progress = shared ? shared.value : local.value;
    // Pulso sutil de opacidade (0.35 → 0.7)
    return { opacity: 0.35 + progress * 0.35 };
  });

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius ?? BorderRadius.sm },
        animatedStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
});
