// src/firebase/authService.js
// ============================================================================
// Firebase Authentication Service
// ============================================================================
// Modular service functions to handle Google Sign-In, Logout, and Auth state
// listeners. Keeping this logic separate from UI components makes the codebase
// clean, easy to test, and simple for project presentations.
// ============================================================================

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "./config";

/**
 * Translates Firebase error codes into human-friendly explanations.
 * This helps students quickly identify and fix common configuration issues.
 */
export const getFriendlyErrorMessage = (error) => {
  if (!error || !error.code) {
    return error?.message || "An unexpected error occurred during authentication.";
  }

  switch (error.code) {
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      return "Invalid Firebase API Key. Please verify your VITE_FIREBASE_API_KEY in the .env file.";

    case "auth/unauthorized-domain":
      return (
        "Unauthorized Domain: Your current domain (e.g. localhost) is not listed in " +
        "Firebase Console -> Authentication -> Settings -> Authorized Domains. " +
        "Please add 'localhost' (without http/port) to the authorized domains."
      );

    case "auth/popup-closed-by-user":
      return "The sign-in popup was closed before completing authentication. Please try again.";

    case "auth/popup-blocked":
      return "The browser blocked the sign-in popup window. Please allow popups for this site.";

    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";

    case "auth/cancelled-popup-request":
      return "Sign-in request was cancelled. Only one popup can be open at a time.";

    case "auth/operation-not-allowed":
      return (
        "Google Sign-In is not enabled in your Firebase Project. " +
        "Go to Firebase Console -> Authentication -> Sign-in method -> Enable Google."
      );

    default:
      return error.message || "Failed to authenticate with Google.";
  }
};

/**
 * Signs in the user using a Google OAuth popup via Firebase Web SDK.
 * Note: No OAuth secret is needed or exposed on the client side.
 * @returns {Promise<import("firebase/auth").User>}
 */
export const signInWithGoogle = async () => {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured yet. Please copy your Firebase project credentials into the .env file."
    );
  }

  if (!auth || !googleProvider) {
    throw new Error("Firebase Auth service is not properly initialized.");
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    const friendlyMessage = getFriendlyErrorMessage(error);
    const customError = new Error(friendlyMessage);
    customError.code = error.code;
    customError.originalError = error;
    throw customError;
  }
};

/**
 * Signs out the currently authenticated user.
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
    throw error;
  }
};

/**
 * Subscribes to Firebase Authentication state changes.
 * Invokes the callback whenever a user logs in, logs out, or token changes.
 * @param {(user: import("firebase/auth").User | null) => void} callback
 * @returns {import("firebase/auth").Unsubscribe} Unsubscribe cleanup function
 */
export const subscribeToAuthChanges = (callback) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};
