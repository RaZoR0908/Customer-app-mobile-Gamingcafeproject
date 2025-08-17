import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Button, Alert, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { Calendar } from 'react-native-calendars';
import bookingService from '../services/bookingService';
import { Feather } from '@expo/vector-icons';

// --- NEW Custom Picker Component ---
const CustomPicker = ({ options, selectedValue, onValueChange, placeholder }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (value) => {
    onValueChange(value);
    setModalVisible(false);
  };

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder;

  return (
    <>
      <TouchableOpacity style={pickerSelectStyles.inputIOS} onPress={() => setModalVisible(true)}>
        <Text style={styles.pickerText}>{selectedLabel}</Text>
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.pickerModalContainer} onPress={() => setModalVisible(false)}>
          <View style={styles.pickerModalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerOption} onPress={() => handleSelect(item.value)}>
                  <Text style={styles.pickerOptionText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};


const BookingScreen = ({ route, navigation }) => {
  const { cafe } = route.params;

  // State for each step of the booking process
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  // 1. Duration now starts at 0.5 (30 minutes)
  const [duration, setDuration] = useState(0.5); 

  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Derived State (logic is the same) ---
  const roomOptions = useMemo(() => 
    cafe.rooms.map(room => ({ label: room.roomType, value: room.roomType })),
    [cafe.rooms]
  );

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

  // --- Handlers (logic is the same) ---
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setSelectedTime('');
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
      };
      await bookingService.createBooking(bookingData);
      setModalVisible(false);
      Alert.alert(
        'Booking Confirmed!',
        'Your slot has been booked successfully.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      const message = error.response?.data?.message || 'Booking failed. Please try again.';
      Alert.alert('Booking Failed', message);
    } finally {
      setLoading(false);
    }
  };
  
  // 2. Helper function to display the duration nicely
  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = (hours - h) * 60;
    let result = '';
    if (h > 0) {
      result += `${h} hour${h > 1 ? 's' : ''}`;
    }
    if (m > 0) {
      result += `${h > 0 ? ' ' : ''}${m} mins`;
    }
    return result || '0 hours';
  };

  const timeSlots = ['10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.title}>Book a Slot at {cafe.name}</Text>

        {/* Step 1: Date Selection */}
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>1. Select a Date</Text>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{ [selectedDate]: { selected: true, selectedColor: '#007bff' } }}
            minDate={new Date().toISOString().split('T')[0]}
            theme={{ todayTextColor: '#007bff', arrowColor: '#007bff' }}
          />
        </View>

        {/* Step 2: Time Slot Selection */}
        {selectedDate && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>2. Select a Time Slot</Text>
            <View style={styles.timeSlotContainer}>
              {timeSlots.map(time => (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeSlot, selectedTime === time && styles.timeSlotSelected]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextSelected]}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {/* Step 3: Room and System Selection */}
        {selectedTime && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>3. Select Room & System</Text>
            <CustomPicker
              selectedValue={selectedRoom}
              onValueChange={(value) => {
                setSelectedRoom(value);
                setSelectedSystem(null);
              }}
              options={roomOptions}
              placeholder="Select a room..."
            />
            {selectedRoom && (
              <CustomPicker
                selectedValue={selectedSystem}
                onValueChange={(value) => setSelectedSystem(value)}
                options={systemOptions}
                placeholder="Select a system..."
              />
            )}
          </View>
        )}

        {/* Step 4: Duration Selection */}
        {selectedSystem && (
          <View style={styles.stepCard}>
            <Text style={styles.stepTitle}>4. Select Duration</Text>
            <View style={styles.durationContainer}>
              {/* 3. Update buttons to increment/decrement by 0.5 */}
              <TouchableOpacity onPress={() => setDuration(d => Math.max(0.5, d - 0.5))} style={styles.durationButton}>
                <Feather name="minus" size={24} color="#007bff" />
              </TouchableOpacity>
              <Text style={styles.durationText}>{formatDuration(duration)}</Text>
              <TouchableOpacity onPress={() => setDuration(d => d + 0.5)} style={styles.durationButton}>
                <Feather name="plus" size={24} color="#007bff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerText}>Total Price</Text>
          <Text style={styles.footerPrice}>₹{pricePerHour * duration}</Text>
        </View>
        <TouchableOpacity style={styles.bookButton} onPress={handleBookPress} disabled={!selectedSystem}>
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
            <Text style={styles.modalTitle}>Confirm Your Booking</Text>
            <Text style={styles.modalText}>Cafe: {cafe.name}</Text>
            <Text style={styles.modalText}>Date: {selectedDate}</Text>
            <Text style={styles.modalText}>Time: {selectedTime}</Text>
            <Text style={styles.modalText}>Room: {selectedRoom}</Text>
            <Text style={styles.modalText}>System: {selectedSystem}</Text>
            <Text style={styles.modalText}>Duration: {formatDuration(duration)}</Text>
            <Text style={styles.modalPrice}>Total Price: ₹{pricePerHour * duration}</Text>
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
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  stepCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee'
  },
  stepTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15 },
  timeSlotContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  timeSlot: { padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, margin: 5, minWidth: 90, alignItems: 'center' },
  timeSlotSelected: { backgroundColor: '#007bff', borderColor: '#007bff' },
  timeSlotText: { color: '#333' },
  timeSlotTextSelected: { color: '#fff', fontWeight: 'bold' },
  durationContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  durationButton: { padding: 10 },
  durationText: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerText: { color: '#666', fontSize: 16 },
  footerPrice: { fontSize: 22, fontWeight: 'bold' },
  bookButton: { backgroundColor: '#007bff', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8 },
  bookButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 10, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  modalText: { fontSize: 16, marginBottom: 5 },
  modalPrice: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 20 },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  // --- NEW Styles for Custom Picker ---
  pickerText: {
    fontSize: 16,
    color: 'black',
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  pickerOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerOptionText: {
    textAlign: 'center',
    fontSize: 18,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
});

export default BookingScreen;
