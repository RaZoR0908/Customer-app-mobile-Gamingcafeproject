import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
        {/* Decorative top border */}
        <View style={styles.decorativeBorder} />
        
        <Text style={[styles.name, isClosed && styles.fadedTextStyle]}>
          {cafe.name?.toUpperCase()}
        </Text>
        
        <Text style={[styles.address, isClosed && styles.fadedTextStyle]} numberOfLines={2}>
          {cafe.address}
        </Text>
        
        <View style={styles.hoursContainer}>
          <Ionicons name="time-outline" size={12} color="#6b7280" />
          <Text style={[styles.hours, isClosed && styles.fadedTextStyle]}>
            {cafe.operatingHours?.monday?.open || '10:00'} - {cafe.operatingHours?.monday?.close || '22:00'}
          </Text>
        </View>
        
        {isClosed && (
          <Text style={styles.closedNote}>
            Temporarily closed
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
    overflow: 'hidden',
  },
  closedCard: {
    backgroundColor: '#f8fafc',
    shadowOpacity: 0.05,
    borderColor: '#e2e8f0',
  },
  fadedContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  textContainer: {
    padding: 14,
    position: 'relative',
  },
  decorativeBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  fadedText: {
    backgroundColor: '#f9f9f9',
  },
  fadedTextStyle: {
    opacity: 0.6,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  address: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 18,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hours: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  closedNote: {
    fontSize: 11,
    color: '#dc2626',
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default CafeCard;
