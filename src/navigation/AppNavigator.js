import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import CafeDetailScreen from '../screens/CafeDetailScreen';
import BookingScreen from '../screens/BookingScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen'; // 1. Import the new screen
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator 
    screenOptions={{
      headerStyle: { backgroundColor: '#333' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
    <Stack.Screen 
      name="CafeDetails" 
      component={CafeDetailScreen} 
      options={({ route }) => ({ title: route.params.cafeName })} 
    />
    <Stack.Screen 
      name="Booking" 
      component={BookingScreen} 
      options={{ title: 'Select Your Slot' }} 
    />
    {/* 2. Add the MyBookingsScreen to the stack */}
    <Stack.Screen 
      name="MyBookings" 
      component={MyBookingsScreen} 
      options={{ title: 'My Bookings' }} 
    />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
