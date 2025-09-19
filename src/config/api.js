// API Configuration
// Change this URL when switching between development and production
export const API_BASE_URL = "http://192.168.0.100:5000/api";

// You can also add environment-specific configurations here
export const API_CONFIG = {
  timeout: 10000, // 10 seconds
  headers: {
    "Content-Type": "application/json",
  },
};

// For future use - different environments
export const ENVIRONMENTS = {
  development: "http://192.168.0.100:5000/api",
  production: "https://your-production-domain.com/api",
  staging: "https://your-staging-domain.com/api",
};
