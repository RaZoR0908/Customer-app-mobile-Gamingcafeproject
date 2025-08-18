import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Button, Alert, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Calendar } from 'react-native-calendars';
import bookingService from '../services/bookingService';
import { Feather } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';

const BookingScreen = ({ route, navigation }) => {
  const { cafe } = route.params;

  // State for each step of the booking process
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [duration, setDuration] = useState(1);
  const [numberOfSystems, setNumberOfSystems] = useState(1);

  // State for real-time availability
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Fetch Availability ---
  useEffect(() => {
    if (selectedDate) {
      const fetchAvailability = async () => {
        setAvailabilityLoading(true);
        try {
          const response = await bookingService.getSlotAvailability(cafe._id, selectedDate);
          setAvailability(response.data);
        } catch (error) {
          Alert.alert('Error', 'Could not fetch slot availability.');
        } finally {
          setAvailabilityLoading(false);
        }
      };
      fetchAvailability();
    }
  }, [selectedDate, cafe._id]);

  // --- Derived State ---
  const roomOptions = useMemo(() => cafe.rooms.map(room => ({ label: room.roomType, value: room.roomType })), [cafe.rooms]);
  const systemOptions = useMemo(() => {
    if (!selectedRoom) return [];
    const room = cafe.rooms.find(r => r.roomType === selectedRoom);
    return room ? room.systems.map(sys => ({ label: `${sys.systemType} - ₹${sys.pricePerHour}/hr`, value: sys.systemType })) : [];
  }, [selectedRoom, cafe.rooms]);
  const pricePerHour = useMemo(() => {
    if (!selectedRoom || !selectedSystem) return 0;
    const room = cafe.rooms.find(r => r.roomType === selectedRoom);
    const system = room?.systems.find(s => s.systemType === selectedSystem);
    return system ? system.pricePerHour : 0;
  }, [selectedRoom, selectedSystem, cafe.rooms]);
  
  const timeSlots = useMemo(() => {
    if (!availability || !selectedRoom || !selectedSystem) return [];
    const slots = availability[selectedRoom]?.[selectedSystem] || {};
    const today = new Date();
    const currentHour = today.getHours();
    const isToday = selectedDate === today.toISOString().split('T')[0];
    return Object.entries(slots).filter(([time, count]) => {
      if (!isToday) return true;
      const hourPart = parseInt(time.split(':')[0]);
      const isPM = time.includes('PM');
      let hour24 = hourPart;
      if (isPM && hourPart !== 12) hour24 += 12;
      if (!isPM && hourPart === 12) hour24 = 0;
      return hour24 >= currentHour;
    });
  }, [availability, selectedRoom, selectedSystem, selectedDate]);

  const maxSystemsForSlot = selectedTime ? (availability[selectedRoom]?.[selectedSystem]?.[selectedTime] || 0) : 0;

  // --- Handlers ---
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setSelectedTime('');
    setSelectedRoom(null);
    setSelectedSystem(null);
  };

  const handleBookPress = () => {
    if (!selectedDate || !selectedTime || !selectedRoom || !selectedSystem) {
      Alert.alert('Incomplete Selection', 'Please complete all steps to book a slot.');
      return;
    }
    setModalVisible(true);
  };

  const handleFinalBooking = async () => {
    setLoading(true);
    try {
      const bookingData = {
        cafeId: cafe._id,
        roomType: selectedRoom,
        systemType: selectedSystem,
        bookingDate: selectedDate,
        startTime: selectedTime,
        duration: duration,
        numberOfSystems: numberOfSystems,
      };
      await bookingService.createBooking(bookingData);
      setModalVisible(false);
      Alert.alert('Booking Confirmed!', 'Your slot has been booked successfully.', [{ text: 'OK', onPress: () => navigation.navigate('Home') }]);
    } catch (error) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={styles.title}>Book a Slot at {cafe.name}</Text>

        {/* Step 1: Date Selection */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <Feather name="calendar" size={24} color="#007bff" />
            <Text style={styles.stepTitle}>1. Select a Date</Text>
          </View>
          <Calendar onDayPress={handleDayPress} markedDates={{ [selectedDate]: { selected: true, selectedColor: '#007bff', dotColor: 'white' } }} minDate={new Date().toISOString().split('T')[0]} theme={{ todayTextColor: '#007bff', arrowColor: '#007bff' }} />
        </View>
        
        {selectedDate && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Feather name="grid" size={24} color="#007bff" />
              <Text style={styles.stepTitle}>2. Select Room & System</Text>
            </View>
            <RNPickerSelect
              value={selectedRoom}
              onValueChange={(value) => { setSelectedRoom(value); setSelectedSystem(null); setSelectedTime(''); }}
              items={roomOptions}
              placeholder={{ label: "Select a room...", value: null }}
              style={pickerSelectStyles}
            />
            {selectedRoom && (
              <RNPickerSelect
                value={selectedSystem}
                onValueChange={(value) => { setSelectedSystem(value); setSelectedTime(''); }}
                items={systemOptions}
                placeholder={{ label: "Select a system...", value: null }}
                style={pickerSelectStyles}
              />
            )}
          </View>
        )}

        {selectedSystem && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Feather name="clock" size={24} color="#007bff" />
              <Text style={styles.stepTitle}>3. Select an Available Time</Text>
            </View>
            {availabilityLoading ? <ActivityIndicator size="large" color="#007bff" /> : (
              <View style={styles.timeSlotContainer}>
                {timeSlots.map(([time, count]) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeSlot, selectedTime === time && styles.timeSlotSelected, count === 0 && styles.timeSlotDisabled]}
                    onPress={() => count > 0 && setSelectedTime(time)}
                    disabled={count === 0}
                  >
                    <Text style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextSelected, count === 0 && styles.timeSlotTextDisabled]}>{time}</Text>
                    <Text style={[styles.availabilityText, selectedTime === time && styles.timeSlotTextSelected, count === 0 && styles.timeSlotTextDisabled]}>{count} left</Text>
                  </TouchableOpacity>
                ))}
                {timeSlots.length === 0 && <Text style={{textAlign: 'center', color: '#666'}}>No available slots for the rest of today.</Text>}
              </View>
            )}
          </View>
        )}

        {selectedTime && (
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Feather name="users" size={24} color="#007bff" />
              <Text style={styles.stepTitle}>4. Select Quantity & Duration</Text>
            </View>
            <View style={styles.counterContainer}>
              <Text style={styles.counterLabel}>Systems</Text>
              <View style={styles.durationContainer}>
                <TouchableOpacity onPress={() => setNumberOfSystems(n => Math.max(1, n - 1))} style={styles.durationButton}><Feather name="minus" size={24} color="#007bff" /></TouchableOpacity>
                <Text style={styles.durationText}>{numberOfSystems}</Text>
                <TouchableOpacity onPress={() => setNumberOfSystems(n => Math.min(maxSystemsForSlot, n + 1))} style={styles.durationButton}><Feather name="plus" size={24} color="#007bff" /></TouchableOpacity>
              </View>
            </View>
            <View style={styles.counterContainer}>
              <Text style={styles.counterLabel}>Duration</Text>
              <View style={styles.durationContainer}>
                <TouchableOpacity onPress={() => setDuration(d => Math.max(0.5, d - 0.5))} style={styles.durationButton}><Feather name="minus" size={24} color="#007bff" /></TouchableOpacity>
                <Text style={styles.durationText}>{formatDuration(duration)}</Text>
                <TouchableOpacity onPress={() => setDuration(d => d + 0.5)} style={styles.durationButton}><Feather name="plus" size={24} color="#007bff" /></TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerText}>Total Price</Text>
          <Text style={styles.footerPrice}>₹{pricePerHour * duration * numberOfSystems}</Text>
        </View>
        <TouchableOpacity style={[styles.bookButton, !selectedSystem && styles.bookButtonDisabled]} onPress={handleBookPress} disabled={!selectedSystem}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Your Booking</Text>
            <Text style={styles.modalText}>Cafe: {cafe.name}</Text>
            <Text style={styles.modalText}>Date: {new Date(selectedDate).toDateString()}</Text>
            <Text style={styles.modalText}>Time: {selectedTime}</Text>
            <Text style={styles.modalText}>Room: {selectedRoom}</Text>
            <Text style={styles.modalText}>System: {selectedSystem} (x{numberOfSystems})</Text>
            <Text style={styles.modalText}>Duration: {formatDuration(duration)}</Text>
            <Text style={styles.modalPrice}>Total Price: ₹{pricePerHour * duration * numberOfSystems}</Text>
            <View style={styles.modalButtonContainer}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} color="gray" />
              <Button title={loading ? "Booking..." : "Confirm & Book"} onPress={handleFinalBooking} disabled={loading} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, color: '#333' },
  stepCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginHorizontal: 15, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.05, shadowRadius: 3.84, elevation: 5, },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  stepTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginLeft: 10 },
  timeSlotContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  timeSlot: { paddingVertical: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 25, margin: 5, alignItems: 'center' },
  timeSlotSelected: { backgroundColor: '#007bff', borderColor: '#007bff' },
  timeSlotDisabled: { backgroundColor: '#e9ecef', borderColor: '#e9ecef' },
  timeSlotText: { color: '#333', fontWeight: '500' },
  timeSlotTextSelected: { color: '#fff', fontWeight: 'bold' },
  timeSlotTextDisabled: { color: '#adb5bd' },
  availabilityText: { fontSize: 10, color: '#6c757d', marginTop: 2 },
  counterContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  counterLabel: { fontSize: 16, color: '#333' },
  durationContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  durationButton: { padding: 10 },
  durationText: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, color: '#333' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 30, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', },
  footerText: { color: '#666', fontSize: 16 },
  footerPrice: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  bookButton: { backgroundColor: '#007bff', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12 },
  bookButtonDisabled: { backgroundColor: '#a0c3e6' },
  bookButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 10, padding: 25, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  modalText: { fontSize: 16, marginBottom: 8, color: '#333' },
  modalPrice: { fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 25, color: '#000' },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: { fontSize: 16, paddingVertical: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, color: 'black', marginBottom: 15, backgroundColor: '#fff' },
  inputAndroid: { fontSize: 16, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, color: 'black', marginBottom: 15, backgroundColor: '#fff' },
});

export default BookingScreen;
