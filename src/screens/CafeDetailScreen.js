import React, { useState, useEffect } from 'react';
// 1. Import SafeAreaView
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Button, Image, Dimensions, Modal, TouchableOpacity, SafeAreaView } from 'react-native';
import cafeService from '../services/cafeService';
import Swiper from 'react-native-swiper';
import ImageViewer from 'react-native-image-zoom-viewer';

const { width } = Dimensions.get('window');

const CafeDetailScreen = ({ route, navigation }) => {
  const { cafeId } = route.params;
  const [cafe, setCafe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

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
    return <View style={styles.centered}><Text style={styles.errorText}>{error || 'Cafe not found.'}</Text></View>;
  }

  const images = cafe.photos && cafe.photos.length > 0
    ? cafe.photos
    : [
        'https://placehold.co/600x400/2a2a2a/ffffff?text=Interior',
        'https://placehold.co/600x400/007bff/ffffff?text=Gaming+Setup',
        'https://placehold.co/600x400/28a745/ffffff?text=Community',
      ];
  
  const viewerImages = images.map(url => ({ url }));

  return (
    // 2. Replace the root View with SafeAreaView
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={{ height: 250 }}>
          <Swiper 
            style={styles.swiper} 
            autoplay={true} 
            dotColor="#007bff"
            inactiveDotColor="#90A4AE"
            paginationStyle={{ bottom: 10 }}
          >
            {images.map((url, index) => (
              <TouchableOpacity 
                key={index}
                activeOpacity={0.9}
                onPress={() => {
                  setImageIndex(index);
                  setIsViewerOpen(true);
                }}
              >
                <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </Swiper>
        </View>
        
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
                    <View>
                      <Text style={styles.systemType}>{system.systemType} (Total: {system.count})</Text>
                      {system.specs && (
                        <Text style={styles.systemSpecs}>{system.specs}</Text>
                      )}
                    </View>
                    <Text style={styles.systemPrice}>₹{system.pricePerHour}/hour</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          <Button title="Book a Slot" onPress={() => alert('TODO: Navigate to Booking Screen')} />
        </View>
      </ScrollView>

      <Modal visible={isViewerOpen} transparent={true} onRequestClose={() => setIsViewerOpen(false)}>
        <ImageViewer 
          imageUrls={viewerImages} 
          index={imageIndex}
          onCancel={() => setIsViewerOpen(false)}
          enableSwipeDown={true}
          renderIndicator={() => null}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  swiper: {},
  image: { width: '100%', height: '100%' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  contentContainer: { 
    padding: 20,
    paddingBottom: 40, // 3. Add extra padding at the bottom
  },
  name: { fontSize: 26, fontWeight: 'bold', marginBottom: 5 },
  address: { fontSize: 16, color: '#666', marginBottom: 10 },
  hours: { fontSize: 14, color: '#666', marginBottom: 20, fontStyle: 'italic' },
  roomsContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  roomCard: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 15, marginBottom: 10 },
  roomType: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  systemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  systemType: { fontSize: 16 },
  systemSpecs: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  systemPrice: { fontSize: 16, fontWeight: 'bold' },
  errorText: { color: 'red' },
});

export default CafeDetailScreen;
