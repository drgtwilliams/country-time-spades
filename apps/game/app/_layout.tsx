import { Stack } from 'expo-router';

/**
 * Root layout — all routes rendered inside the router stack.
 */
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(setup)" />
      <Stack.Screen name="(game)" />
    </Stack>
  );
}
