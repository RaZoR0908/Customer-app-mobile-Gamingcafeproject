import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import bookingService from '../services/bookingService';
import { useFocusEffect } from '@react-navigation/native';

// A reusable card component for displaying a single booking
const BookingCard = ({ booking }) => {
  // We need to fetch the cafe name, as it's not stored in the booking document
  // This is a placeholder for now. We can add a service to fetch cafe details later.
  const cafeName = "A Gaming Cafe"; 

  return (
    <View style={styles.card}>
      <Text style={styles.cardCafeName}>{cafeName}</Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date:</Text>
        <Text style={styles.detailValue}>{new Date(booking.bookingDate).toDateString()}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Time:</Text>
        <Text style={styles.detailValue}>{booking.startTime}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Duration:</Text>
        <Text style={styles.detailValue}>{booking.duration} hours</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Total Price:</Text>
        <Text style={styles.detailValue}>₹{booking.totalPrice}</Text>
      </View>
      <View style={styles.statusContainer}>
        <Text style={[styles.status, { color: booking.status === 'Confirmed' ? '#007bff' : '#6c757d' }]}>
          {booking.status}
        </Text>
      </View>
    </View>
  );
};

const MyBookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // useFocusEffect is a special hook that re-runs the fetch logic
  // every time the user navigates to this screen.
  useFocusEffect(
    React.useCallback(() => {
      const fetchBookings = async () => {
        try {
          const response = await bookingService.getMyBookings();
          // Sort bookings by date, most recent first
          const sortedBookings = response.data.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
          setBookings(sortedBookings);
        } catch (err) {
          setError('Failed to load your bookings.');
        } finally {
          setLoading(false);
        }
      };
      fetchBookings();
    }, [])
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={bookings}
        renderItem={({ item }) => <BookingCard booking={item} />}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={<Text style={styles.title}>My Bookings</Text>}
        ListEmptyComponent={<Text style={styles.emptyText}>You have no bookings yet.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  cardCafeName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusContainer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
});

export default MyBookingsScreen;
