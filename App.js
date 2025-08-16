import React from 'react';
// 1. Import the AuthProvider we created
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    // 2. Wrap the entire AppNavigator inside the AuthProvider.
    // This makes the user's login state available to all screens.
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
