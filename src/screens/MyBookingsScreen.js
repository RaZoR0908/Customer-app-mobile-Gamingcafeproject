import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import bookingService from '../services/bookingService';
import cafeService from '../services/cafeService'; // Import cafeService to get cafe names
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

// A reusable card component for displaying a single booking
const BookingCard = ({ booking, cafe }) => {
  // Check if the booking has been updated (e.g., extended) by the owner
  // We add a small buffer (e.g., 1 minute) to avoid showing it for initial creation
  const wasUpdated = (new Date(booking.updatedAt) - new Date(booking.createdAt)) > 60000;

  return (
    <View style={styles.card}>
      {/* Show the cafe's name if we have it, otherwise show a better message */}
      <Text style={styles.cardCafeName}>
        {cafe ? cafe.name : 'Cafe (No longer available)'}
      </Text>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date:</Text>
        <Text style={styles.detailValue}>{new Date(booking.bookingDate).toDateString()}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Time:</Text>
        <Text style={styles.detailValue}>{booking.startTime}</Text>
      </View>
       <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Room:</Text>
        <Text style={styles.detailValue}>{booking.roomType}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>System:</Text>
        <Text style={styles.detailValue}>{booking.systemType} (x{booking.numberOfSystems})</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Duration:</Text>
        <Text style={styles.detailValue}>{booking.duration} hours</Text>
      </View>
      
      {/* Display OTP for mobile bookings */}
      {booking.otp && (
        <View style={styles.otpContainer}>
          <Text style={styles.otpLabel}>Verification Code:</Text>
          <View style={styles.otpBox}>
            <Text style={styles.otpText}>{booking.otp}</Text>
          </View>
          <Text style={styles.otpNote}>Show this code to the cafe staff when you arrive</Text>
        </View>
      )}
            {wasUpdated && booking.status === 'Confirmed' && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Extended:</Text>
          <Text style={[styles.detailValue, { color: '#b81717ff', fontWeight: 'bold' }]}>Yes</Text>
        </View>
      )}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Total Price:</Text>
        <Text style={styles.detailValue}>₹{booking.totalPrice}</Text>
      </View>
      <View style={styles.statusContainer}>
        {/* Show an "Updated" tag if the booking was modified */}
        {wasUpdated && booking.status === 'Confirmed' && (
          <View style={styles.extendedTag}>
            <Feather name="clock" size={12} color="#fff" />
            <Text style={styles.extendedTagText}>Updated</Text>
          </View>
        )}
        <Text style={[styles.status, { color: booking.status === 'Confirmed' ? '#007bff' : (booking.status === 'Completed' ? '#28a745' : '#6c757d') }]}>
          {booking.status}
        </Text>
      </View>
    </View>
  );
};

const MyBookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [cafes, setCafes] = useState({}); // Use an object to store cafe details by ID
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // useFocusEffect is a special hook that re-runs the fetch logic
  // every time the user navigates TO this screen.
  useFocusEffect(
    React.useCallback(() => {
      const fetchBookingsAndCafes = async () => {
        setLoading(true);
        try {
          // First get bookings - this works in your first version
          const bookingsData = await bookingService.getMyBookings();
          const sortedBookings = bookingsData.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
          setBookings(sortedBookings);

          // Now try to get cafe details, but don't break if it fails
          try {
            // Filter out any null/undefined cafe IDs
            const cafeIds = [...new Set(sortedBookings.map(b => b.cafe).filter(id => id && id.trim() !== ''))];
            
            if (cafeIds.length > 0) {
              // Use Promise.allSettled instead of Promise.all to handle individual failures
              const cafePromises = cafeIds.map(id => cafeService.getCafeById(id));
              const cafeResults = await Promise.allSettled(cafePromises);
              
              const cafesMap = {};
              cafeResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value?.data) {
                  const cafeData = result.value.data;
                  cafesMap[cafeData._id] = cafeData;
                } else {
                  // Silently skip cafes that don't exist
                }
              });
              
              setCafes(cafesMap);
            }
          } catch (cafeError) {
            console.warn('Cafe fetching failed, but bookings loaded:', cafeError);
            // Don't throw error - just continue without cafe names
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
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {error ? (
        <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={({ item }) => <BookingCard booking={item} cafe={cafes[item.cafe]} />}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={<Text style={styles.title}>My Bookings</Text>}
          ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>You have no bookings yet.</Text></View>}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  extendedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17a2b8', // Teal color
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  extendedTagText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  otpContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007bff',
    borderStyle: 'dashed',
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  otpBox: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  otpText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 4,
  },
  otpNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  }
});

export default MyBookingsScreen;