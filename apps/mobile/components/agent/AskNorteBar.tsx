import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AI_GRADIENT = ['#7C3AED', '#A855F7', '#D946EF'] as const;

/**
 * Barra flutuante "Pergunte ao Norte" — entrada do agente de IA em telas de
 * lista, no lugar do FAB circular.
 */
export function AskNorteBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/agent-chat');
  };

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + 80 }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Abrir o Norte, seu assistente financeiro"
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          colors={AI_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBadge}
        >
          <IconSymbol name="sparkles" size={14} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[styles.label, { color: colors.text }]}>
          Pergunte ao Norte
        </Text>
      </Pressable>
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
