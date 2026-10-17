import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { OfflineProvider } from './src/offline/OfflineContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OfflineProvider>
          <AppNavigator />
        </OfflineProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}