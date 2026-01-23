import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface QuickAction {
  id: string;
  label: string;
  icon: IconSymbolName;
  route?: string;
  onPress?: () => void;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'new-transaction',
    label: 'Nova\nTransacao',
    icon: 'plus.circle',
    route: '/new-transaction',
  },
  {
    id: 'accounts',
    label: 'Contas',
    icon: 'wallet.pass',
    route: '/contas',
  },
  {
    id: 'categories',
    label: 'Categorias',
    icon: 'tag',
    route: '/categorias',
  },
  {
    id: 'reports',
    label: 'Relatorios',
    icon: 'chart.bar',
    route: '/relatorios',
  },
];

interface QuickActionsProps {
  actions?: QuickAction[];
}

export function QuickActions({ actions = DEFAULT_ACTIONS }: QuickActionsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handlePress = (action: QuickAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (action.onPress) {
      action.onPress();
    } else if (action.route) {
      router.push(action.route as Href);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionButton}
            onPress={() => handlePress(action)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <IconSymbol
                name={action.icon}
                size={24}
                color={colors.text}
              />
            </View>
            <Text
              style={[styles.label, { color: colors.text }]}
              numberOfLines={2}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    width: 72,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
});
