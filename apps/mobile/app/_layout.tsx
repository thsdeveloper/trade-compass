import { useEffect } from 'react';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FinanceProvider } from '@/contexts/FinanceContext';
import { AgentProvider } from '@/contexts/AgentContext';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
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
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen
          name="new-transaction"
          options={{
            presentation: 'transparentModal',
            title: 'Nova Transacao',
            headerShown: false,
          }}
        />
        <Stack.Screen name="contas" options={{ headerShown: false }} />
        <Stack.Screen name="cartoes" options={{ headerShown: false }} />
        {/* O grupo profile tem Stack próprio; sem isto o raiz põe header padrão */}
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        {/* O grupo settings também tem Stack próprio */}
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen
          name="nova-conta"
          options={{
            presentation: 'transparentModal',
            title: 'Nova conta',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="editar-conta"
          options={{
            presentation: 'transparentModal',
            title: 'Editar conta',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="novo-cartao"
          options={{
            presentation: 'transparentModal',
            title: 'Novo cartão',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="editar-cartao"
          options={{
            presentation: 'transparentModal',
            title: 'Editar cartão',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="conectar-banco"
          options={{
            presentation: 'modal',
            title: 'Conectar banco',
            headerShown: false,
          }}
        />
        <Stack.Screen name="bancos-conectados" options={{ headerShown: false }} />
        <Stack.Screen
          name="orcamento"
          options={{
            presentation: 'transparentModal',
            title: 'Orçamento',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="orcamento-categoria"
          options={{
            presentation: 'transparentModal',
            title: 'Categoria do orçamento',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="despesas-categoria"
          options={{
            presentation: 'transparentModal',
            title: 'Despesas por categoria',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="categoria-transacoes"
          options={{
            presentation: 'transparentModal',
            title: 'Transações da categoria',
            headerShown: false,
          }}
        />
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
      <StatusBar style="light" />
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
