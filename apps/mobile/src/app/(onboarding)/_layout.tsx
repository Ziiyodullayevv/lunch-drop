import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="set-name" />
      <Stack.Screen name="name" />
      <Stack.Screen name="companies" />
      <Stack.Screen name="branches" />
    </Stack>
  );
}
