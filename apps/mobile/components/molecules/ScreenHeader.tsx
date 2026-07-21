import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { ScrollEdgeEffect } from '@/components/atoms/ScrollEdgeEffect';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Altura da linha do header (sem o inset superior) */
export const SCREEN_HEADER_HEIGHT = 48;

type ScreenHeaderProps = {
  title: string;
  /** Offset de scroll da tela — alimenta o blur que surge ao rolar */
  scrollY: SharedValue<number>;
  onBack: () => void;
  /** Ação à direita (ex.: lixeira); sem ela, um espelho invisível centraliza o título */
  rightElement?: ReactNode;
};

/**
 * Header de tela integrado ao corpo (Atomic Design · molécula).
 * Transparente em repouso — a tela é um corpo só com o conteúdo; quando o
 * scroll rola por baixo, o ScrollEdgeEffect materializa o blur de sistema
 * atrás do header todo. Use no lugar do header nativo do Stack
 * (`headerShown: false`), renderizado por último para capturar o conteúdo.
 */
export function ScreenHeader({ title, scrollY, onBack, rightElement }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollEdgeEffect scrollY={scrollY} />
      <View style={styles.row}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {/* Espelho do botão de voltar mantém o título opticamente centrado */}
        {rightElement ?? <View style={styles.iconButton} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Flutua sobre o conteúdo: transparente em repouso, blur no scroll
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
  },
  row: {
    height: SCREEN_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    // Feedback por escala (opacity quebraria o Liquid Glass do blur)
    transform: [{ scale: 0.94 }],
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
});
