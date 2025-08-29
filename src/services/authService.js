import axios from 'axios';
import * as SecureStore from 'expo-secure-store'; // 1. Import the new library

// The base URL of our backend API.
// Remember to use your computer's local IP address for physical devices.
const API_URL = 'http://192.168.0.106:5000/api/auth/';
// This function sends a POST request to the customer registration endpoint
const register = (name, email, password) => {
  return axios.post(API_URL + 'register', {
    name,
    email,
    password,
  });
};

// This function sends a POST request to the login endpoint
const login = async (email, password) => {
  const response = await axios.post(API_URL + 'login', {
    email,
    password,
  });

  // 2. If the login is successful and we get back user data...
  if (response.data) {
    // ...save the entire user object (including the token) to secure storage.
    await SecureStore.setItemAsync('user', JSON.stringify(response.data));
  }
  return response.data;
};

// 3. Add a function to log the user out
const logout = async () => {
  await SecureStore.deleteItemAsync('user');
};

// 4. Add a function to get the current user's data from storage
const getCurrentUser = async () => {
  const userStr = await SecureStore.getItemAsync('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};


const authService = {
  register,
  login,
  logout,
  getCurrentUser,
};

export default authService;
