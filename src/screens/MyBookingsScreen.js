import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import bookingService from '../services/bookingService';
import cafeService from '../services/cafeService';
import { useFocusEffect } from '@react-navigation/native';
import BookingCard from '../components/BookingCard';

const MyBookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]); // Store all bookings for filtering
  const [cafes, setCafes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Calendar filter states
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Today's date
  const [markedDates, setMarkedDates] = useState({});

  // Helper function to get date from booking
  const getBookingDate = (booking) => {
    if (booking.sessionStartTime) {
      return new Date(booking.sessionStartTime).toISOString().split('T')[0];
    }
    if (booking.date) {
      return new Date(booking.date).toISOString().split('T')[0];
    }
    return new Date(booking.createdAt).toISOString().split('T')[0];
  };

  // Filter bookings by selected date
  const filterBookingsByDate = (allBookings, targetDate) => {
    return allBookings.filter(booking => {
      const bookingDate = getBookingDate(booking);
      return bookingDate === targetDate;
    });
  };

  // Create marked dates for calendar
  const createMarkedDates = (bookings, selectedDate) => {
    const marked = {};
    
    // Mark dates that have bookings
    bookings.forEach(booking => {
      const bookingDate = getBookingDate(booking);
      if (!marked[bookingDate]) {
        marked[bookingDate] = { marked: true, dotColor: '#007AFF' };
      }
    });

    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#007AFF',
        selectedTextColor: 'white'
      };
    }

    return marked;
  };

  useFocusEffect(
    React.useCallback(() => {
      const fetchBookingsAndCafes = async () => {
        setLoading(true);
        try {
          const bookingsData = await bookingService.getMyBookings();

          // Ensure array and no invalid entries, include pending payment bookings
          const validBookings = Array.isArray(bookingsData)
            ? bookingsData.filter((b) => b && b._id)
            : [];

          // Backend returns data sorted by createdAt (latest first)
          const sortedBookings = validBookings;
          setAllBookings(sortedBookings);

          // Filter bookings for today by default
          const todaysBookings = filterBookingsByDate(sortedBookings, selectedDate);
          setBookings(todaysBookings);

          // Create marked dates for calendar
          const marked = createMarkedDates(sortedBookings, selectedDate);
          setMarkedDates(marked);

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
    }, [selectedDate])
  );

  const handlePayExtension = (booking) => {
    navigation.navigate('Payment', {
      bookingId: booking._id,
      amount: booking.extensionPaymentAmount,
      isExtension: true
    });
  };

  const handlePayPending = (booking) => {
    navigation.navigate('Payment', {
      bookingId: booking._id,
      amount: booking.totalPrice,
      isExtension: false
    });
  };

  const handleCancelBooking = async (booking) => {
    const cafeName = cafes[booking.cafe]?.name || 'Unknown Cafe';
    
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking at ${cafeName}?\n\nThis will process a refund if the booking was paid for. This action cannot be undone.`,
      [
        {
          text: 'Keep Booking',
          style: 'cancel',
        },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await bookingService.cancelBooking(booking._id);
              
              // Refresh the bookings list
              const bookingsData = await bookingService.getMyBookings();
              const validBookings = Array.isArray(bookingsData)
                ? bookingsData.filter((b) => b && b._id)
                : [];
              
              setAllBookings(validBookings);
              const todaysBookings = filterBookingsByDate(validBookings, selectedDate);
              setBookings(todaysBookings);
              
              // Update marked dates
              const marked = createMarkedDates(validBookings, selectedDate);
              setMarkedDates(marked);
              
              setError('');
              
              // Show success message with refund info
              let successMessage = `Booking cancelled successfully!`;
              if (response.refund) {
                const refund = response.refund;
                successMessage += `\n\nRefund Details:\n- Method: ${refund.method}\n- Amount: ₹${refund.amount}\n- Status: ${refund.status}`;
              }
              
              Alert.alert('Success', successMessage);
            } catch (err) {
              console.error('Failed to cancel booking:', err);
              setError('Failed to cancel booking. Please try again.');
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };


  // Handle date selection from calendar
  const handleDateSelect = (day) => {
    const newSelectedDate = day.dateString;
    setSelectedDate(newSelectedDate);
    
    // Filter bookings for the selected date
    const filteredBookings = filterBookingsByDate(allBookings, newSelectedDate);
    setBookings(filteredBookings);
    
    // Update marked dates
    const marked = createMarkedDates(allBookings, newSelectedDate);
    setMarkedDates(marked);
    
    setShowCalendar(false);
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else if (dateString === tomorrow.toISOString().split('T')[0]) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

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
        <>
          <FlatList
            data={bookings}
            renderItem={({ item }) => (
              <BookingCard 
                booking={item} 
                cafe={cafes[item.cafe]} 
                onPayExtension={handlePayExtension}
                onPayPending={handlePayPending}
                onCancel={handleCancelBooking}
              />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={
              <View>
                <Text style={styles.title}>My Bookings</Text>
                
                {/* Date Filter Header */}
                <TouchableOpacity 
                  style={styles.dateFilterContainer}
                  onPress={() => setShowCalendar(true)}
                >
                  <View style={styles.dateFilterContent}>
                    <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                    <Text style={styles.dateFilterText}>
                      {formatDisplayDate(selectedDate)}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#007AFF" />
                  </View>
                </TouchableOpacity>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>
                  No bookings found for {formatDisplayDate(selectedDate)}.
                </Text>
              </View>
            }
          />

          {/* Calendar Modal */}
          <Modal
            visible={showCalendar}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowCalendar(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>Select Date</Text>
                  <TouchableOpacity 
                    onPress={() => setShowCalendar(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <Calendar
                  onDayPress={handleDateSelect}
                  markedDates={markedDates}
                  theme={{
                    backgroundColor: '#ffffff',
                    calendarBackground: '#ffffff',
                    textSectionTitleColor: '#b6c1cd',
                    selectedDayBackgroundColor: '#007AFF',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#007AFF',
                    dayTextColor: '#2d4150',
                    textDisabledColor: '#d9e1e8',
                    dotColor: '#007AFF',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#007AFF',
                    disabledArrowColor: '#d9e1e8',
                    monthTextColor: '#2d4150',
                    indicatorColor: '#007AFF',
                    textDayFontWeight: '300',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '300',
                    textDayFontSize: 16,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 13
                  }}
                />
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  
  // Date Filter Styles
  dateFilterContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dateFilterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: 10,
  },
  
  // Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    maxWidth: 350,
    width: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
});

export default MyBookingsScreen;
