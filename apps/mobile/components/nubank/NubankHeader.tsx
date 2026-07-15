import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Altura da cápsula, sem contar o inset superior (usada pelo layout da home) */
export const HEADER_BAR_HEIGHT = 56;

interface NubankHeaderProps {
  userName?: string;
  userPhoto?: string | null;
  isBalanceVisible: boolean;
  onToggleBalance: () => void;
  onProfilePress?: () => void;
}

/**
 * Cabeçalho em cápsula de Liquid Glass flutuando sobre o conteúdo,
 * conforme a camada funcional do novo design system da Apple.
 */
export function NubankHeader({
  userName = 'Usuario',
  userPhoto,
  isBalanceVisible,
  onToggleBalance,
  onProfilePress,
}: NubankHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleToggleBalance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleBalance();
  };

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onProfilePress?.();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = userName.split(' ')[0];

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

        <Text style={[styles.greeting, { color: colors.text }]} numberOfLines={1}>
          {getGreeting()}, {firstName}
        </Text>

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
  greeting: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
