import axios from 'axios';

// The base URL of our backend API for cafes.
// Remember to use your computer's local IP address.
const API_URL = 'http://192.168.0.103:5000/api/cafes/';

// This function sends a GET request to fetch all cafes.
const getAllCafes = () => {
  return axios.get(API_URL);
};

// ADD THIS NEW FUNCTION
// This function finds cafes near a specific location.
const findNearbyCafes = (latitude, longitude) => {
  // We send the coordinates and a search distance (e.g., 10km) as query parameters.
  return axios.get(`${API_URL}near-me?lat=${latitude}&lng=${longitude}&distance=10`);
};
// ADD THIS NEW FUNCTION
// This function gets a single cafe's details by its ID.
const getCafeById = (id) => {
  return axios.get(API_URL + id);
};


const cafeService = {
  getAllCafes,
  findNearbyCafes, // Add the new function here
  getCafeById,
};

export default cafeService;
