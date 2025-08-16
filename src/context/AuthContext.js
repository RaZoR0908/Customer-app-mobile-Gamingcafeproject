import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

// 1. Create the context
const AuthContext = createContext();

// 2. Create the Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 3. This effect runs when the app starts
  useEffect(() => {
    // Check if a user session is already saved in storage
    const checkUserSession = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (e) {
        console.error('Failed to fetch user session', e);
      } finally {
        setLoading(false);
      }
    };
    checkUserSession();
  }, []);

  // 4. Define the login function
  const login = async (email, password) => {
    // The authService.login function already saves the user to storage
    const loggedInUser = await authService.login(email, password);
    if (loggedInUser.role !== 'customer') {
      // If a non-customer tries to log in, log them out immediately
      await authService.logout();
      // Throw an error to be caught by the LoginScreen
      throw new Error('Access denied. This app is for customers only.');
    }
    setUser(loggedInUser);
  };

  // 5. Define the logout function
  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  // 6. Provide the user, loading state, and functions to the rest of the app
  const value = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 7. Create a custom hook to easily use the context in other components
export const useAuth = () => {
  return useContext(AuthContext);
};
