import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Alert, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import bookingService from '../services/bookingService';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';

const BookingScreen = ({ route, navigation }) => {
  const { cafe } = route.params;
  const scrollViewRef = useRef(null);

  // State for direct booking
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [duration, setDuration] = useState(1);
  const [numberOfSystems, setNumberOfSystems] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');

  // State for availability check
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [isSystemAvailable, setIsSystemAvailable] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Check System Availability ---
  useEffect(() => {
    if (selectedDate && selectedRoom && selectedSystem) {
      checkSystemAvailability();
    }
  }, [selectedDate, selectedRoom, selectedSystem, duration, numberOfSystems]);

  // --- Auto-scroll when new content appears ---
  useEffect(() => {
    if (selectedDate && scrollViewRef.current) {
      // Small delay to ensure the new content is rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 400, animated: true });
      }, 200);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedRoom && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 600, animated: true });
      }, 200);
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (selectedSystem && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 800, animated: true });
      }, 200);
    }
  }, [selectedSystem]);

  const checkSystemAvailability = async () => {
    setAvailabilityLoading(true);
    try {
      // Check if the system is available for the selected date
      // This would typically call your backend API
      if (bookingService && typeof bookingService.checkAvailability === 'function') {
        // Use roomId if _id is not available, or fallback to room name if neither exists
        const roomIdentifier = selectedRoom._id || selectedRoom.roomId || selectedRoom.name;
        
        const response = await bookingService.checkAvailability({
          cafeId: cafe._id,
          roomType: roomIdentifier, // Backend expects roomType, not roomId
          systemType: selectedSystem.type,
          date: selectedDate,
          duration: duration,
          numberOfSystems: numberOfSystems
        });
        
        setIsSystemAvailable(response.data.available);
      } else {
        console.log('⚠️ Availability check function not available, assuming system is available');
        setIsSystemAvailable(true);
      }
    } catch (error) {
      console.log('Availability check failed:', error);
      // For now, assume system is available
      setIsSystemAvailable(true);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // --- Derived State ---
  const availableRooms = useMemo(() => {
    return cafe.rooms || [];
  }, [cafe.rooms]);

  const availableSystems = useMemo(() => {
    if (!selectedRoom) return [];
    
    console.log('🔍 Room systems data:', selectedRoom.systems);
    
    // Get unique system types with their counts and prices
    const systemTypes = {};
    selectedRoom.systems?.forEach(system => {
      console.log('🎮 Processing system:', system);
      
      // Use systemId if _id is not available (backend sends systemId)
      const systemIdentifier = system._id || system.systemId;
      
      if (!systemIdentifier) {
        console.warn('⚠️ System missing both _id and systemId:', system);
        return; // Skip systems without any ID
      }
      
      // Skip systems that are not available (Active or Under Maintenance)
      if (system.status !== 'Available') {
        console.log(`⚠️ Skipping system ${system.systemId} - status: ${system.status}`);
        return;
      }
      
      if (!systemTypes[system.type]) {
        systemTypes[system.type] = {
          type: system.type,
          count: 1,
          pricePerHour: system.pricePerHour,
          systemIds: [systemIdentifier], // Store actual system IDs
          _id: systemIdentifier // Use the system identifier as reference
        };
      } else {
        systemTypes[system.type].count += 1;
        systemTypes[system.type].systemIds.push(systemIdentifier); // Add more system IDs
        // Use the minimum price if there are different prices
        if (system.pricePerHour < systemTypes[system.type].pricePerHour) {
          systemTypes[system.type].pricePerHour = system.pricePerHour;
        }
      }
    });
    
    const result = Object.values(systemTypes);
    console.log('📊 Available systems result:', result);
    return result;
  }, [selectedRoom]);

  const totalPrice = useMemo(() => {
    if (!selectedSystem) return 0;
    return selectedSystem.pricePerHour * duration * numberOfSystems;
  }, [selectedSystem, duration, numberOfSystems]);

  // --- Handlers ---
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setSelectedRoom(null);
    setSelectedSystem(null);
    setIsSystemAvailable(false);
  };

  const handleRoomSelect = (room) => {
    console.log('🎯 Room selected:', room.name);
    console.log('🔍 Full room object:', room);
    console.log('🔑 Room ID (_id):', room._id);
    console.log('🔑 Room ID (roomId):', room.roomId);
    
    // Use roomId if _id is not available, or fallback to room name if neither exists
    const roomIdentifier = room._id || room.roomId || room.name;
    console.log('🔑 Using room identifier:', roomIdentifier);
    
    setSelectedRoom(room);
    setSelectedSystem(null);
    setIsSystemAvailable(false);
    setNumberOfSystems(1); // Reset to 1 when changing rooms
  };

  const handleSystemSelect = (system) => {
    console.log('🎮 System selected:', system.type, 'Count:', system.count, 'System IDs:', system.systemIds);
    console.log('🔍 Full system object:', system);
    setSelectedSystem(system);
    setNumberOfSystems(1); // Reset to 1 when changing systems
  };

  const handleBookPress = () => {
    if (!selectedDate || !selectedRoom || !selectedSystem) {
      Alert.alert('Incomplete Selection', 'Please select a date, room, and system.');
      return;
    }
    
    if (!phoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your phone number.');
      return;
    }

    setModalVisible(true);
  };

  const handleFinalBooking = async () => {
    setLoading(true);
    try {
      // Comprehensive validation
      if (!cafe._id) {
        console.error('❌ Cafe ID missing');
        Alert.alert('Booking Error', 'Cafe information is incomplete.');
        return;
      }
      
      // Use roomId if _id is not available, or fallback to room name if neither exists
      const roomIdentifier = selectedRoom._id || selectedRoom.roomId || selectedRoom.name;
      if (!selectedRoom || !roomIdentifier) {
        console.error('❌ Room ID missing:', selectedRoom);
        Alert.alert('Booking Error', 'Room information is incomplete.');
        return;
      }
      
      if (!selectedSystem) {
        console.error('❌ System not selected');
        Alert.alert('Booking Error', 'Please select a system.');
        return;
      }
      
      const bookingData = {
        cafeId: cafe._id,
        roomType: roomIdentifier, // Backend expects roomType, not roomId
        systemType: selectedSystem.type, // Backend expects systemType, not systemId
        bookingDate: selectedDate,
        startTime: new Date().toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        }), // Use actual current time instead of hardcoded "12:00 PM"
        duration: duration,
        numberOfSystems: numberOfSystems,
        phoneNumber: phoneNumber.trim(),
        totalPrice: totalPrice
      };
      
      console.log('📋 Booking data being sent:', bookingData);
      console.log('🎮 Selected system:', selectedSystem);
      
      await bookingService.createBooking(bookingData);
      setModalVisible(false);
      Alert.alert(
        'Booking Confirmed! 🎮', 
        'Your gaming session has been booked successfully!', 
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      console.log('❌ Booking error:', error);
      const message = error.response?.data?.message || 'Booking failed. Please try again.';
      Alert.alert('Booking Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = (hours - h) * 60;
    let result = '';
    if (h > 0) result += `${h} hour${h > 1 ? 's' : ''}`;
    if (m > 0) result += `${h > 0 ? ' ' : ''}${m} mins`;
    return result || '0 hours';
  };

  const isFormComplete = selectedDate && selectedRoom && selectedSystem && phoneNumber.trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.container} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book Gaming Session</Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={styles.title}>Book at {cafe.name}</Text>

          {/* Step 1: Date Selection */}
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIcon}>
                <Ionicons name="calendar" size={20} color="#007AFF" />
              </View>
              <Text style={styles.stepTitle}>1. Select Date</Text>
            </View>
            <Calendar 
              onDayPress={handleDayPress} 
              markedDates={{ 
                [selectedDate]: { 
                  selected: true, 
                  selectedColor: '#007AFF', 
                  dotColor: 'white' 
                } 
              }} 
              minDate={new Date().toISOString().split('T')[0]} 
              theme={{ 
                todayTextColor: '#007AFF', 
                arrowColor: '#007AFF',
                selectedDayBackgroundColor: '#007AFF',
                selectedDayTextColor: '#ffffff'
              }} 
            />
          </View>
          
          {selectedDate && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIcon}>
                  <MaterialIcons name="meeting-room" size={20} color="#007AFF" />
                </View>
                <Text style={styles.stepTitle}>2. Select Room</Text>
              </View>
              <View style={styles.roomsContainer}>
                {availableRooms.map((room, index) => (
                  <TouchableOpacity
                    key={`${room.name}_${index}`}
                    style={[
                      styles.roomOption,
                      selectedRoom?.name === room.name && styles.roomOptionSelected
                    ]}
                    onPress={() => handleRoomSelect(room)}
                  >
                    <View style={styles.roomInfo}>
                      <Text style={[
                        styles.roomName,
                        selectedRoom?.name === room.name && styles.roomNameSelected
                      ]}>
                        {room.name}
                      </Text>
                      <Text style={styles.roomSystems}>
                        {room.systems?.length || 0} total systems
                      </Text>
                    </View>
                    {selectedRoom?.name === room.name && (
                      <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {selectedRoom && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIcon}>
                  <MaterialIcons name="games" size={20} color="#007AFF" />
                </View>
                <Text style={styles.stepTitle}>3. Select System Type</Text>
              </View>
              <View style={styles.systemsContainer}>
                {availableSystems.map((system, index) => (
                  <TouchableOpacity
                    key={`${system.type}_${index}`}
                    style={[
                      styles.systemOption,
                      selectedSystem?.type === system.type && styles.systemOptionSelected
                    ]}
                    onPress={() => handleSystemSelect(system)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.systemInfo}>
                      <Text style={[
                        styles.systemName,
                        selectedSystem?.type === system.type && styles.systemNameSelected
                      ]}>
                        {system.type} ({system.count} available)
                      </Text>
                      <Text style={styles.systemPrice}>
                        ₹{system.pricePerHour}/hour
                      </Text>
                    </View>
                    {selectedSystem?.type === system.type && (
                      <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
                {availableSystems.length === 0 && (
                  <Text style={styles.noSystemsText}>No systems available in this room</Text>
                )}
              </View>
              
              {/* System Availability Status - Now shown here */}
              {selectedSystem && (
                <View style={styles.availabilityContainer}>
                  {availabilityLoading ? (
                    <View style={styles.availabilityLoading}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={styles.availabilityText}>Checking availability...</Text>
                    </View>
                  ) : (
                    <View style={styles.availabilityStatus}>
                      <Ionicons 
                        name={isSystemAvailable ? "checkmark-circle" : "close-circle"} 
                        size={24} 
                        color={isSystemAvailable ? "#34C759" : "#FF3B30"} 
                      />
                      <Text style={[
                        styles.availabilityText,
                        { color: isSystemAvailable ? "#34C759" : "#FF3B30" }
                      ]}>
                        {isSystemAvailable ? "System Available!" : "System Unavailable"}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {selectedSystem && (
            <>
              {/* Step 4: Duration & Quantity */}
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="time" size={20} color="#007AFF" />
                  </View>
                  <Text style={styles.stepTitle}>4. Duration & Quantity</Text>
                </View>
                
                <View style={styles.counterContainer}>
                  <Text style={styles.counterLabel}>Number of Systems</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity 
                      onPress={() => setNumberOfSystems(n => Math.max(1, n - 1))} 
                      style={styles.counterButton}
                    >
                      <Ionicons name="remove" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{numberOfSystems}</Text>
                    <TouchableOpacity 
                      onPress={() => setNumberOfSystems(n => Math.min(selectedSystem?.count || 1, n + 1))} 
                      style={styles.counterButton}
                    >
                      <Ionicons name="add" size={20} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.counterHint}>
                  Max: {selectedSystem?.count || 1} systems
                </Text>

                <View style={styles.counterContainer}>
                  <Text style={styles.counterLabel}>Duration</Text>
                  <View style={styles.counterControls}>
                    <TouchableOpacity 
                      onPress={() => setDuration(d => Math.max(0.5, d - 0.5))} 
                      style={styles.counterButton}
                    >
                      <Ionicons name="remove" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{formatDuration(duration)}</Text>
                    <TouchableOpacity 
                      onPress={() => setDuration(d => d + 0.5)} 
                      style={styles.counterButton}
                    >
                      <Ionicons name="add" size={20} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Step 5: Customer Details */}
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="person" size={20} color="#007AFF" />
                  </View>
                  <Text style={styles.stepTitle}>5. Contact Information</Text>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer with Total Price and Book Button */}
      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Total Price</Text>
          <Text style={styles.priceAmount}>₹{totalPrice}</Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.bookButton, 
            (!isFormComplete || !isSystemAvailable) && styles.bookButtonDisabled
          ]} 
          onPress={handleBookPress} 
          disabled={!isFormComplete || !isSystemAvailable}
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal 
        animationType="slide" 
        transparent={true} 
        visible={isModalVisible} 
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#34C759" />
              <Text style={styles.modalTitle}>Confirm Your Booking</Text>
            </View>
            
            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cafe:</Text>
                <Text style={styles.detailValue}>{cafe.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{new Date(selectedDate).toDateString()}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Room:</Text>
                <Text style={styles.detailValue}>{selectedRoom?.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>System:</Text>
                <Text style={styles.detailValue}>{selectedSystem?.type} (x{numberOfSystems})</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration:</Text>
                <Text style={styles.detailValue}>{formatDuration(duration)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{phoneNumber}</Text>
              </View>
            </View>

            <View style={styles.totalPriceRow}>
              <Text style={styles.totalPriceLabel}>Total Price:</Text>
              <Text style={styles.totalPriceAmount}>₹{totalPrice}</Text>
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleFinalBooking}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm & Book</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: { 
    flex: 1 
  },
  scrollContent: {
    paddingBottom: 300, // Increased padding to prevent content from being hidden behind footer and keyboard
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  backButton: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  
  // Title
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginVertical: 20, 
    color: '#1a1a1a' 
  },
  
  // Step Cards
  stepCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginHorizontal: 20, 
    marginBottom: 20, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4
  },
  stepHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  stepTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#1a1a1a' 
  },

  // Rooms Selection
  roomsContainer: {
    gap: 12
  },
  roomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f8f9fa'
  },
  roomOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff'
  },
  roomInfo: {
    flex: 1
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4
  },
  roomNameSelected: {
    color: '#007AFF'
  },
  roomSystems: {
    fontSize: 14,
    color: '#666'
  },

  // Systems Selection
  systemsContainer: {
    gap: 12
  },
  systemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f8f9fa'
  },
  systemOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff'
  },
  systemInfo: {
    flex: 1
  },
  systemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4
  },
  systemNameSelected: {
    color: '#007AFF'
  },
  systemPrice: {
    fontSize: 14,
    color: '#666'
  },
  noSystemsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10
  },

  // Counters
  counterContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
    flexWrap: 'wrap'
  },
  counterLabel: { 
    fontSize: 16, 
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 1,
    marginRight: 16
  },
  counterControls: { 
    flexDirection: 'row', 
    alignItems: 'center',
    minWidth: 120,
    justifyContent: 'center'
  },
  counterButton: { 
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  counterValue: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginHorizontal: 16, 
    color: '#1a1a1a',
    minWidth: 60,
    textAlign: 'center'
  },
  counterHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    width: '100%'
  },

  // Input Fields
  inputContainer: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#1a1a1a'
  },

  // Availability
  availabilityContainer: {
    alignItems: 'center',
    padding: 20
  },
  availabilityLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  availabilityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  availabilityText: {
    fontSize: 16,
    fontWeight: '600'
  },

  // Footer
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    paddingBottom: 40, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8
  },
  priceContainer: {
    flex: 1
  },
  priceLabel: { 
    color: '#666', 
    fontSize: 14,
    marginBottom: 4
  },
  priceAmount: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1a1a1a' 
  },
  bookButton: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  bookButtonDisabled: { 
    backgroundColor: '#ccc',
    shadowOpacity: 0
  },
  bookButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },

  // Modal
  modalContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  modalContent: { 
    width: '90%', 
    backgroundColor: 'white', 
    borderRadius: 16, 
    padding: 24, 
    alignItems: 'center',
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 12, 
    elevation: 8
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 12,
    textAlign: 'center'
  },
  bookingDetails: {
    width: '100%',
    marginBottom: 20
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16
  },
  totalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
    width: '100%',
    marginBottom: 24
  },
  totalPriceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  totalPriceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  modalButtonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%',
    gap: 16
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default BookingScreen;
