import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import bookingService from '../services/bookingService';
import cafeService from '../services/cafeService';
import { useFocusEffect } from '@react-navigation/native';
import BookingCard from '../components/BookingCard';

const MyBookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [cafes, setCafes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      const fetchBookingsAndCafes = async () => {
        setLoading(true);
        try {
          const bookingsData = await bookingService.getMyBookings();

          // Ensure array and no invalid entries
          const validBookings = Array.isArray(bookingsData)
            ? bookingsData.filter((b) => b && b._id)
            : [];

          // Backend returns data sorted by createdAt (latest first)
          const sortedBookings = validBookings;
          setBookings(sortedBookings);

          // Fetch cafes
          const cafeIds = [
            ...new Set(
              sortedBookings
                .map((b) => b.cafe)
                .filter((id) => id && typeof id === 'string' && id.trim() !== '')
            ),
          ];

          if (cafeIds.length > 0) {
            const cafePromises = cafeIds.map((id) =>
              cafeService.getCafeById(id)
            );
            const cafeResults = await Promise.allSettled(cafePromises);

            const cafesMap = {};
            cafeResults.forEach((result) => {
              if (result.status === 'fulfilled' && result.value?.data) {
                cafesMap[result.value.data._id] = result.value.data;
              }
            });

            setCafes(cafesMap);
          }
        } catch (err) {
          console.error('Failed to fetch bookings:', err);
          setError('Failed to load your bookings.');
        } finally {
          setLoading(false);
        }
      };
      fetchBookingsAndCafes();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={({ item }) => (
            <BookingCard booking={item} cafe={cafes[item.cafe]} />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={<Text style={styles.title}>My Bookings</Text>}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>You have no bookings yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default MyBookingsScreen;
