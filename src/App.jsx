// src/App.jsx
// ============================================================================
// Main Application Component
// ============================================================================
// Controls the view state based on Firebase Authentication:
// - Shows Loading state while checking auth persistence
// - Displays ConfigAlert if .env has default placeholders
// - Shows LoginPage if unauthenticated
// - Shows Dashboard if authenticated
// ============================================================================

import React from "react";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";
import { ConfigAlert } from "./components/ConfigAlert";
import { VoiceAssistantPanel } from "./components/VoiceAssistantPanel";
import "./App.css";

function App() {
  const { currentUser, loading, isConfigured } = useAuth();

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar />

      {/* Show configuration helper if Firebase credentials are still placeholders */}
      {!isConfigured && <ConfigAlert />}

      {/* Main Content Area */}
      <main className="main-content">
        {loading ? (
          <div className="loading-screen">
            <div className="loading-spinner-large"></div>
            <p className="loading-text">Connecting to AI Email Agent...</p>
          </div>
        ) : currentUser ? (
          <>
            <Dashboard />
            <VoiceAssistantPanel />
          </>
        ) : (
          <LoginPage />
        )}
      </main>
    </div>
  );
}

export default App;
