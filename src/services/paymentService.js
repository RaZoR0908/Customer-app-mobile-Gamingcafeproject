import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://192.168.0.102:5000/api';

const getAuthHeader = async () => {
  try {
    const user = await SecureStore.getItemAsync('user');
    if (user) {
      const userData = JSON.parse(user);
      return {
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        }
      };
    }
    return { headers: { 'Content-Type': 'application/json' } };
  } catch (error) {
    console.error('Error getting auth header:', error);
    return { headers: { 'Content-Type': 'application/json' } };
  }
};

// Create payment order
export const createPaymentOrder = async (bookingId, amount, paymentMethod, isExtension = false, isWalletTopUp = false) => {
  try {
    const authHeader = await getAuthHeader();
    const response = await axios.post(
      `${API_BASE_URL}/payments/create-order`,
      {
        bookingId,
        amount,
        paymentMethod,
        isExtension,
        isWalletTopUp
      },
      authHeader
    );
    return response.data;
  } catch (error) {
    console.error('Create payment order error:', error);
    throw error;
  }
};

// Verify payment
export const verifyPayment = async (paymentId, payuResponse) => {
  try {
    const authHeader = await getAuthHeader();
    const response = await axios.post(
      `${API_BASE_URL}/payments/verify`,
      {
        paymentId,
        payuResponse
      },
      authHeader
    );
    return response.data;
  } catch (error) {
    console.error('Verify payment error:', error);
    throw error;
  }
};

// Create extension payment
export const createExtensionPayment = async (bookingId, amount, paymentMethod) => {
  try {
    const authHeader = await getAuthHeader();
    const response = await axios.post(
      `${API_BASE_URL}/payments/extension`,
      {
        bookingId,
        amount,
        paymentMethod
      },
      authHeader
    );
    return response.data;
  } catch (error) {
    console.error('Create extension payment error:', error);
    throw error;
  }
};

// Process wallet payment
export const processWalletPayment = async (bookingId, amount, isExtension = false) => {
  try {
    const authHeader = await getAuthHeader();
    const response = await axios.post(
      `${API_BASE_URL}/payments/wallet/pay`,
      {
        bookingId,
        amount,
        isExtension
      },
      authHeader
    );
    return response.data;
  } catch (error) {
    console.error('Process wallet payment error:', error);
    throw error;
  }
};

// Get wallet balance
export const getWalletBalance = async () => {
  try {
    const authHeader = await getAuthHeader();
    const response = await axios.get(`${API_BASE_URL}/payments/wallet`, authHeader);
    return response.data;
  } catch (error) {
    console.error('Get wallet balance error:', error);
    throw error;
  }
};

// Create wallet top-up
export const createWalletTopUp = async (amount, paymentMethod) => {
  try {
    const authHeader = await getAuthHeader();
    const response = await axios.post(
      `${API_BASE_URL}/payments/wallet/topup`,
      {
        amount,
        paymentMethod
      },
      authHeader
    );
    return response.data;
  } catch (error) {
    console.error('Create wallet top-up error:', error);
    throw error;
  }
};

// Verify wallet top-up
export const verifyWalletTopUp = async (paymentId, payuResponse) => {
  try {
    const authHeader = await getAuthHeader();
    const response = await axios.post(
      `${API_BASE_URL}/payments/wallet/verify`,
      {
        paymentId,
        payuResponse
      },
      authHeader
    );
    return response.data;
  } catch (error) {
    console.error('Verify wallet top-up error:', error);
    throw error;
  }
};

export default {
  createPaymentOrder,
  verifyPayment,
  createExtensionPayment,
  processWalletPayment,
  getWalletBalance,
  createWalletTopUp,
  verifyWalletTopUp
};
