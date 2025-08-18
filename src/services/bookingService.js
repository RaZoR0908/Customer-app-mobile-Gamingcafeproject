import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://192.168.0.102:5000/api/bookings/';

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

// ADD THIS NEW FUNCTION
// This function gets the real-time availability for a cafe on a specific date.
const getSlotAvailability = (cafeId, date) => {
  // This is a public endpoint, so no auth header is needed.
  return axios.get(`${API_URL}availability/${cafeId}?date=${date}`);
};

const bookingService = {
  createBooking,
  getSlotAvailability, // Add the new function
};

export default bookingService;
