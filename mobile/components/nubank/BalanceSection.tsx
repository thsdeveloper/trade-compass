import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCurrency } from '@/types/finance';

interface BalanceSectionProps {
  title: string;
  balance: number;
  isVisible: boolean;
  onPress?: () => void;
  showChevron?: boolean;
}

export function BalanceSection({
  title,
  balance,
  isVisible,
  onPress,
  showChevron = true,
}: BalanceSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.background }]}
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {showChevron && (
          <IconSymbol name="chevron.right" size={20} color={colors.icon} />
        )}
      </View>

      <View style={styles.balanceContainer}>
        {isVisible ? (
          <Text style={[styles.balance, { color: colors.text }]}>
            {formatCurrency(balance)}
          </Text>
        ) : (
          <View style={styles.hiddenBalance}>
            <View style={[styles.hiddenBar, { backgroundColor: colors.border }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  balanceContainer: {
    marginTop: Spacing.sm,
  },
  balance: {
    fontSize: FontSize['3xl'],
    fontWeight: '700',
  },
  hiddenBalance: {
    height: 36,
    justifyContent: 'center',
  },
  hiddenBar: {
    height: 24,
    width: 160,
    borderRadius: BorderRadius.sm,
  },
});
