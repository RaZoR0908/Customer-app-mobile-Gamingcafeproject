import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';

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
  const response = await axios.post(`${API_BASE_URL}/bookings`, bookingData, config);
  return response.data;
};

// This function gets the real-time availability for a cafe on a specific date.
const getSlotAvailability = (cafeId, date) => {
  return axios.get(`${API_BASE_URL}/bookings/availability/${cafeId}?date=${date}`);
};

// ADD THIS NEW FUNCTION
// This function gets all bookings for the logged-in customer.
const getMyBookings = async () => {
  const config = { headers: await getAuthHeader() };
  const response = await axios.get(`${API_BASE_URL}/bookings/my-bookings`, config);
  return response.data;
};

// This function cancels a booking
const cancelBooking = async (bookingId) => {
  const config = { headers: await getAuthHeader() };
  const response = await axios.post(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {}, config);
  return response.data;
};

const bookingService = {
  createBooking,
  getSlotAvailability,
  getMyBookings, // Add the new function
  cancelBooking, // Add the cancel function
};

export default bookingService;
