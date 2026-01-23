import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter, Href } from 'expo-router';

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TabItem {
  name: string;
  icon: IconSymbolName;
  iconFocused: IconSymbolName;
  isModal?: boolean;
  modalRoute?: string;
}

const TABS: TabItem[] = [
  { name: 'index', icon: 'house.fill', iconFocused: 'house.fill' },
  { name: 'transactions', icon: 'arrow.up.arrow.down', iconFocused: 'arrow.up.arrow.down' },
  { name: 'add', icon: 'plus.circle', iconFocused: 'plus.circle.fill', isModal: true, modalRoute: '/new-transaction' },
  { name: 'more', icon: 'line.3.horizontal', iconFocused: 'line.3.horizontal' },
];

export function NubankTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handleTabPress = (tab: TabItem, index: number, isFocused: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (tab.isModal && tab.modalRoute) {
      router.push(tab.modalRoute as Href);
      return;
    }

    const route = state.routes[index];
    if (!route) return;

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  // Filter out routes that shouldn't show in tab bar
  const visibleTabs = TABS.filter(tab => {
    // Always show modal tabs
    if (tab.isModal) return true;
    // Only show tabs that exist in the state
    return state.routes.some(route => route.name === tab.name);
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md,
        },
      ]}
    >
      {visibleTabs.map((tab, index) => {
        // For modal tabs, they're never "focused" in the traditional sense
        const routeIndex = state.routes.findIndex(route => route.name === tab.name);
        const isFocused = !tab.isModal && state.index === routeIndex;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab, routeIndex >= 0 ? routeIndex : index, isFocused)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                isFocused && {
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              <IconSymbol
                name={isFocused ? tab.iconFocused : tab.icon}
                size={24}
                color={isFocused ? colors.primary : colors.icon}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
