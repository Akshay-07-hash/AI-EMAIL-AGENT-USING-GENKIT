// src/firebase/config.js
// ============================================================================
// Firebase Initialization & Configuration
// ============================================================================
// This file initializes the Firebase Web SDK using environment variables
// defined in your `.env` file (VITE_FIREBASE_*).
// 
// IMPORTANT SECURITY NOTE:
// Firebase client configuration values (apiKey, authDomain, projectId, appId)
// are client-side identifiers used by Firebase servers to associate requests
// with your project. There are NO OAuth client secrets in frontend code.
// Google Sign-In is handled securely via Firebase's OAuth flow.
// ============================================================================

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Read Firebase credentials from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/**
 * Checks whether the environment contains valid Firebase credentials
 * rather than the default template placeholders.
 */
export const isFirebaseConfigured = () => {
  const apiKey = firebaseConfig.apiKey;
  return Boolean(
    apiKey &&
    apiKey !== "your_api_key_here" &&
    !apiKey.includes("your_") &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "your_project_id"
  );
};

// Initialize Firebase App (preventing re-initialization if already exists)
let app = null;
let auth = null;
let googleProvider = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  // Optional: prompt user to select account every time
  googleProvider.setCustomParameters({
    prompt: "select_account",
  });
} catch (error) {
  console.warn("Firebase initialization warning:", error.message);
}

export { app, auth, googleProvider, firebaseConfig };
