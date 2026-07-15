import { useEffect, useState, type PropsWithChildren } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';

import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Liquid Glass real exige iOS 26 + binário compilado com Xcode 26 + API
 * presente em runtime (alguns builds do iOS 26 não têm UIGlassEffect e
 * crashariam sem o segundo check).
 */
export const hasLiquidGlass =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduce);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduce
    );
    return () => subscription.remove();
  }, []);

  return reduce;
}

export type GlassSurfaceProps = PropsWithChildren<
  ViewProps & {
    /**
     * 'glass'    → Liquid Glass de verdade; reservado à camada de controles
     *              flutuantes (header, ações, FAB), nunca a conteúdo.
     * 'material' → material padrão do sistema (frosted); para cartões da
     *              camada de conteúdo, conforme a HIG.
     */
    variant?: 'glass' | 'material';
    /** Tint de ênfase — use em UM único controle primário por tela */
    tintColor?: string;
    /** Efeito de brilho ao toque (só no Liquid Glass nativo) */
    isInteractive?: boolean;
    /** Intensidade do BlurView de fallback (iOS < 26) */
    intensity?: number;
  }
>;

/**
 * Superfície de vidro com cascata de fallbacks:
 * Reduce Transparency → sólido | iOS 26 → GlassView | iOS → BlurView |
 * Android → translúcido com aresta de vidro.
 */
export function GlassSurface({
  variant = 'material',
  tintColor,
  isInteractive,
  intensity,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const reduceTransparency = useReduceTransparency();

  // 1) Acessibilidade: superfície opaca, sem efeitos
  if (reduceTransparency) {
    return (
      <View
        style={[style, isDark ? styles.solidDark : styles.solidLight]}
        {...rest}
      >
        {children}
      </View>
    );
  }

  // 2) Liquid Glass nativo (iOS 26) — apenas para a camada de controles
  if (variant === 'glass' && hasLiquidGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={tintColor}
        isInteractive={isInteractive}
        style={style}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  // 3) iOS: materiais de sistema via BlurView (borderRadius exige clip)
  if (Platform.OS === 'ios') {
    const blurTint =
      variant === 'glass'
        ? isDark
          ? 'systemThinMaterialDark'
          : 'systemThinMaterialLight'
        : isDark
          ? 'systemMaterialDark'
          : 'systemMaterialLight';

    return (
      <View style={[style, styles.clip]} {...rest}>
        <BlurView
          intensity={intensity ?? (variant === 'glass' ? 50 : 65)}
          tint={blurTint}
          style={StyleSheet.absoluteFill}
        />
        {tintColor && (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: tintColor, opacity: 0.3 }]}
          />
        )}
        {children}
      </View>
    );
  }

  // 4) Android: glassmorphism barato — translúcido + aresta de vidro
  return (
    <View
      style={[style, styles.clip, isDark ? styles.fakeDark : styles.fakeLight]}
      {...rest}
    >
      {tintColor && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: tintColor, opacity: 0.3 }]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  solidDark: {
    backgroundColor: '#1E1E20',
  },
  solidLight: {
    backgroundColor: '#F5F5F7',
  },
  fakeDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  fakeLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.75)',
  },
});
