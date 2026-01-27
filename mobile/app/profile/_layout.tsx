import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="edit"
        options={{
          title: 'Editar Perfil',
          headerBackTitle: 'Voltar',
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          title: 'Alterar Senha',
          headerBackTitle: 'Voltar',
        }}
      />
    </Stack>
  );
}
