import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'name',
};

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="name" />
      <Stack.Screen name="password" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="salary" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="done" />
    </Stack>
  );
}
