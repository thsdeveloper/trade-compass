import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { NubankTabBar } from '@/components/nubank';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      tabBar={(props) => <NubankTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transacoes',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mais',
        }}
      />
      {/* Hidden screens - not shown in tab bar */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="fab-placeholder"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
