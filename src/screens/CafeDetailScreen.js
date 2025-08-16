import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Button } from 'react-native';
import cafeService from '../services/cafeService';

const CafeDetailScreen = ({ route, navigation }) => {
  // Get the cafe ID that was passed from the HomeScreen
  const { cafeId } = route.params;

  const [cafe, setCafe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch the specific cafe's details when the screen loads
  useEffect(() => {
    const fetchCafeDetails = async () => {
      try {
        const response = await cafeService.getCafeById(cafeId);
        setCafe(response.data);
      } catch (err) {
        setError('Failed to load cafe details.');
      } finally {
        setLoading(false);
      }
    };
    fetchCafeDetails();
  }, [cafeId]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  if (error || !cafe) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Image 
        source={{ uri: 'https://placehold.co/600x300/222/fff?text=' + cafe.name.replace(/\s/g, "+") }} 
        style={styles.headerImage} 
      />
      <View style={styles.contentContainer}>
        <Text style={styles.name}>{cafe.name}</Text>
        <Text style={styles.address}>{cafe.address}</Text>
        <Text style={styles.hours}>Hours: {cafe.openingTime} - {cafe.closingTime}</Text>
        
        <View style={styles.roomsContainer}>
          <Text style={styles.sectionTitle}>Available Systems</Text>
          {cafe.rooms.map((room, index) => (
            <View key={index} style={styles.roomCard}>
              <Text style={styles.roomType}>{room.roomType}</Text>
              {room.systems.map((system, sysIndex) => (
                <View key={sysIndex} style={styles.systemRow}>
                  <Text style={styles.systemType}>{system.systemType} ({system.count} available)</Text>
                  <Text style={styles.systemPrice}>₹{system.pricePerHour}/hour</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Button title="Book a Slot" onPress={() => alert('TODO: Navigate to Booking Screen')} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#fff' },
  headerImage: { width: '100%', height: 200 },
  contentContainer: { padding: 20 },
  name: { fontSize: 26, fontWeight: 'bold', marginBottom: 5 },
  address: { fontSize: 16, color: '#666', marginBottom: 10 },
  hours: { fontSize: 14, color: '#666', marginBottom: 20, fontStyle: 'italic' },
  roomsContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  roomCard: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 15, marginBottom: 10 },
  roomType: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  systemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  systemType: { fontSize: 16 },
  systemPrice: { fontSize: 16, fontWeight: 'bold' },
  errorText: { color: 'red' },
});

export default CafeDetailScreen;
