import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ContentSectionProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  children?: React.ReactNode;
  alertText?: string;
  alertVariant?: 'info' | 'warning' | 'danger' | 'success';
  actionButton?: {
    label: string;
    onPress: () => void;
  };
}

export function ContentSection({
  title,
  subtitle,
  onPress,
  showChevron = true,
  children,
  alertText,
  alertVariant = 'info',
  actionButton,
}: ContentSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const getAlertColors = () => {
    switch (alertVariant) {
      case 'warning':
        return { bg: colors.warningLight, text: colors.warning };
      case 'danger':
        return { bg: colors.dangerLight, text: colors.danger };
      case 'success':
        return { bg: colors.successLight, text: colors.success };
      default:
        return { bg: colors.infoLight, text: colors.info };
    }
  };

  const alertColors = getAlertColors();

  return (
    <View style={[styles.container, { borderTopColor: colors.border }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={handlePress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {showChevron && (
          <IconSymbol name="chevron.right" size={20} color={colors.icon} />
        )}
      </TouchableOpacity>

      {alertText && (
        <View
          style={[
            styles.alertContainer,
            { backgroundColor: alertColors.bg },
          ]}
        >
          <Text style={[styles.alertText, { color: alertColors.text }]}>
            {alertText}
          </Text>
        </View>
      )}

      {children && <View style={styles.content}>{children}</View>}

      {actionButton && (
        <TouchableOpacity
          style={[styles.actionButton, { borderTopColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            actionButton.onPress();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>
            {actionButton.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  alertContainer: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  alertText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  actionButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
