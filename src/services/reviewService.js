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

// Gets all reviews for a specific cafe (public)
const getReviewsForCafe = (cafeId) => {
  return axios.get(`${API_BASE_URL}/reviews/${cafeId}`);
};

// Creates a new review for a specific cafe (protected)
const createReview = async (cafeId, reviewData) => {
  const config = { headers: await getAuthHeader() };
  const response = await axios.post(`${API_BASE_URL}/reviews/${cafeId}`, reviewData, config);
  return response.data;
};

const reviewService = {
  getReviewsForCafe,
  createReview,
};

export default reviewService;
