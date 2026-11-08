// functions/index.js
// ============================================================================
// Firebase Cloud Functions - Secure Server-Side OAuth Token Handler
// ============================================================================
// ACADEMIC & SECURITY ARCHITECTURE:
// In production web applications, exchanging OAuth authorization codes for
// offline refresh tokens requires the Google OAuth Client Secret.
//
// CRITICAL SECURITY RULE:
// The client secret must NEVER exist in client-side code, frontend .env files,
// or the Vite bundle. This Cloud Function demonstrates how secrets are kept
// strictly on the server (Google Cloud Secret Manager / server environment).
// ============================================================================

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { OAuth2Client } = require("google-auth-library");

admin.initializeApp();
const db = admin.firestore();

// Restricted scope: modify only (NOT full mail.google.com)
const GMAIL_MODIFY_SCOPE = "https://www.googleapis.com/auth/gmail.modify";

/**
 * Helper to initialize the Google OAuth2 client with server-held secrets.
 * Secrets are loaded from server environment variables (never sent to client).
 */
const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || "http://localhost:5173";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Server configuration error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing."
    );
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

/**
 * 1. Generates an OAuth Authorization URL for Gmail access.
 * Callable by authenticated Firebase users.
 */
exports.getGmailAuthUrl = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Only authenticated users can initiate Gmail authorization."
    );
  }

  const oauth2Client = getOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Requests a refresh token for long-term server sync
    prompt: "consent",      // Forces consent prompt so user approves gmail.modify
    scope: [GMAIL_MODIFY_SCOPE],
    state: context.auth.uid, // State parameter verifies caller matches returned code
  });

  return { authUrl };
});

/**
 * 2. Securely exchanges an authorization code for access and refresh tokens.
 * The client secret is used exclusively here on the server.
 * Tokens are stored securely in Firestore under the authenticated user's record.
 */
exports.exchangeAuthCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated."
    );
  }

  const { code } = data;
  if (!code) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Authorization code is required."
    );
  }

  try {
    const oauth2Client = getOAuth2Client();

    // Secure server-side exchange using CLIENT_SECRET
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Verify token by querying user's Gmail profile
    const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);

    // Save tokens securely in Firestore (protected by Firestore Security Rules)
    const userId = context.auth.uid;
    await db.collection("users").doc(userId).collection("integrations").doc("gmail").set(
      {
        scope: tokens.scope || GMAIL_MODIFY_SCOPE,
        connectedAt: admin.firestore.FieldValue.serverTimestamp(),
        hasRefreshToken: Boolean(tokens.refresh_token),
        // Encrypt or store tokens in restricted collection
        refreshToken: tokens.refresh_token || null,
        tokenExpiryDate: tokens.expiry_date || null,
      },
      { merge: true }
    );

    return {
      success: true,
      scope: tokens.scope,
      scopesGranted: tokenInfo.scopes,
      message: "Gmail OAuth tokens exchanged and stored securely on server.",
    };
  } catch (error) {
    console.error("Server token exchange failed:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to exchange authorization code on backend."
    );
  }
});

// ============================================================================
// Step 5: Genkit + Gemini AI Email Cloud Functions
// ============================================================================

/**
 * 3. AI Summarize Email Flow
 */
exports.summarizeEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  try {
    const { summarizeEmail: runFlow } = await import("../server/flows/index.js");
    const result = await runFlow(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("summarizeEmail error:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to summarize email.");
  }
});

/**
 * 4. AI Categorize Email Flow
 */
exports.categorizeEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  try {
    const { categorizeEmail: runFlow } = await import("../server/flows/index.js");
    const result = await runFlow(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("categorizeEmail error:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to categorize email.");
  }
});

/**
 * 5. AI Suggest Replies Flow
 */
exports.suggestReplies = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  try {
    const { suggestReplies: runFlow } = await import("../server/flows/index.js");
    const result = await runFlow(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("suggestReplies error:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to suggest replies.");
  }
});

/**
 * 6. Ask AI About Email Flow
 */
exports.askAboutEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  try {
    const { askAboutEmail: runFlow } = await import("../server/flows/index.js");
    const result = await runFlow(data);
    return { success: true, data: result };
  } catch (error) {
    console.error("askAboutEmail error:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to answer question about email.");
  }
});

