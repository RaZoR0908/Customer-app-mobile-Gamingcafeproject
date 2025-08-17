import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import cafeService from '../services/cafeService';
import CafeCard from '../components/CafeCard';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';

// Helper function to calculate distance (we'll use this to find nearby cafes)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const HomeScreen = ({ navigation }) => {
  const { logout, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allCafes, setAllCafes] = useState([]); // Holds all cafes from DB
  const [displayedCafes, setDisplayedCafes] = useState([]); // Cafes currently shown on screen
  // 1. Add new state to remember the initial list of cafes (either nearby or all)
  const [initialList, setInitialList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listTitle, setListTitle] = useState('Cafes Near You');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const allCafesResponse = await cafeService.getAllCafes();
        setAllCafes(allCafesResponse.data);

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied.');
          setDisplayedCafes(allCafesResponse.data);
          setInitialList(allCafesResponse.data); // Set initial list to all cafes
          setListTitle('All Cafes');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        const nearby = allCafesResponse.data.filter(cafe => {
          const distance = getDistance(
            latitude,
            longitude,
            cafe.location.coordinates[1],
            cafe.location.coordinates[0]
          );
          return distance < 10; // Cafes within 10km
        });

        setDisplayedCafes(nearby);
        setInitialList(nearby); // Set initial list to nearby cafes

      } catch (err) {
        setError('Could not load cafe data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query) {
      const newData = allCafes.filter((item) => {
        const itemData = item.name ? item.name.toUpperCase() : ''.toUpperCase();
        const textData = query.toUpperCase();
        return itemData.indexOf(textData) > -1;
      });
      setDisplayedCafes(newData);
      setListTitle(`Search Results for "${query}"`);
    } else {
      // 2. If search is cleared, revert to the initial list
      setDisplayedCafes(initialList);
      // Determine the correct title based on whether the initial list was nearby or all
      setListTitle(error ? 'All Cafes' : 'Cafes Near You');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Finding cafes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userName}>{user?.name}!</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Feather name="log-out" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {error && !searchQuery && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={displayedCafes}
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10 }}
        ListHeaderComponent={
          <>
            <Text style={styles.listTitle}>{listTitle}</Text>
            <View style={styles.searchContainer}>
              <Feather name="search" size={20} color="#888" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search all cafes..."
                value={searchQuery}
                onChangeText={(text) => handleSearch(text)}
              />
            </View>
          </>
        }
        ListEmptyComponent={<Text style={styles.errorText}>No cafes found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f5f5f5' 
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  header: { 
    paddingTop: 50, 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    backgroundColor: '#fff', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#333',
  },
  listTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: { 
    textAlign: 'center', 
    marginTop: 50, 
    color: '#666', 
    paddingHorizontal: 20,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 15,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
});

export default HomeScreen;
