import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FinanceProvider } from '@/contexts/FinanceContext';
import { AgentProvider } from '@/contexts/AgentContext';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen
          name="new-transaction"
          options={{
            presentation: 'modal',
            title: 'Nova Transacao',
            headerShown: false,
          }}
        />
        <Stack.Screen name="categorias" options={{ headerShown: false }} />
        <Stack.Screen
          name="agent-chat"
          options={{
            presentation: 'modal',
            title: 'Norte',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="nota-chat"
          options={{
            presentation: 'modal',
            title: 'Nota',
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <AgentProvider>
          <RootLayoutNav />
        </AgentProvider>
      </FinanceProvider>
    </AuthProvider>
  );
}
