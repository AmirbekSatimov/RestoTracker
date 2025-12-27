import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/components/AuthContext';
import { MarkersProvider } from '@/components/MarkersContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <MarkersProvider>
        <Stack
          screenOptions={{
            headerShown: false, // <-- kills the grey header at the stack level
          }}
        />
      </MarkersProvider>
    </AuthProvider>
  );
}
