import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, SafeAreaView, Alert, RefreshControl, ScrollView, Dimensions, Animated } from 'react-native';
import { useAuth } from '../context/AuthContext';
import cafeService from '../services/cafeService';
import CafeCard from '../components/CafeCard';
import * as Location from 'expo-location';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// 1. Import the hook to get the device's safe area dimensions
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

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
    <View style={styles.container}>
      {/* Beautiful Header with Gradient */}
      <LinearGradient
        colors={['#1e293b', '#0f172a']}
        style={[styles.header, { paddingTop: insets.top + 15 }]}
      >
        {/* Clean Header Content */}
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.navIcon} onPress={() => navigation.navigate('MyBookings')}>
            <Ionicons name="book-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.welcomeSection}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.greeting}>Ready to game? 🎮</Text>
          </View>
          
          <View style={styles.navIconsRight}>
            <TouchableOpacity style={styles.navIcon} onPress={() => navigation.navigate('Wallet')}>
              <Ionicons name="wallet-outline" size={22} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navIcon} onPress={logout}>
              <Ionicons name="log-out-outline" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

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
          <View style={styles.listHeaderContainer}>
            <View style={styles.titleContainer}>
              <Ionicons name="location-outline" size={24} color="#3b82f6" style={styles.titleIcon} />
              <Text style={styles.listTitle}>{listTitle}</Text>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#6b7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search Gaming Cafes..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={(text) => handleSearch(text)}
              />
            </View>
          </View>
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
    backgroundColor: '#f8fafc' 
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  header: { 
    paddingHorizontal: 20, 
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
  },
  navIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  navIconsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  welcomeSection: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#fbbf24',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  userName: { 
    fontSize: 22, 
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  listHeaderContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  titleIcon: {
    marginRight: 10,
  },
  listTitle: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#1e293b',
    flex: 1,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  errorText: { 
    textAlign: 'center', 
    marginTop: 10, 
    color: '#6b7280', 
    paddingHorizontal: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 15,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 15,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingHorizontal: 15,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
});

export default HomeScreen;
