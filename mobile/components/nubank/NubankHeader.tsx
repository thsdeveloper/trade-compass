import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface NubankHeaderProps {
  userName?: string;
  userPhoto?: string | null;
  isBalanceVisible: boolean;
  onToggleBalance: () => void;
  onHelpPress?: () => void;
  onMenuPress?: () => void;
  onProfilePress?: () => void;
}

export function NubankHeader({
  userName = 'Usuario',
  userPhoto,
  isBalanceVisible,
  onToggleBalance,
  onHelpPress,
  onMenuPress,
  onProfilePress,
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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          paddingTop: insets.top + Spacing.md,
        },
      ]}
    >
      {/* Top Row - Profile and Icons */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => handlePress(onProfilePress)}
          activeOpacity={0.7}
        >
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <IconSymbol name="person.circle.fill" size={40} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.profileIndicator} />
        </TouchableOpacity>

        <View style={styles.iconsRow}>
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
        </View>
      </View>

      {/* Greeting */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>
          {getGreeting()}, {firstName}
        </Text>
      </View>
    </View>
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
    borderColor: '#8A05BE',
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
