import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SettingsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Mesma cor do topo do gradiente ambiente (corpo só com o conteúdo).
  const headerColor = isDark ? '#1D4ED8' : '#0066FF';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: headerColor },
        headerTintColor: '#FFFFFF',
        headerShadowVisible: false,
      }}
    >
      {/* Ambas as telas usam ScreenHeader próprio (blur no scroll). */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
    </Stack>
  );
}
