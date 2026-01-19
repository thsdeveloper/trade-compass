import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function FABButton() {
  const router = useRouter();
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        { backgroundColor: Colors[colorScheme ?? 'light'].tint },
      ]}
      onPress={() => router.push('/new-transaction')}
      activeOpacity={0.8}
    >
      <IconSymbol name="plus" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transacoes',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="list.bullet" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="fab-placeholder"
          options={{
            title: '',
            tabBarIcon: () => null,
            tabBarButton: () => <View style={styles.fabPlaceholder} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="paperplane.fill" color={color} />
            ),
          }}
        />
      </Tabs>
      <FABButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    height: 60,
    paddingBottom: 8,
  },
  fabPlaceholder: {
    width: 60,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
