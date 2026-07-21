import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // O header assume a cor do topo do gradiente ambiente das telas de perfil,
  // formando um corpo só com o conteúdo (sem emenda header × gradiente).
  const headerColor = isDark ? '#1D4ED8' : '#0066FF';

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: headerColor,
        },
        headerTintColor: '#FFFFFF',
        headerShadowVisible: false,
      }}
    >
      {/* Header próprio (ScreenHeader): integrado ao corpo, blur no scroll */}
      <Stack.Screen
        name="edit"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          title: 'Alterar senha',
          headerBackTitle: 'Voltar',
        }}
      />
    </Stack>
  );
}
