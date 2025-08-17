import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://192.168.0.105:5000/api/bookings/';

// Helper function to get the user's token
const getAuthHeader = async () => {
  const userStr = await SecureStore.getItemAsync('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return { Authorization: `Bearer ${user.token}` };
  }
  return {};
};

// This function sends a POST request to create a new booking
const createBooking = async (bookingData) => {
  const config = { headers: await getAuthHeader() };
  const response = await axios.post(API_URL, bookingData, config);
  return response.data;
};

const bookingService = {
  createBooking,
};

export default bookingService;
