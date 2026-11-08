// src/main.jsx
// ============================================================================
// Application Entry Point
// ============================================================================
// Mounts the React root and wraps the entire application with:
// 1. AuthProvider (Firebase Authentication)
// 2. GmailProvider (Gmail API OAuth state & connection management)
// ============================================================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { GmailProvider } from "./context/GmailContext.jsx";
import { VoiceProvider } from "./context/VoiceContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <GmailProvider>
        <VoiceProvider>
          <App />
        </VoiceProvider>
      </GmailProvider>
    </AuthProvider>
  </StrictMode>
);
