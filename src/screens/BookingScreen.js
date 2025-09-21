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
import { LinearGradient } from 'expo-linear-gradient';

const BookingScreen = ({ route, navigation }) => {
  const { cafe } = route.params;
  const scrollViewRef = useRef(null);

  // Hide the navigation header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Check if cafe is closed when component mounts
  useEffect(() => {
    if (cafe?.isOpen === false) {
      Alert.alert(
        'Cafe Closed',
        `${cafe.name} is temporarily closed and not accepting bookings. You will be redirected back.`,
        [{ 
          text: 'OK', 
          onPress: () => navigation.goBack() 
        }]
      );
    }
  }, [cafe, navigation]);

  // State for direct booking
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [duration, setDuration] = useState(1);
  const [numberOfSystems, setNumberOfSystems] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // State for multi-system booking (friends coming)
  const [friendsComing, setFriendsComing] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState([]); // Array of {system, room, quantity}
  const [friendCount, setFriendCount] = useState(2); // Number of friends + customer (minimum 2 for group booking)

  // State for availability check
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [isSystemAvailable, setIsSystemAvailable] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Clear phone number on mount and when switching booking types ---
  useEffect(() => {
    setPhoneNumber('');
  }, []);

  useEffect(() => {
    setPhoneNumber('');
  }, [friendsComing]);

  // --- Check System Availability ---
  useEffect(() => {
    if (selectedDate && selectedRoom && selectedSystem) {
      checkSystemAvailability();
    }
  }, [selectedDate, selectedRoom, selectedSystem, duration, numberOfSystems]);

  // --- Check Multi-System Availability ---
  useEffect(() => {
    if (friendsComing && selectedDate && selectedSystems.length > 0) {
      checkMultiSystemAvailability();
    } else if (friendsComing && selectedDate && selectedSystems.length === 0) {
      // Reset availability when no systems selected
      setIsSystemAvailable(false);
    } else if (friendsComing && selectedDate) {
      // For multi-system bookings, assume available if we have systems selected
      setIsSystemAvailable(selectedSystems.length > 0);
    }
  }, [selectedDate, selectedSystems, duration, friendsComing]);

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

  // Check availability for multi-system booking
  const checkMultiSystemAvailability = async () => {
    setAvailabilityLoading(true);
    try {
      let allAvailable = true;
      for (const systemBooking of selectedSystems) {
        if (bookingService && typeof bookingService.checkAvailability === 'function') {
          const roomIdentifier = systemBooking.room._id || systemBooking.room.roomId || systemBooking.room.name;
          const response = await bookingService.checkAvailability({
            cafeId: cafe._id,
            roomType: roomIdentifier,
            systemType: systemBooking.system.type,
            date: selectedDate,
            duration: duration,
            numberOfSystems: systemBooking.quantity
          });
          if (!response.data.available) {
            allAvailable = false;
            break;
          }
        }
      }
      setIsSystemAvailable(allAvailable);
    } catch (error) {
      console.log('Multi-system availability check failed:', error);
      // For multi-system bookings, assume available if check fails
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
    if (friendsComing && selectedSystems.length > 0) {
      return selectedSystems.reduce((total, systemBooking) => {
        return total + (systemBooking.system.pricePerHour * duration * systemBooking.quantity);
      }, 0);
    } else if (selectedSystem) {
      return selectedSystem.pricePerHour * duration;
    }
    return 0;
  }, [selectedSystem, duration, selectedSystems, friendsComing]);

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

  // Multi-system booking handlers
  const handleAddSystem = (system, room) => {
    const totalSelected = selectedSystems.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalSelected >= friendCount) {
      Alert.alert('System Limit Reached', `You can only select exactly ${friendCount} systems for ${friendCount} people.`);
      return;
    }

    const existingIndex = selectedSystems.findIndex(
      item => item.system.type === system.type && item.room._id === room._id
    );
    
    if (existingIndex >= 0) {
      // Update quantity if system already selected
      const updatedSystems = [...selectedSystems];
      updatedSystems[existingIndex].quantity = Math.min(
        updatedSystems[existingIndex].quantity + 1,
        system.count,
        friendCount - (totalSelected - updatedSystems[existingIndex].quantity)
      );
      setSelectedSystems(updatedSystems);
    } else {
      // Add new system
      setSelectedSystems([...selectedSystems, {
        system: system,
        room: room,
        quantity: 1
      }]);
    }
  };

  const handleRemoveSystem = (systemType, roomId) => {
    setSelectedSystems(selectedSystems.filter(
      item => !(item.system.type === systemType && item.room._id === roomId)
    ));
  };

  const handleUpdateSystemQuantity = (systemType, roomId, newQuantity) => {
    if (newQuantity <= 0) {
      // Remove the system completely
      setSelectedSystems(selectedSystems.filter(
        item => !(item.system.type === systemType && item.room._id === roomId)
      ));
      return;
    }

    const totalSelected = selectedSystems.reduce((sum, item) => sum + item.quantity, 0);
    const currentItem = selectedSystems.find(item => item.system.type === systemType && item.room._id === roomId);
    const currentItemQuantity = currentItem ? currentItem.quantity : 0;
    const newTotal = totalSelected - currentItemQuantity + newQuantity;
    
    if (newTotal > friendCount) {
      Alert.alert('System Limit Reached', `You can only select exactly ${friendCount} systems for ${friendCount} people.`);
      return;
    }

    const updatedSystems = selectedSystems.map(item => {
      if (item.system.type === systemType && item.room._id === roomId) {
        return { ...item, quantity: Math.min(newQuantity, item.system.count) };
      }
      return item;
    });
    setSelectedSystems(updatedSystems);
  };

  const handleBookPress = () => {
    // Check basic requirements
    if (!selectedDate) {
      Alert.alert('Incomplete Selection', 'Please select a date.');
      return;
    }
    
    if (!phoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your phone number.');
      return;
    }

    // Check booking type specific requirements
    if (friendsComing) {
      if (!selectedRoom) {
        Alert.alert('Incomplete Selection', 'Please select a room.');
        return;
      }
      if (selectedSystems.length === 0) {
        Alert.alert('Incomplete Selection', 'Please select at least one system for your group.');
        return;
      }
      // Check exact number of systems for group booking
      const totalSelectedSystems = selectedSystems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalSelectedSystems !== friendCount) {
        Alert.alert('System Selection Required', `You must select exactly ${friendCount} systems for ${friendCount} people.`);
        return;
      }
    } else {
      if (!selectedRoom || !selectedSystem) {
        Alert.alert('Incomplete Selection', 'Please select a room and system.');
        return;
      }
    }

    setModalVisible(true);
  };

  const handleFinalBooking = async () => {
    setLoading(true);
    try {
      // Check if cafe is still open before proceeding
      if (cafe?.isOpen === false) {
        Alert.alert(
          'Cafe Closed',
          `${cafe.name} is temporarily closed and not accepting bookings.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Comprehensive validation
      if (!cafe._id) {
        console.error('❌ Cafe ID missing');
        Alert.alert('Booking Error', 'Cafe information is incomplete.');
        return;
      }
      
      let bookingData;
      
      if (friendsComing && selectedSystems.length > 0) {
        // Multi-system booking
        const systemsBooked = selectedSystems.map(systemBooking => ({
          roomType: systemBooking.room._id || systemBooking.room.roomId || systemBooking.room.name,
          systemType: systemBooking.system.type,
          numberOfSystems: systemBooking.quantity,
          pricePerHour: systemBooking.system.pricePerHour
        }));
        
        bookingData = {
          cafeId: cafe._id,
          systemsBooked: systemsBooked,
          bookingDate: selectedDate,
          startTime: new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          duration: duration,
          phoneNumber: phoneNumber.trim(),
          totalPrice: totalPrice,
          friendCount: friendCount
        };
      } else {
        // Single system booking
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
        
        bookingData = {
          cafeId: cafe._id,
          roomType: roomIdentifier,
          systemType: selectedSystem.type,
          bookingDate: selectedDate,
          startTime: new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          }),
          duration: duration,
          numberOfSystems: numberOfSystems,
          phoneNumber: phoneNumber.trim(),
          totalPrice: totalPrice
        };
      }
      
      console.log('📋 Booking data being sent:', bookingData);
      
      const booking = await bookingService.createBooking(bookingData);
      setModalVisible(false);
      
      // Navigate to payment screen instead of showing success alert
      navigation.navigate('Payment', {
        bookingId: booking._id,
        amount: totalPrice,
        isExtension: false
      });
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

  // Check if phone number is valid (exactly 10 digits)
  const isPhoneValid = phoneNumber.trim().length === 10 && /^\d{10}$/.test(phoneNumber.trim());

  const isFormComplete = selectedDate && isPhoneValid && (
    (friendsComing && selectedSystems.length > 0 && selectedSystems.reduce((sum, item) => sum + item.quantity, 0) === friendCount) || 
    (!friendsComing && selectedRoom && selectedSystem)
  );

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
          bounces={false}
          overScrollMode="never"
          scrollEventThrottle={16}
        >
          {/* Beautiful Header with Gradient */}
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
              
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Book Gaming Session</Text>
              </View>
              
              <View style={{ width: 40 }} />
            </View>
          </LinearGradient>

          <View style={styles.titleContainer}>
            <Text style={styles.titleCafeName}>{cafe.name?.toUpperCase()}</Text>
            <View style={styles.titleUnderline} />
          </View>

          {/* Step 1: Booking Type */}
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIcon}>
                <Ionicons name="people" size={20} color="#007AFF" />
              </View>
              <Text style={styles.stepTitle}>1. Booking Type</Text>
            </View>
            
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleOption, !friendsComing && styles.toggleOptionSelected]}
                onPress={() => {
                  setFriendsComing(false);
                  setSelectedSystems([]);
                  setSelectedRoom(null);
                  setSelectedSystem(null);
                }}
              >
                <Ionicons name="person" size={20} color={!friendsComing ? "#FFFFFF" : "#007AFF"} />
                <Text style={[styles.toggleText, !friendsComing && styles.toggleTextSelected]}>
                  Just Me
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.toggleOption, friendsComing && styles.toggleOptionSelected]}
                onPress={() => {
                  setFriendsComing(true);
                  setSelectedRoom(null);
                  setSelectedSystem(null);
                }}
              >
                <Ionicons name="people" size={20} color={friendsComing ? "#FFFFFF" : "#007AFF"} />
                <Text style={[styles.toggleText, friendsComing && styles.toggleTextSelected]}>
                  Friends Coming
                </Text>
              </TouchableOpacity>
            </View>
            
            {friendsComing && (
              <View style={styles.friendCountContainer}>
                <Text style={styles.friendCountLabel}>How many people total?</Text>
                <Text style={styles.friendCountSubLabel}>(Minimum 2)</Text>
                <View style={styles.counterControls}>
                  <TouchableOpacity 
                    onPress={() => setFriendCount(Math.max(2, friendCount - 1))} 
                    style={[styles.counterButton, friendCount <= 2 && styles.counterButtonDisabled]}
                    disabled={friendCount <= 2}
                  >
                    <Ionicons name="remove" size={20} color={friendCount <= 2 ? "#999" : "#007AFF"} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{friendCount}</Text>
                  <TouchableOpacity 
                    onPress={() => setFriendCount(friendCount + 1)} 
                    style={styles.counterButton}
                  >
                    <Ionicons name="add" size={20} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.friendCountHint}>Minimum 2 people required for group booking</Text>
              </View>
            )}
          </View>

          {/* Step 2: Date Selection */}
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIcon}>
                <Ionicons name="calendar" size={20} color="#007AFF" />
              </View>
              <Text style={styles.stepTitle}>2. Select Date</Text>
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
                <Text style={styles.stepTitle}>3. Select Room</Text>
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

          {/* Multi-system selection for friends coming */}
          {friendsComing && selectedDate && selectedRoom && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIcon}>
                  <MaterialIcons name="games" size={20} color="#007AFF" />
                </View>
                <Text style={styles.stepTitle}>4. Select Systems</Text>
              </View>
              
              <View style={styles.simpleGroupInfo}>
                <Text style={styles.simpleGroupText}>
                  Select exactly {friendCount} systems for your group
                </Text>
                <Text style={styles.simpleGroupSubtext}>
                  {friendCount} people = {friendCount} systems required
                </Text>
              </View>
              
              {/* Simple System Selection */}
              <View style={styles.simpleSystemsContainer}>
                {selectedRoom.systems?.reduce((acc, system) => {
                  const existing = acc.find(s => s.type === system.type);
                  if (existing) {
                    existing.count += 1;
                  } else {
                    acc.push({
                      type: system.type,
                      count: 1,
                      pricePerHour: system.pricePerHour,
                      systemIds: [system.systemId || system._id]
                    });
                  }
                  return acc;
                }, []).map((system, systemIndex) => {
                  const isSelected = selectedSystems.some(
                    item => item.system.type === system.type && item.room._id === selectedRoom._id
                  );
                  const selectedItem = selectedSystems.find(
                    item => item.system.type === system.type && item.room._id === selectedRoom._id
                  );
                  const totalSelected = selectedSystems.reduce((sum, item) => sum + item.quantity, 0);
                  const canAddMore = totalSelected < friendCount && 
                    (!selectedItem || selectedItem.quantity < system.count);
                  
                  return (
                    <View key={`${selectedRoom._id}_${system.type}_${systemIndex}`} style={styles.simpleSystemCard}>
                      <View style={styles.simpleSystemInfo}>
                        <Text style={styles.simpleSystemName}>{system.type}</Text>
                        <Text style={styles.simpleSystemDetails}>
                          {system.count} available • ₹{system.pricePerHour}/hour
                        </Text>
                      </View>
                      
                      <View style={styles.simpleQuantityControls}>
                        {isSelected ? (
                          <View style={styles.quantityRow}>
                            <TouchableOpacity
                              onPress={() => handleUpdateSystemQuantity(
                                system.type, 
                                selectedRoom._id, 
                                selectedItem.quantity - 1
                              )}
                              style={styles.simpleQuantityBtn}
                            >
                              <Ionicons name="remove" size={18} color="#007AFF" />
                            </TouchableOpacity>
                            
                            <Text style={styles.simpleQuantityText}>{selectedItem.quantity}</Text>
                            
                            <TouchableOpacity
                              onPress={() => {
                                if (canAddMore) {
                                  handleUpdateSystemQuantity(
                                    system.type, 
                                    selectedRoom._id, 
                                    Math.min(system.count, selectedItem.quantity + 1)
                                  );
                                } else {
                                  Alert.alert('Limit Reached', `You can only select up to ${friendCount} systems total`);
                                }
                              }}
                              style={[styles.simpleQuantityBtn, !canAddMore && styles.simpleQuantityBtnDisabled]}
                              disabled={!canAddMore}
                            >
                              <Ionicons name="add" size={18} color={canAddMore ? "#007AFF" : "#999"} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => {
                              if (canAddMore) {
                                handleAddSystem(system, selectedRoom);
                              } else {
                                Alert.alert('Limit Reached', `You can only select up to ${friendCount} systems total`);
                              }
                            }}
                            style={[styles.addButton, !canAddMore && styles.addButtonDisabled]}
                            disabled={!canAddMore}
                          >
                            <Ionicons name="add" size={18} color={canAddMore ? "#FFFFFF" : "#999"} />
                            <Text style={[styles.addButtonText, !canAddMore && styles.addButtonTextDisabled]}>
                              Add
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              
              {/* Simple Selected Summary */}
              {selectedSystems.length > 0 && (
                <View style={styles.simpleSelectedContainer}>
                  <Text style={styles.simpleSelectedTitle}>
                    Selected ({selectedSystems.reduce((sum, item) => sum + item.quantity, 0)}/{friendCount}) 
                    {selectedSystems.reduce((sum, item) => sum + item.quantity, 0) === friendCount ? ' ✓' : ''}
                  </Text>
                  {selectedSystems.map((item, index) => (
                    <View key={index} style={styles.simpleSelectedItem}>
                      <Text style={styles.simpleSelectedName}>
                        {item.system.type} × {item.quantity}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {selectedRoom && !friendsComing && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepIcon}>
                  <MaterialIcons name="games" size={20} color="#007AFF" />
                </View>
                <Text style={styles.stepTitle}>5. Select System Type</Text>
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

          {/* Duration & Contact Info - Show for both booking types */}
          {((friendsComing && selectedSystems.length > 0) || (!friendsComing && selectedSystem)) && (
            <>
              {/* Step 5: Duration */}
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="time" size={20} color="#007AFF" />
                  </View>
                  <Text style={styles.stepTitle}>5. Duration</Text>
                </View>
                
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

              {/* Step 6: Contact Information */}
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="person" size={20} color="#007AFF" />
                  </View>
                  <Text style={styles.stepTitle}>6. Contact Information</Text>
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      phoneNumber.length > 0 && !isPhoneValid && styles.textInputError
                    ]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="Enter your 10-digit phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  {phoneNumber.length > 0 && !isPhoneValid && (
                    <Text style={styles.errorText}>
                      Please enter a valid 10-digit phone number
                    </Text>
                  )}
                  {isPhoneValid && (
                    <Text style={styles.successText}>
                      ✓ Valid phone number
                    </Text>
                  )}
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
                <Text style={styles.detailValue}>{cafe.name?.toUpperCase()}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{new Date(selectedDate).toDateString()}</Text>
              </View>
              
              {friendsComing && selectedSystems.length > 0 ? (
                // Multi-system booking display
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Group Size:</Text>
                    <Text style={styles.detailValue}>{friendCount} people</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Room:</Text>
                    <Text style={styles.detailValue}>{selectedRoom?.name?.toUpperCase()}</Text>
                  </View>
                  <View style={styles.systemsListContainer}>
                    <Text style={styles.systemsListTitle}>Selected Systems:</Text>
                    {selectedSystems.map((item, index) => (
                      <View key={index} style={styles.systemListItem}>
                        <Text style={styles.systemListName}>
                          {item.system.type} × {item.quantity}
                        </Text>
                        <Text style={styles.systemListPrice}>
                          ₹{item.system.pricePerHour}/hour
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                // Single system booking display
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Room:</Text>
                    <Text style={styles.detailValue}>{selectedRoom?.name?.toUpperCase()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>System:</Text>
                    <Text style={styles.detailValue}>{selectedSystem?.type}</Text>
                  </View>
                </>
              )}
              
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
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  scrollContent: {
    paddingBottom: 100, // Minimal padding to prevent content from being hidden behind footer
  },
  
  // Header
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Title Container
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
    width: '100%',
    flexDirection: 'column',
  },
  titleCafeName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    marginBottom: 10,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  titleUnderline: {
    width: 80,
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  
  // Step Cards
  stepCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginHorizontal: 20, 
    marginBottom: 16, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 4, 
    elevation: 3,
    overflow: 'hidden'
  },
  stepHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  stepTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1e293b',
    flex: 1,
    flexWrap: 'wrap',
    letterSpacing: 0.3
  },

  // Rooms Selection
  roomsContainer: {
    gap: 8
  },
  roomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
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
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    letterSpacing: 0.3
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
    gap: 8
  },
  systemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
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
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    letterSpacing: 0.3
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
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
    letterSpacing: 0.3
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
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: 0.3
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
  textInputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#fff5f5'
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4
  },
  successText: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 4,
    marginLeft: 4
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
    padding: 16, 
    paddingBottom: 20, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000
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
    fontSize: 18, 
    fontWeight: '800',
    letterSpacing: 0.5
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
    color: '#1e293b',
    fontWeight: '700',
    letterSpacing: 0.3
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
    letterSpacing: 0.2
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
  },

  // Multi-system booking styles
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'transparent'
  },
  toggleOptionSelected: {
    backgroundColor: '#007AFF'
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8
  },
  toggleTextSelected: {
    color: '#FFFFFF'
  },
  friendCountContainer: {
    marginTop: 16,
    padding: 20,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2ff',
    alignItems: 'center'
  },
  friendCountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
    textAlign: 'center'
  },
  friendCountSubLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center'
  },
  friendCountHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  },
  counterButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0'
  },
  groupLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0f2ff'
  },
  groupLimitText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1
  },
  roomSection: {
    marginBottom: 20
  },
  roomSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    paddingLeft: 4
  },
  systemOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5'
  },
  systemNameDisabled: {
    color: '#999'
  },
  selectedSystemInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  selectedQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
    minWidth: 20,
    textAlign: 'center'
  },
  selectedSystemsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  selectedSystemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12
  },
  selectedSystemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  selectedSystemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1
  },
  selectedSystemPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0f2ff'
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center'
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffe0e0',
    marginLeft: 8
  },

  // Simplified system selection styles
  simpleGroupInfo: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0f2ff'
  },
  simpleGroupText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '500'
  },
  simpleGroupSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic'
  },
  simpleSystemsContainer: {
    gap: 12
  },
  simpleSystemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  simpleSystemInfo: {
    flex: 1
  },
  simpleSystemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4
  },
  simpleSystemDetails: {
    fontSize: 14,
    color: '#666'
  },
  simpleQuantityControls: {
    alignItems: 'center'
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  simpleQuantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0f2ff'
  },
  simpleQuantityBtnDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0'
  },
  simpleQuantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    minWidth: 20,
    textAlign: 'center'
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6
  },
  addButtonDisabled: {
    backgroundColor: '#f5f5f5'
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  addButtonTextDisabled: {
    color: '#999'
  },
  simpleSelectedContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0f2ff'
  },
  simpleSelectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
    textAlign: 'center'
  },
  simpleSelectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  simpleSelectedName: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500'
  },
  simpleRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffe0e0'
  },
  quantityDisplay: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF'
  },
  quantityLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2
  },

  // Confirmation modal styles for multi-system display
  systemsListContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  systemsListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: 0.3
  },
  systemListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  systemListName: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    letterSpacing: 0.2
  },
  systemListPrice: {
    fontSize: 12,
    color: '#666'
  }
});

export default BookingScreen;
