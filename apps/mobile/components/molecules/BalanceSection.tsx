import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { Buttons, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { MoneyText } from '@/components/atoms/MoneyText';

interface BalanceSectionProps {
  title: string;
  balance: number;
  isVisible: boolean;
  onPress?: () => void;
  /** Rótulo do pill de ação abaixo do saldo */
  actionLabel?: string;
  /**
   * Progresso do colapso para o header (0 = herói pleno, 1 = recolhido).
   * O valor desvanece conforme desliza para baixo do header, enquanto a
   * cópia compacta surge lá — a transição "sobe para o header" da home.
   */
  collapseProgress?: SharedValue<number>;
  /** Reporta o y do valor dentro do herói (âncora do gatilho do colapso) */
  onBalanceLayout?: (y: number) => void;
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
  collapseProgress,
  onBalanceLayout,
}: BalanceSectionProps) {
  // Fallback estático para manter a ordem dos hooks quando não há colapso
  const idleProgress = useSharedValue(0);
  const progress = collapseProgress ?? idleProgress;

  const balanceStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <View style={styles.hero}>
      <Text style={styles.label}>{title}</Text>
      <Animated.View
        style={balanceStyle}
        onLayout={(event) => onBalanceLayout?.(event.nativeEvent.layout.y)}
      >
        <MoneyText value={balance} hidden={!isVisible} style={styles.balance} />
      </Animated.View>
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
