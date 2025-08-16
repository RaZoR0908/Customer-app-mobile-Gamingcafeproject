import React from 'react';
// 1. Import the Image component from react-native
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

const CafeCard = ({ cafe, onPress }) => {
  // 2. We'll show the first photo from the cafe's photo array, or a placeholder if it's empty.
  const imageUrl = cafe.photos && cafe.photos.length > 0 
    ? cafe.photos[0] 
    : 'https://placehold.co/400x200/222/fff?text=Gaming+Cafe';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* 3. Add the Image component to display the cafe's picture */}
      <Image source={{ uri: imageUrl }} style={styles.image} />
      <View style={styles.textContainer}>
        <Text style={styles.name}>{cafe.name}</Text>
        <Text style={styles.address}>{cafe.address}</Text>
        <Text style={styles.hours}>
          {cafe.openingTime} - {cafe.closingTime}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden', // Ensures the image corners are rounded
  },
  image: {
    width: '100%',
    height: 150,
  },
  textContainer: {
    padding: 15,
  },
  name: {
    fontSize: 18,
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
});

export default CafeCard;
