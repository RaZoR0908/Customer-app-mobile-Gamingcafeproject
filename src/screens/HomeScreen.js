import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import cafeService from '../services/cafeService';
import CafeCard from '../components/CafeCard';
import * as Location from 'expo-location';

const HomeScreen = ({ navigation }) => {
  const { logout, user } = useAuth();
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const getCafesNearUser = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied. Showing all cafes instead.');
          const response = await cafeService.getAllCafes();
          setCafes(response.data);
          return;
        }

        // --- RESTORED ORIGINAL CODE ---
        // Get the user's real current coordinates from the device's GPS.
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        console.log(`--- USING REAL DEVICE LOCATION: Latitude = ${latitude}, Longitude = ${longitude} ---`);

        const response = await cafeService.findNearbyCafes(latitude, longitude);
        setCafes(response.data.data);

      } catch (err) {
        setError('Could not find cafes near you. Please try again.');
        console.error("Error in getCafesNearUser:", err);
      } finally {
        setLoading(false);
      }
    };

    getCafesNearUser();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Finding cafes near you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {user?.name}!</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={cafes}
          renderItem={({ item }) => (
            <CafeCard
              cafe={item}
              onPress={() => navigation.navigate('CafeDetails', { 
                cafeId: item._id,
                cafeName: item.name 
              })}
            />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 20 }}
          ListHeaderComponent={<Text style={styles.listTitle}>Cafes Near You</Text>}
          ListEmptyComponent={<Text style={styles.errorText}>No cafes found nearby.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  title: { fontSize: 22, fontWeight: 'bold' },
  logoutText: { fontSize: 16, color: '#007bff' },
  listTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  errorText: { textAlign: 'center', marginTop: 20, color: 'red', paddingHorizontal: 20 },
});

export default HomeScreen;
