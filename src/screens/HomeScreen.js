import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
// 1. Import the useAuth hook to get access to our context
import { useAuth } from '../context/AuthContext';

const HomeScreen = () => {
  // 2. Get the logout function and user data from the context
  const { logout, user } = useAuth();

  return (
    <View style={styles.container}>
      {/* Display the user's name if it exists */}
      <Text style={styles.title}>Welcome, {user?.name}!</Text>
      <Text>List of cafes will go here.</Text>
      {/* 3. The logout button now calls the real logout function */}
      <Button title="Log Out" onPress={logout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default HomeScreen;
