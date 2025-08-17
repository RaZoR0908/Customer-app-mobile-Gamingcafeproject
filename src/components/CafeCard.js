import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

const CafeCard = ({ cafe, onPress }) => {
  const imageUrl = cafe.photos && cafe.photos.length > 0 
    ? cafe.photos[0] 
    : 'https://placehold.co/400x200/222/fff?text=Gaming+Cafe';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
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
    borderRadius: 12, // Slightly more rounded corners
    marginBottom: 20, // Increased spacing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  image: {
    width: '100%',
    // Increased the height of the image
    height: 180, 
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  textContainer: {
    padding: 15,
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
});

export default CafeCard;
