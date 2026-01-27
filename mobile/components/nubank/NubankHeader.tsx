import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SCROLL_THRESHOLD = 80;

interface NubankHeaderProps {
  userName?: string;
  userPhoto?: string | null;
  isBalanceVisible: boolean;
  onToggleBalance: () => void;
  onHelpPress?: () => void;
  onMenuPress?: () => void;
  onProfilePress?: () => void;
  scrollOffset?: SharedValue<number>;
}

export function NubankHeader({
  userName = 'Usuario',
  userPhoto,
  isBalanceVisible,
  onToggleBalance,
  onHelpPress,
  onMenuPress,
  onProfilePress,
  scrollOffset,
}: NubankHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleToggleBalance = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleBalance();
  };

  const handlePress = (callback?: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    callback?.();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = userName.split(' ')[0];

  // Animated styles for shrinking header effect
  const containerAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollOffset) return {};
    const paddingBottom = interpolate(
      scrollOffset.value,
      [0, SCROLL_THRESHOLD],
      [Spacing['2xl'], Spacing.sm],
      Extrapolation.CLAMP
    );
    return { paddingBottom };
  });

  const topRowAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollOffset) return {};
    const marginBottom = interpolate(
      scrollOffset.value,
      [0, SCROLL_THRESHOLD],
      [Spacing.lg, Spacing.sm],
      Extrapolation.CLAMP
    );
    return { marginBottom };
  });

  const profileAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollOffset) return {};
    const scale = interpolate(
      scrollOffset.value,
      [0, SCROLL_THRESHOLD],
      [1, 0.7],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }] };
  });

  const iconsAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollOffset) return {};
    const scale = interpolate(
      scrollOffset.value,
      [0, SCROLL_THRESHOLD],
      [1, 0.83],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }] };
  });

  const greetingAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollOffset) return {};
    const opacity = interpolate(
      scrollOffset.value,
      [0, 40],
      [1, 0],
      Extrapolation.CLAMP
    );
    const height = interpolate(
      scrollOffset.value,
      [0, 40],
      [28, 0],
      Extrapolation.CLAMP
    );
    const marginTop = interpolate(
      scrollOffset.value,
      [0, 40],
      [Spacing.sm, 0],
      Extrapolation.CLAMP
    );
    return { opacity, height, marginTop };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          paddingTop: insets.top + Spacing.md,
        },
        containerAnimatedStyle,
      ]}
    >
      {/* Top Row - Profile and Icons */}
      <Animated.View style={[styles.topRow, topRowAnimatedStyle]}>
        <Animated.View style={profileAnimatedStyle}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => handlePress(onProfilePress)}
            activeOpacity={0.7}
          >
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={styles.profileImage} />
            ) : (
              <Animated.View style={styles.profilePlaceholder}>
                <IconSymbol name="person.circle.fill" size={40} color="#FFFFFF" />
              </Animated.View>
            )}
            <Animated.View style={[styles.profileIndicator, { borderColor: colors.primary }]} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.iconsRow, iconsAnimatedStyle]}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleToggleBalance}
            activeOpacity={0.7}
          >
            <IconSymbol
              name={isBalanceVisible ? 'eye.fill' : 'eye.slash.fill'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handlePress(onHelpPress)}
            activeOpacity={0.7}
          >
            <IconSymbol name="questionmark.circle" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handlePress(onMenuPress)}
            activeOpacity={0.7}
          >
            <IconSymbol name="person.circle" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Greeting */}
      <Animated.View style={[styles.greetingContainer, greetingAnimatedStyle]}>
        <Text style={styles.greeting}>
          {getGreeting()}, {firstName}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  profileButton: {
    position: 'relative',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00A651',
    borderWidth: 2,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  greetingContainer: {
    marginTop: Spacing.sm,
  },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
