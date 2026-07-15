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
  const isDark = colorScheme === 'dark';

  return (
    <GlassSurface
      variant="material"
      style={[
        styles.container,
        {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
        },
      ]}
    >
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
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  alertContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  alertText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: Spacing.lg,
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
