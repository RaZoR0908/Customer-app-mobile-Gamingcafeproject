import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// This function sends a GET request to fetch all cafes.
const getAllCafes = () => {
  return axios.get(`${API_BASE_URL}/cafes`);
};

// This function finds cafes near a specific location.
const findNearbyCafes = (latitude, longitude) => {
  // Now the URL will be constructed correctly: .../cafes/near-me?lat=...
  return axios.get(`${API_BASE_URL}/cafes/near-me?lat=${latitude}&lng=${longitude}&distance=10`);
};

// This function gets a single cafe's details by its ID.
const getCafeById = (id) => {
  // Now the URL will be constructed correctly: .../cafes/some_id
  return axios.get(`${API_BASE_URL}/cafes/${id}`);
};


const cafeService = {
  getAllCafes,
  findNearbyCafes,
  getCafeById,
};

export default cafeService;
