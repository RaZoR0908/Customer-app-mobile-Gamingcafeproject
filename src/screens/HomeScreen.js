import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import cafeService from '../services/cafeService';
import CafeCard from '../components/CafeCard';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
// 1. Import the hook to get the device's safe area dimensions
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

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
  const [refreshing, setRefreshing] = useState(false);
  
  // Store user location to avoid re-fetching on refresh
  const [userLocation, setUserLocation] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // 2. Get the safe area insets (padding) for the top and bottom of the screen
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('🔍 Starting to fetch cafes...');
        
        // 1. Fetch ALL cafes first and show them immediately
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
        
        // Show all cafes immediately for fast loading
        setAllCafes(allCafesResponse.data);
        setDisplayedCafes(allCafesResponse.data);
        setInitialList(allCafesResponse.data);
        setListTitle('All Cafes');
        setLoading(false); // Stop loading immediately after showing cafes
        
        // 2. Now try to get location in background and update to nearby cafes
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.log('📍 Location permission denied, keeping all cafes');
            setHasLocationPermission(false);
            setError('Permission to access location was denied. Showing all cafes.');
            return;
          }

          setHasLocationPermission(true);
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced, // Faster than high accuracy
            maximumAge: 300000, // Use cached location if less than 5 minutes old
            timeout: 5000 // Reduced to 5 second timeout for faster response
          });
          const { latitude, longitude } = location.coords;
          console.log('📍 User location:', { latitude, longitude });
          
          // Store location for future use
          setUserLocation({ latitude, longitude });

          // Filter to find nearby cafes
          const nearby = allCafesResponse.data.filter(cafe => {
            if (!cafe.location || !cafe.location.coordinates) {
              return false;
            }
            
            const distance = getDistance(
              latitude,
              longitude,
              cafe.location.coordinates[1],
              cafe.location.coordinates[0]
            );
            return distance < 10; // Cafes within 10km
          });

          console.log('🎯 Nearby cafes found:', nearby.length);
          
          if (nearby.length > 0) {
            // Update to show nearby cafes
            setDisplayedCafes(nearby);
            setInitialList(nearby);
            setListTitle('Cafes Near You');
            setError(''); // Clear any previous errors
          } else {
            setError('No cafes found within 10km. Showing all cafes.');
            setListTitle('All Cafes (No Nearby Cafes)');
          }
        } catch (locationError) {
          console.error('❌ Error getting location:', locationError);
          setHasLocationPermission(false);
          setError('Could not get your location. Showing all cafes.');
          setListTitle('All Cafes (Location Error)');
        }

      } catch (err) {
        console.error('❌ Error loading cafe data:', err);
        console.error('❌ Error details:', err.response?.data || err.message);
        setError(`Could not load cafe data: ${err.message}. Please check your internet connection and try again.`);
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Handle refresh by updating displayed cafes when allCafes changes
  useEffect(() => {
    if (allCafes.length > 0) {
      if (searchQuery) {
        // If searching, apply search filter
        const newData = allCafes.filter((item) => {
          const itemData = item.name ? item.name.toUpperCase() : ''.toUpperCase();
          const textData = searchQuery.toUpperCase();
          return itemData.indexOf(textData) > -1;
        });
        setDisplayedCafes(newData);
      } else {
        // If not searching, show initial list (nearby cafes)
        setDisplayedCafes(initialList);
      }
    }
  }, [allCafes, searchQuery, initialList]);

  // Disabled focus refresh to prevent continuous refreshing
  // Only manual pull-to-refresh works now

  // Function to refresh cafe data - OPTIMIZED for speed
  const handleRefresh = async () => {
    if (refreshing) {
      return; // Prevent multiple simultaneous refreshes
    }
    
    setRefreshing(true);
    try {
      console.log('🔄 Refreshing cafe data...');
      
      // Fetch fresh data
      const allCafesResponse = await cafeService.getAllCafes();
      console.log('🔄 Refreshed cafes:', allCafesResponse.data?.length || 0);
      
      if (allCafesResponse.data && allCafesResponse.data.length > 0) {
        setAllCafes(allCafesResponse.data);
        
        // Update displayed cafes based on current search state
        if (searchQuery) {
          // If searching, apply search filter to new data
          const newData = allCafesResponse.data.filter((item) => {
            const itemData = item.name ? item.name.toUpperCase() : ''.toUpperCase();
            const textData = searchQuery.toUpperCase();
            return itemData.indexOf(textData) > -1;
          });
          setDisplayedCafes(newData);
          console.log('🔄 Updated search results:', newData.length);
        } else {
          // If not searching, use stored location for faster filtering
          if (hasLocationPermission && userLocation) {
            // Use stored location - much faster!
            const { latitude, longitude } = userLocation;
            
            const nearby = allCafesResponse.data.filter(cafe => {
              if (!cafe.location || !cafe.location.coordinates) {
                return false;
              }
              
              const distance = getDistance(
                latitude,
                longitude,
                cafe.location.coordinates[1],
                cafe.location.coordinates[0]
              );
              return distance < 10; // Cafes within 10km
            });

            if (nearby.length > 0) {
              setDisplayedCafes(nearby);
              setInitialList(nearby);
              setListTitle('Cafes Near You');
              console.log('🔄 Updated nearby cafes (using stored location):', nearby.length);
            } else {
              setDisplayedCafes(allCafesResponse.data);
              setInitialList(allCafesResponse.data);
              setListTitle('All Cafes (No Nearby Cafes)');
              console.log('🔄 No nearby cafes, showing all:', allCafesResponse.data.length);
            }
          } else {
            // No stored location or permission, show all cafes
            setDisplayedCafes(allCafesResponse.data);
            setInitialList(allCafesResponse.data);
            setListTitle('All Cafes');
            console.log('🔄 No location data, showing all cafes:', allCafesResponse.data.length);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing cafes:', error);
      setError('Failed to refresh cafe data');
    } finally {
      setRefreshing(false);
    }
  };

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
        <View style={styles.headerIconsRight}>
          <TouchableOpacity style={styles.headerIconRight} onPress={() => navigation.navigate('Wallet')}>
            <Feather name="credit-card" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconRight} onPress={logout}>
            <Feather name="log-out" size={24} color="#333" />
          </TouchableOpacity>
        </View>
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
            onPress={() => {
              if (item.isOpen === false) {
                Alert.alert(
                  'Cafe Closed',
                  `${item.name} is temporarily closed and not accepting bookings at the moment. Please try again later.`,
                  [{ text: 'OK' }]
                );
                return;
              }
              navigation.navigate('CafeDetails', { 
                cafeId: item._id,
                cafeName: item.name 
              });
            }}
          />
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
            title={refreshing ? "Refreshing cafe status..." : "Pull to refresh cafe status..."}
            titleColor="#666"
            progressBackgroundColor="#ffffff"
          />
        }
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
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={styles.loadingText}>Finding cafes...</Text>
            </View>
          ) : (
            <Text style={styles.errorText}>No cafes found.</Text>
          )
        }
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
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
  headerIconsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconRight: {
    width: 40,
    alignItems: 'center',
    marginLeft: 8,
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
