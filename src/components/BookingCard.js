import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

const BookingCard = ({ booking, cafe }) => {
  if (!booking) {
    return (
      <View style={styles.card}>
        <Text style={{ color: 'red' }}>Invalid booking data</Text>
      </View>
    );
  }

  // Handle both single and group bookings
  const getBookingDetails = () => {
    // Check if this is a group booking (has systemsBooked array)
    if (booking.systemsBooked && booking.systemsBooked.length > 0) {
      // Group booking - show all systems
      return booking.systemsBooked.map((system, index) => ({
        roomType: system.roomType || 'Not set',
        systemType: system.systemType || 'Not set',
        numberOfSystems: system.numberOfSystems || 0,
        pricePerHour: system.pricePerHour || 0,
        isGroup: true,
        index: index + 1
      }));
    } else if (booking.roomType || booking.systemType) {
      // Single booking - use legacy fields
      return [{
        roomType: booking.roomType || 'Not set',
        systemType: booking.systemType || 'Not set',
        numberOfSystems: booking.numberOfSystems || 0,
        pricePerHour: booking.pricePerHour || 0,
        isGroup: false
      }];
    } else {
      // Fallback - no booking details available
      return [{
        roomType: 'Not set',
        systemType: 'Not set',
        numberOfSystems: 0,
        pricePerHour: 0,
        isGroup: false
      }];
    }
  };

  const bookingDetails = getBookingDetails();


  // Check if the booking has been updated (e.g., extended) by the owner
  const wasUpdated =
    booking.updatedAt && booking.createdAt
      ? new Date(booking.updatedAt) - new Date(booking.createdAt) > 60000
      : false;

  // Calculate session end time
  const calculateSessionEndTime = () => {
    if (!booking.sessionStartTime) return null;

    try {
      const startTime = new Date(booking.sessionStartTime);
      const duration = booking.duration || 0;
      const extendedTime = booking.extendedTime || 0;
      const totalHours = duration + extendedTime;
      const endTime = new Date(startTime.getTime() + totalHours * 60 * 60 * 1000);

      return endTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return null;
    }
  };

  // Format time display
  const formatTime = (timeString) => {
    if (!timeString) return 'Not set';
    try {
      const date = new Date(timeString);
      return isNaN(date.getTime())
        ? 'Not set'
        : date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
    } catch {
      return 'Not set';
    }
  };

  return (
    <View style={styles.card}>
      {/* Cafe name */}
      <Text style={styles.cardCafeName}>
        {cafe?.name || 'Cafe (No longer available)'}
      </Text>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date:</Text>
        <Text style={styles.detailValue}>
          {booking.bookingDate
            ? new Date(booking.bookingDate).toDateString()
            : 'Not set'}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Booking Time:</Text>
        <Text style={styles.detailValue}>
          {booking.startTime || 'Not set'}
        </Text>
      </View>

        {/* Group booking indicator */}
        {bookingDetails.length > 1 && (
          <View style={styles.groupBookingIndicator}>
            <Feather name="users" size={16} color="#007bff" />
            <Text style={styles.groupBookingText}>Group Booking ({bookingDetails.length} systems)</Text>
          </View>
        )}

        {/* Display room and system details */}
        {bookingDetails.map((detail, index) => (
          <View key={index} style={bookingDetails.length > 1 ? styles.groupSystemCard : null}>
            {bookingDetails.length > 1 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>System {detail.index}:</Text>
                <Text style={styles.detailValue}></Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {bookingDetails.length > 1 ? '  Room:' : 'Room:'}
              </Text>
              <Text style={styles.detailValue}>{detail.roomType}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {bookingDetails.length > 1 ? '  System:' : 'System:'}
              </Text>
              <Text style={styles.detailValue}>
                {detail.systemType} (x{detail.numberOfSystems})
              </Text>
            </View>
          </View>
        ))}

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Duration:</Text>
        <Text style={styles.detailValue}>
          {booking.duration || 0} hours
        </Text>
      </View>

      {/* OTP section */}
      {booking.otp && booking.status === 'Booked' && (
        <View style={styles.otpContainer}>
          <Text style={styles.otpLabel}>Verification Code:</Text>
          <View style={styles.otpBox}>
            <Text style={styles.otpText}>{booking.otp}</Text>
          </View>
          <Text style={styles.otpNote}>
            Show this code to the cafe staff when you arrive
          </Text>
        </View>
      )}

      {/* Session timing */}
      {booking.sessionStartTime &&
        (booking.status === 'Active' || booking.status === 'Completed') && (
          <View style={styles.sessionSection}>
            <Text style={styles.sessionSectionTitle}>Session Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start Time:</Text>
              <Text style={styles.detailValue}>
                {formatTime(booking.sessionStartTime)}
              </Text>
            </View>

            {booking.extendedTime > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Extended Time:</Text>
                <Text style={styles.detailValue}>
                  {booking.extendedTime} hours
                </Text>
              </View>
            )}

            {calculateSessionEndTime() && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>End Time:</Text>
                <Text style={styles.detailValue}>
                  {calculateSessionEndTime()}
                </Text>
              </View>
            )}
          </View>
        )}

      {/* Extended indicator */}
      {wasUpdated &&
        booking.extendedTime > 0 &&
        (booking.status === 'Active' || booking.status === 'Completed') && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Extended:</Text>
            <Text
              style={[
                styles.detailValue,
                { color: '#b81717ff', fontWeight: 'bold' },
              ]}
            >
              Yes
            </Text>
          </View>
        )}

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Total Price:</Text>
        <Text style={styles.detailValue}>
          ₹{booking.totalPrice || 0}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        {wasUpdated &&
          booking.extendedTime > 0 &&
          (booking.status === 'Active' || booking.status === 'Completed') && (
            <View style={styles.extendedTag}>
              <Feather name="clock" size={12} color="#fff" />
              <Text style={styles.extendedTagText}>Updated</Text>
            </View>
          )}
        <Text
          style={[
            styles.status,
            {
              color:
                booking.status === 'Active'
                  ? '#007bff'
                  : booking.status === 'Completed'
                  ? '#28a745'
                  : booking.status === 'Cancelled'
                  ? '#dc3545'
                  : '#6c757d',
            },
          ]}
        >
          {booking.status || 'Unknown'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: '#17a2b8',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  extendedTagText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
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
  },
  sessionSection: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sessionSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 10,
    textAlign: 'center',
  },
  groupBookingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  groupBookingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
    marginLeft: 8,
  },
  groupSystemCard: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
});

export default BookingCard;
