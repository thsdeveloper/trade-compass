import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { Buttons, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/types/finance';

interface BalanceSectionProps {
  title: string;
  balance: number;
  isVisible: boolean;
  onPress?: () => void;
  /** Rótulo do pill de ação abaixo do saldo */
  actionLabel?: string;
}

/**
 * Herói do saldo: valor gigante centralizado direto sobre o gradiente,
 * com um pill de ação logo abaixo — anatomia clássica de home de fintech.
 */
export function BalanceSection({
  title,
  balance,
  isVisible,
  onPress,
  actionLabel = 'Contas',
}: BalanceSectionProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <View style={styles.hero}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.balance}>
        {isVisible ? formatCurrency(balance) : 'R$ ••••••'}
      </Text>
      {onPress ? (
        <TouchableOpacity
          style={styles.pill}
          onPress={handlePress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.pillText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: 'rgba(255,255,255,0.75)',
  },
  balance: {
    fontSize: 44,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  pill: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    backgroundColor: Buttons.secondaryBackground,
  },
  pillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },
});
