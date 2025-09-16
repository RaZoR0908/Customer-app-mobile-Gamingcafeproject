import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

const CafeCard = ({ cafe, onPress }) => {
  // Use cafe.images instead of cafe.photos to match the database structure
  const imageUrl = cafe.images && cafe.images.length > 0 
    ? cafe.images[0] 
    : 'https://placehold.co/400x200/222/fff?text=Gaming+Cafe';
    
  console.log(`🖼️ Cafe ${cafe.name} - Image URL: ${imageUrl}`);

  const isClosed = cafe.isOpen === false;

  return (
    <TouchableOpacity 
      style={[styles.card, isClosed && styles.closedCard]} 
      onPress={onPress}
    >
      <View style={isClosed ? styles.fadedContainer : null}>
        <Image 
          source={{ uri: imageUrl }} 
          style={[styles.image, isClosed && styles.fadedImage]} 
        />
        {isClosed && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>CLOSED</Text>
          </View>
        )}
      </View>
      <View style={[styles.textContainer, isClosed && styles.fadedText]}>
        <Text style={[styles.name, isClosed && styles.fadedTextStyle]}>
          {cafe.name}
        </Text>
        <Text style={[styles.address, isClosed && styles.fadedTextStyle]}>
          {cafe.address}
        </Text>
        <Text style={[styles.hours, isClosed && styles.fadedTextStyle]}>
          {cafe.operatingHours?.monday?.open || '10:00'} - {cafe.operatingHours?.monday?.close || '22:00'}
        </Text>
        {isClosed && (
          <Text style={styles.closedNote}>
            This cafe is temporarily closed
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12, // Slightly more rounded corners
    marginBottom: 20, // Increased spacing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  closedCard: {
    backgroundColor: '#f5f5f5',
    shadowOpacity: 0.05,
  },
  fadedContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    // Increased the height of the image
    height: 180, 
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  fadedImage: {
    opacity: 0.4,
  },
  closedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  textContainer: {
    padding: 15,
  },
  fadedText: {
    backgroundColor: '#f9f9f9',
  },
  fadedTextStyle: {
    opacity: 0.6,
  },
  name: {
    fontSize: 20, // Larger font for the name
    fontWeight: 'bold',
    marginBottom: 5,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  hours: {
    fontSize: 12,
    color: '#888',
  },
  closedNote: {
    fontSize: 12,
    color: '#d32f2f',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default CafeCard;
