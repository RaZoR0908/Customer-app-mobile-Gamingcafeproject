import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BookingCard = ({ booking, cafe, onPayExtension, onPayPending, onCancel, index = 0, isLast = false }) => {
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
      // Don't add extendedTime to duration since duration already includes extensions
      const totalHours = duration;
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

  // Check if booking can be cancelled
  const canCancelBooking = () => {
    if (booking.status !== 'Booked') {
      return false;
    }

    const today = new Date();
    const bookingDate = new Date(booking.bookingDate);
    const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // If booking is for today, check if within 15 minutes of booking time
    if (bookingDateOnly.getTime() === todayOnly.getTime()) {
      const bookingTime = new Date(booking.bookingDate);
      const [timeStr, period] = booking.startTime.split(' ');
      const [hours, minutes] = timeStr.split(':').map(Number);
      let bookingHour = hours;
      if (period === 'PM' && hours !== 12) {
        bookingHour += 12;
      } else if (period === 'AM' && hours === 12) {
        bookingHour = 0;
      }
      
      bookingTime.setHours(bookingHour, minutes || 0, 0, 0);
      const timeDiff = today.getTime() - bookingTime.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      return minutesDiff <= 15;
    }

    // If booking is for future dates, allow cancellation until that day starts
    return bookingDateOnly.getTime() > todayOnly.getTime();
  };

  return (
    <View>
      <View style={styles.card}>
        {/* Card Number at Top */}
        <View style={styles.cardNumberContainer}>
          <Text style={styles.cardNumber}>#{index + 1}</Text>
        </View>
        
        {/* Simple Header with Gradient */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.cardHeader}
        >
          <Text style={styles.cardCafeName}>
            {cafe?.name?.toUpperCase() || 'CAFE (NO LONGER AVAILABLE)'}
          </Text>
        </LinearGradient>

      {/* Card Content */}
      <View style={styles.cardContent}>
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

      {/* Pending Payment Section */}
      {booking.status === 'Pending Payment' && (
        <View style={styles.pendingPaymentContainer}>
          <View style={styles.pendingPaymentInfo}>
            <Feather name="alert-circle" size={16} color="#ff6b35" />
            <View style={styles.pendingPaymentDetails}>
              <Text style={styles.pendingPaymentTitle}>Payment Pending</Text>
              <Text style={styles.pendingPaymentAmount}>₹{booking.totalPrice}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.payPendingButton}
            onPress={() => onPayPending && onPayPending(booking)}
          >
            <Text style={styles.payPendingButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OTP section - only show for confirmed bookings */}
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
                  : booking.status === 'Pending Payment'
                  ? '#ff6b35'
                  : '#6c757d',
            },
          ]}
        >
          {booking.status || 'Unknown'}
        </Text>
      </View>


      {/* Extension Payment Section */}
      {booking.extensionPaymentStatus === 'pending' && booking.extensionPaymentAmount > 0 && (
        <View style={styles.extensionPaymentContainer}>
          <View style={styles.extensionPaymentHeader}>
            <Feather name="clock" size={18} color="#ff6b35" />
            <Text style={styles.extensionPaymentTitle}>Extension Payment Required</Text>
          </View>
          <View style={styles.extensionPaymentDetails}>
            <Text style={styles.extensionPaymentDescription}>
              Your session has been extended by the cafe owner. Please pay the additional amount to continue.
            </Text>
            <View style={styles.extensionPaymentAmountContainer}>
              <Text style={styles.extensionPaymentAmountLabel}>Additional Amount:</Text>
              <Text style={styles.extensionPaymentAmount}>₹{booking.extensionPaymentAmount}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.payExtensionButton}
            onPress={() => onPayExtension && onPayExtension(booking)}
          >
            <Feather name="credit-card" size={16} color="#fff" />
            <Text style={styles.payExtensionButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cancel Button Section */}
      {canCancelBooking() && (
        <View style={styles.cancelContainer}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => onCancel && onCancel(booking)}
          >
            <Feather name="x-circle" size={16} color="#fff" />
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
          <Text style={styles.cancelPolicyText}>
            {(() => {
              const today = new Date();
              const bookingDate = new Date(booking.bookingDate);
              const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
              const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              
              if (bookingDateOnly.getTime() === todayOnly.getTime()) {
                return "Cancel within 15 mins of booking time";
              } else {
                return "Cancel until booking day arrives";
              }
            })()}
          </Text>
        </View>
      )}
      </View>
      </View>
      
      {/* Separator Line - Only show if not the last card */}
      {!isLast && <View style={styles.separator} />}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 9,
    padding: 0,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  cardNumberContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  cardNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  cardHeader: {
    padding: 9,
    paddingBottom: 7,
  },
  cardCafeName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#374151',
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
  cardContent: {
    padding: 9,
    paddingTop: 7,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  detailLabel: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    letterSpacing: 0.1,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  statusContainer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 5,
    marginHorizontal: -1,
  },
  status: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    textAlign: 'center',
    minWidth: 90,
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
    marginTop: 8,
    padding: 8,
    backgroundColor: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 5,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  otpBox: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1,
    elevation: 1,
  },
  otpText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
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
    padding: 5,
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  groupBookingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#007AFF',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
  groupSystemCard: {
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 4,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 1,
    elevation: 1,
  },
  extensionPaymentContainer: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  extensionPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  extensionPaymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginLeft: 8,
  },
  extensionPaymentDetails: {
    marginBottom: 15,
  },
  extensionPaymentDescription: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 12,
  },
  extensionPaymentAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  extensionPaymentAmountLabel: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  extensionPaymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  payExtensionButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  payExtensionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pendingPaymentContainer: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingPaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingPaymentDetails: {
    marginLeft: 10,
    flex: 1,
  },
  pendingPaymentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 2,
  },
  pendingPaymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
  payPendingButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  payPendingButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cancelContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  cancelPolicyText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default BookingCard;
