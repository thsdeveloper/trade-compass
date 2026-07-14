import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, BorderRadius } from '@/constants/theme';

// Paleta "IA" (violeta -> fucsia), a mesma linguagem visual do AIButton do web.
const AI_GRADIENT = ['#7C3AED', '#A855F7', '#D946EF'] as const;
const GLOW_COLOR = '#A855F7';

const FAB_SIZE = 56;
// Acima da tab bar
const BOTTOM_OFFSET = 80;

export function AgentFab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.35);

  useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1600, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 1600, easing: Easing.in(Easing.quad) })
      ),
      -1
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.08, { duration: 1600 }),
        withTiming(0.35, { duration: 1600 })
      ),
      -1
    );
  }, [glowScale, glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/agent-chat');
  };

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + BOTTOM_OFFSET }]}
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.glow, glowStyle]} />
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Abrir o Norte, seu assistente financeiro"
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={AI_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <IconSymbol name="sparkles" size={26} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 100,
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: BorderRadius.full,
    backgroundColor: GLOW_COLOR,
  },
  pressable: {
    borderRadius: BorderRadius.full,
    shadowColor: GLOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
