import { Stack } from 'expo-router';
import { MarkersProvider } from '@/components/MarkersContext';

export default function RootLayout() {
  return (
    <MarkersProvider>
      <Stack>
        <Stack.Screen name="tabs" options={{ headerShown: false }} />
      </Stack>
    </MarkersProvider>
  );
}
