import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Espessura do anel de gradiente que circula a cápsula
const RING_WIDTH = 2.5;
// Distância acima da tab bar (mais colada que os 80 antigos do FAB)
const BOTTOM_OFFSET = 64;
// Altura aproximada da cápsula: paddingVertical (md*2) + conteúdo (~22) + anel
const ASK_NORTE_BAR_HEIGHT = 52;
/**
 * Folga vertical que a barra flutuante ocupa acima da tab bar. Telas com
 * conteúdo rolável somam isto (+ insets.bottom) ao paddingBottom para que o
 * último item role até acima da cápsula, em vez de ficar escondido sob ela.
 */
export const ASK_NORTE_CLEARANCE = BOTTOM_OFFSET + ASK_NORTE_BAR_HEIGHT + Spacing.lg;

/**
 * Barra flutuante "Pergunte ao Norte" — entrada do agente de IA nas telas
 * principais, no lugar do FAB circular. Cápsula de Liquid Glass (camada
 * funcional) envolta pelo AIRing — as cores circulando na borda sinalizam
 * "inteligência artificial".
 */
export function AskNorteBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const reduceMotion = useReducedMotion();

  const pressScale = useSharedValue(1);
  const badgeScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
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
  }, [badgeScale, reduceMotion]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 14, stiffness: 220 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/agent-chat');
  };

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + BOTTOM_OFFSET }]}
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.shadowWrap, pressStyle]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel="Abrir o Norte, seu assistente financeiro"
        >
          <AIRing width={RING_WIDTH} borderRadius={BorderRadius.full}>
            <GlassSurface
              variant="glass"
              isInteractive
              tintColor={AI_TINT}
              style={styles.pill}
            >
              {/* Ícone direto no vidro, sem badge: mais limpo e mais legível */}
              <Animated.View style={badgeStyle}>
                <IconSymbol name="sparkles" size={18} color="#FFFFFF" />
              </Animated.View>
              <Text style={[styles.label, { color: colors.text }]}>
                Pergunte ao Norte
              </Text>
            </GlassSurface>
          </AIRing>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  shadowWrap: {
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
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
