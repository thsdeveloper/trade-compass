import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCurrency } from '@/types/finance';

interface BalanceSectionProps {
  title: string;
  balance: number;
  isVisible: boolean;
  onPress?: () => void;
  showChevron?: boolean;
}

/** Cartão-herói do saldo: superfície elevada que ancora o topo da home */
export function BalanceSection({
  title,
  balance,
  isVisible,
  onPress,
  showChevron = true,
}: BalanceSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      <GlassSurface
        variant="material"
        style={[
          styles.card,
          {
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.titleIcon, { backgroundColor: colors.primaryLight }]}>
              <IconSymbol name="wallet.pass.fill" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
          </View>
          {showChevron && (
            <IconSymbol name="chevron.right" size={18} color={colors.icon} />
          )}
        </View>

        {isVisible ? (
          <Text style={[styles.balance, { color: colors.text }]}>
            {formatCurrency(balance)}
          </Text>
        ) : (
          <Text style={[styles.hiddenBalance, { color: colors.textSecondary }]}>
            R$ ••••••
          </Text>
        )}
      </GlassSurface>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleIcon: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  balance: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  hiddenBalance: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
  },
});
