import axios from 'axios';

// The base URL of our backend API for cafes.
// Use environment variable or fallback to localhost
const API_URL = 'http://192.168.0.106:5000/api/cafes';

// This function sends a GET request to fetch all cafes.
const getAllCafes = () => {
  return axios.get(API_URL);
};

// This function finds cafes near a specific location.
const findNearbyCafes = (latitude, longitude) => {
  // Now the URL will be constructed correctly: .../cafes/near-me?lat=...
  return axios.get(`${API_URL}/near-me?lat=${latitude}&lng=${longitude}&distance=10`);
};

// This function gets a single cafe's details by its ID.
const getCafeById = (id) => {
  // Now the URL will be constructed correctly: .../cafes/some_id
  return axios.get(`${API_URL}/${id}`);
};


const cafeService = {
  getAllCafes,
  findNearbyCafes,
  getCafeById,
};

export default cafeService;
