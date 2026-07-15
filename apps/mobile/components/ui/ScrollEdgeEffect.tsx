import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceTransparency } from '@/components/ui/GlassSurface';

interface ScrollEdgeEffectProps {
  /** Offset de scroll da tela (shared value atualizado no onScroll) */
  scrollY: SharedValue<number>;
  /** Quanto de scroll até o material aparecer por completo */
  threshold?: number;
}

/**
 * "Scroll edge effect" do Liquid Glass: um material de sistema que se
 * materializa atrás do header conforme o conteúdo rola por baixo.
 * Renderize como primeiro filho do container do header (preenche-o via
 * absoluteFill). Em repouso (scroll no topo) é invisível.
 */
export function ScrollEdgeEffect({ scrollY, threshold = 40 }: ScrollEdgeEffectProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const reduceTransparency = useReduceTransparency();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, threshold], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, animatedStyle]}
      pointerEvents="none"
    >
      {Platform.OS === 'ios' && !reduceTransparency ? (
        // systemChromeMaterial é o material de barras de navegação do iOS
        <BlurView
          intensity={60}
          tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? 'rgba(18, 18, 18, 0.94)'
                : 'rgba(246, 247, 249, 0.94)',
            },
          ]}
        />
      )}
      <View
        style={[
          styles.bottomHairline,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomHairline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});
