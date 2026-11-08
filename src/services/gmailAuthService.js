// src/services/gmailAuthService.js
// ============================================================================
// Gmail OAuth & API Service
// ============================================================================
// Handles secure Google OAuth 2.0 authorization for Gmail API access using
// the restricted `https://www.googleapis.com/auth/gmail.modify` scope.
//
// SECURITY SPECIFICATIONS:
// 1. Requests ONLY `https://www.googleapis.com/auth/gmail.modify`.
// 2. Does NOT request the overly permissive `https://mail.google.com/` scope.
// 3. NO OAuth client secrets are stored or exposed in client-side code.
// 4. Token verification is performed directly against the official Gmail API
//    endpoint: `https://gmail.googleapis.com/gmail/v1/users/me/profile`.
// ============================================================================

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase/config";

// The exact, restricted Gmail scope required
export const GMAIL_MODIFY_SCOPE = "https://www.googleapis.com/auth/gmail.modify";

// LocalStorage key for caching the connection session
const GMAIL_STORAGE_KEY = "ai_email_agent_gmail_connection";

/**
 * Translates Gmail OAuth / API errors into student-friendly explanations.
 * @param {Error|Object} error
 * @returns {string}
 */
export const parseGmailAuthError = (error) => {
  if (!error) return "An unknown error occurred during Gmail connection.";

  // Firebase Auth popup errors
  if (error.code === "auth/popup-closed-by-user") {
    return "Google authorization window was closed before granting permissions. Please click 'Connect Gmail' to try again.";
  }
  if (error.code === "auth/popup-blocked") {
    return "The Google authorization popup was blocked by your browser. Please allow popups for localhost and try again.";
  }
  if (error.code === "auth/cancelled-popup-request") {
    return "Another authorization window is already open. Please complete or close it first.";
  }
  if (error.code === "auth/network-request-failed") {
    return "Network error: Unable to contact Google OAuth servers. Please check your internet connection.";
  }
  if (error.code === "auth/access-denied") {
    return "Permission Denied: You declined to grant Gmail access to AI Email Agent.";
  }

  // Gmail REST API response errors
  if (error.status === 403 || error.message?.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT")) {
    return "Insufficient Permissions: The Gmail API scope was not granted. Please ensure you check the Gmail permission box in the Google prompt.";
  }
  if (error.status === 401) {
    return "Authentication token has expired or is invalid. Please re-authorize Gmail.";
  }

  return error.message || "Failed to authorize with Gmail API.";
};

/**
 * Requests Google OAuth authorization with `gmail.modify` scope using Firebase Auth.
 * Calls the Gmail API profile endpoint to verify access and obtain the Gmail email.
 *
 * @returns {Promise<{ emailAddress: string, accessToken: string, connectedAt: string, scope: string }>}
 */
export const authorizeGmailAccount = async () => {
  if (!auth) {
    throw new Error("Firebase Auth service is not initialized.");
  }

  // 1. Create a Google Auth Provider configured specifically for Gmail
  const provider = new GoogleAuthProvider();

  // 2. Add ONLY the requested `gmail.modify` scope (NOT the broader mail.google.com)
  provider.addScope(GMAIL_MODIFY_SCOPE);

  // 3. Force Google to prompt the user for consent so they can approve the scope
  provider.setCustomParameters({
    prompt: "consent",
    access_type: "offline",
  });

  try {
    // 4. Open the OAuth popup via Firebase
    const result = await signInWithPopup(auth, provider);

    // 5. Extract OAuth credential and Access Token
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error(
        "OAuth authorization succeeded, but no Google Access Token was returned. " +
        "Please ensure Google Sign-In is enabled in Firebase Console."
      );
    }

    // 6. Verify the token against the official Gmail API (GET /users/me/profile)
    const profileResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!profileResponse.ok) {
      const errBody = await profileResponse.json().catch(() => ({}));
      const err = new Error(
        errBody.error?.message ||
        `Gmail API verification failed (HTTP ${profileResponse.status}).`
      );
      err.status = profileResponse.status;
      throw err;
    }

    const profileData = await profileResponse.json();
    const emailAddress = profileData.emailAddress || result.user.email;

    // 7. Assemble connection record
    const connectionData = {
      emailAddress,
      accessToken,
      connectedAt: new Date().toISOString(),
      scope: GMAIL_MODIFY_SCOPE,
      messagesTotal: profileData.messagesTotal || 0,
      threadsTotal: profileData.threadsTotal || 0,
    };

    // 8. Cache in localStorage for session persistence
    try {
      localStorage.setItem(GMAIL_STORAGE_KEY, JSON.stringify(connectionData));
    } catch (e) {
      console.warn("Could not cache Gmail connection in localStorage", e);
    }

    return connectionData;
  } catch (error) {
    console.error("Gmail Authorization Error:", error);
    const friendlyMessage = parseGmailAuthError(error);
    const customError = new Error(friendlyMessage);
    customError.originalError = error;
    customError.code = error.code;
    customError.status = error.status;
    throw customError;
  }
};

/**
 * Retrieves the stored Gmail connection record from localStorage (if any).
 * @returns {Object|null}
 */
export const getStoredGmailConnection = () => {
  try {
    const raw = localStorage.getItem(GMAIL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Disconnects Gmail by clearing local session data.
 */
export const disconnectGmailAccount = () => {
  try {
    localStorage.removeItem(GMAIL_STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear Gmail session from localStorage", e);
  }
};
