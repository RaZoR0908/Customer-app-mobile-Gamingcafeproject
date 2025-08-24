import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import cafeService from '../services/cafeService';
import CafeCard from '../components/CafeCard';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
// 1. Import the hook to get the device's safe area dimensions
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [initialList, setInitialList] = useState([]); // Remembers the initial list of nearby cafes
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listTitle, setListTitle] = useState('Cafes Near You');

  // 2. Get the safe area insets (padding) for the top and bottom of the screen
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('🔍 Starting to fetch cafes...');
        
        // 1. Fetch ALL cafes first and store them.
        const allCafesResponse = await cafeService.getAllCafes();
        console.log('📡 Cafes API response:', allCafesResponse);
        console.log('🏪 Number of cafes received:', allCafesResponse.data?.length || 0);
        
        if (!allCafesResponse.data || allCafesResponse.data.length === 0) {
          setError('No cafes found in the database. Please check if cafes have been created.');
          setDisplayedCafes([]);
          setInitialList([]);
          setListTitle('No Cafes Available');
          setLoading(false);
          return;
        }
        
        setAllCafes(allCafesResponse.data);

        // 2. Now, try to get the user's location.
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('📍 Location permission denied, showing all cafes');
          setError('Permission to access location was denied. Showing all cafes.');
          // If no permission, just show all cafes by default.
          setDisplayedCafes(allCafesResponse.data);
          setInitialList(allCafesResponse.data); // Set initial list to all cafes
          setListTitle('All Cafes');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        console.log('📍 User location:', { latitude, longitude });

        // 3. Filter the full list to find nearby cafes.
        const nearby = allCafesResponse.data.filter(cafe => {
          if (!cafe.location || !cafe.location.coordinates) {
            console.log('⚠️ Cafe missing location data:', cafe.name);
            return false;
          }
          
          const distance = getDistance(
            latitude,
            longitude,
            cafe.location.coordinates[1], // Note: latitude is the second element
            cafe.location.coordinates[0]  // Note: longitude is the first element
          );
          console.log(`📏 Distance to ${cafe.name}: ${distance.toFixed(2)}km`);
          return distance < 10; // Cafes within 10km
        });

        console.log('🎯 Nearby cafes found:', nearby.length);
        setDisplayedCafes(nearby);
        setInitialList(nearby); // Set initial list to nearby cafes

      } catch (err) {
        console.error('❌ Error loading cafe data:', err);
        console.error('❌ Error details:', err.response?.data || err.message);
        setError(`Could not load cafe data: ${err.message}. Please check your internet connection and try again.`);
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
      // If search is cleared, revert to the initial list (which is the nearby cafes)
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
    // 3. Use a regular View as the root, as we will apply padding manually
    <View style={styles.container}>
      {/* 4. Apply the top inset as padding to the header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerIconLeft} onPress={() => navigation.navigate('MyBookings')}>
          <Feather name="book-open" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userName}>{user?.name}!</Text>
        </View>
        <TouchableOpacity style={styles.headerIconRight} onPress={logout}>
          <Feather name="log-out" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {error && !searchQuery && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setLoading(true);
              setError('');
              // Reload the data
              const loadInitialData = async () => {
                try {
                  console.log('🔄 Retrying to fetch cafes...');
                  const allCafesResponse = await cafeService.getAllCafes();
                  if (allCafesResponse.data && allCafesResponse.data.length > 0) {
                    setAllCafes(allCafesResponse.data);
                    setDisplayedCafes(allCafesResponse.data);
                    setInitialList(allCafesResponse.data);
                    setListTitle('All Cafes');
                    setError('');
                  } else {
                    setError('Still no cafes found. Please check if cafes have been created.');
                  }
                } catch (err) {
                  setError(`Retry failed: ${err.message}`);
                } finally {
                  setLoading(false);
                }
              };
              loadInitialData();
            }}
          >
            <Text style={styles.retryButtonText}>🔄 Retry</Text>
          </TouchableOpacity>
        </View>
      )}

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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 20 }}
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
    paddingHorizontal: 20, 
    paddingBottom: 10, // Only bottom padding is fixed
    backgroundColor: '#fff', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerIconLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerIconRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
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
    marginTop: 10, 
    color: '#666', 
    paddingHorizontal: 20,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
