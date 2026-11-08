// src/components/Navbar.jsx
// ============================================================================
// Top Navigation Bar
// ============================================================================
// Displays branding, project status badge, and user session actions (e.g. Logout).
// Also shows real-time Gmail connection indicator when authorized.
// ============================================================================

import React from "react";
import { useAuth } from "../context/AuthContext";
import { useGmail } from "../context/GmailContext";
import { useVoice } from "../context/VoiceContext";

export const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const { isGmailConnected } = useGmail();
  const { toggleVoicePanel, voiceStatus } = useVoice();

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand & Project Logo */}
        <div className="navbar-brand">
          <div className="brand-icon-wrapper">
            <svg
              className="brand-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 8L10.89 13.26C11.56 13.71 12.44 13.71 13.11 13.26L21 8M5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7V17C3 18.1 3.9 19 5 19Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="18" cy="6" r="3" fill="#6366f1" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">AI Email Agent</span>
            <span className={`brand-badge ${isGmailConnected ? "badge-gmail-connected" : ""}`}>
              {isGmailConnected
                ? "Step 6 • Voice AI Agent"
                : currentUser
                ? "Step 6 • Voice AI Agent"
                : "Phase 1 • Auth"}
            </span>
          </div>
        </div>

        {/* Right side: Session status or User Quick Profile */}
        <div className="navbar-actions">
          {currentUser ? (
            <div className="navbar-user-section">
              {/* Step 6: Voice Assistant Navbar Button */}
              <button
                type="button"
                className={`btn-navbar-voice ${voiceStatus === "LISTENING" ? "listening" : ""}`}
                onClick={toggleVoicePanel}
                title="Open Voice AI Assistant"
                id="navbar-voice-assistant-btn"
              >
                <span className="mic-emoji">🎤</span>
                <span>Voice Assistant</span>
                {voiceStatus === "LISTENING" && <span className="nav-pulse-dot"></span>}
              </button>

              {isGmailConnected && (
                <span className="navbar-gmail-pill" title="Gmail API Authorized">
                  <span className="status-indicator-dot"></span>
                  Gmail Connected
                </span>
              )}

              <div className="navbar-user-info">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User avatar"}
                    className="navbar-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="navbar-avatar-placeholder">
                    {(currentUser.displayName || currentUser.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <span className="navbar-username">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
              <button
                type="button"
                className="btn-logout-small"
                onClick={logout}
                title="Sign out of your account"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <span className="navbar-status-pill">FYP &bull; Ready to Connect</span>
          )}
        </div>
      </div>
    </header>
  );
};
