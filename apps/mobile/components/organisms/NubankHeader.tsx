import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { MoneyText } from '@/components/atoms/MoneyText';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Altura da cápsula, sem contar o inset superior (usada pelo layout da home) */
export const HEADER_BAR_HEIGHT = 56;

interface NubankHeaderProps {
  userPhoto?: string | null;
  /** Saldo total exibido no centro conforme o herói colapsa no scroll */
  balance: number;
  /** 0 = herói visível (centro vazio); 1 = saldo recolhido no header */
  collapseProgress?: SharedValue<number>;
  isBalanceVisible: boolean;
  onToggleBalance: () => void;
  onProfilePress?: () => void;
}

/**
 * Cabeçalho em cápsula de Liquid Glass flutuando sobre o conteúdo,
 * conforme a camada funcional do novo design system da Apple.
 */
export function NubankHeader({
  userPhoto,
  balance,
  collapseProgress,
  isBalanceVisible,
  onToggleBalance,
  onProfilePress,
}: NubankHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Fallback estático (saldo sempre visível) quando não há colapso ligado
  const idleProgress = useSharedValue(1);
  const progress = collapseProgress ?? idleProgress;

  // O saldo compacto surge subindo os últimos pixels até assentar no centro —
  // par do desvanecer do herói, para a troca parecer um movimento só
  const balanceStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [8, 0]) }],
  }));

  const handleToggleBalance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleBalance();
  };

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onProfilePress?.();
  };

  return (
    <View
      style={[styles.wrapper, { top: insets.top + Spacing.sm }]}
      pointerEvents="box-none"
    >
      <GlassSurface variant="glass" style={styles.capsule}>
        <TouchableOpacity
          onPress={handleProfilePress}
          activeOpacity={0.7}
          accessibilityLabel="Abrir perfil"
        >
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <IconSymbol name="person.circle.fill" size={24} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        <Animated.View style={[styles.center, balanceStyle]} pointerEvents="none">
          <MoneyText
            value={balance}
            hidden={!isBalanceVisible}
            style={[styles.headerBalance, { color: colors.text }]}
            numberOfLines={1}
          />
        </Animated.View>

        <TouchableOpacity
          onPress={handleToggleBalance}
          style={styles.iconButton}
          activeOpacity={0.7}
          accessibilityLabel={isBalanceVisible ? 'Ocultar valores' : 'Mostrar valores'}
        >
          <IconSymbol
            name={isBalanceVisible ? 'eye.fill' : 'eye.slash.fill'}
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    zIndex: 10,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    height: HEADER_BAR_HEIGHT,
    paddingHorizontal: Spacing.md,
    borderRadius: HEADER_BAR_HEIGHT / 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  headerBalance: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
