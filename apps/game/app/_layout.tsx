import { Stack } from 'expo-router';

/**
 * Root layout — all routes rendered inside the router stack.
 *
 * M4: added (lobby) route group for multiplayer mode.
 * Flow: (setup) for local AI table, (lobby) for multiplayer.
 */
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(setup)" />
      <Stack.Screen name="(lobby)" />
      <Stack.Screen name="(game)" />
    </Stack>
  );
}
