// src/context/AuthContext.jsx
// ============================================================================
// Authentication Context & Provider
// ============================================================================
// Provides global authentication state across the application via React Context.
// Components can easily access the current user, login, logout, and loading status
// using the custom `useAuth()` hook.
// ============================================================================

import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithGoogle,
  logoutUser,
  subscribeToAuthChanges,
} from "../firebase/authService";
import { isFirebaseConfigured } from "../firebase/config";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [configured, setConfigured] = useState(isFirebaseConfigured());

  useEffect(() => {
    // Check if configuration is present
    const isConfig = isFirebaseConfigured();
    setConfigured(isConfig);

    // If Firebase isn't configured, we stop loading immediately to show the configuration guide
    if (!isConfig) {
      setLoading(false);
      return;
    }

    // Subscribe to Firebase auth state listener
    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Login handler
  const handleLoginWithGoogle = async () => {
    setAuthError(null);
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      return user;
    } catch (err) {
      setAuthError(err.message || "Failed to sign in with Google.");
      throw err;
    }
  };

  // Logout handler
  const handleLogout = async () => {
    setAuthError(null);
    try {
      await logoutUser();
      setCurrentUser(null);
    } catch (err) {
      setAuthError(err.message || "Failed to log out.");
      throw err;
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const value = {
    currentUser,
    loading,
    authError,
    clearAuthError,
    isConfigured: configured,
    loginWithGoogle: handleLoginWithGoogle,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to consume the AuthContext.
 * Ensures that components fail fast with a helpful message if used outside of AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
