// src/components/Dashboard.jsx
// ============================================================================
// Dashboard Component (Step 1 + Step 2 + Step 3: Inbox & Email Details)
// ============================================================================
// Displayed after successful Firebase Google authentication.
// Displays:
// - User's Name, Email, and Profile Picture
// - "Connect Gmail" Section with real-time status and connected Gmail address
// - Inbox Section (latest 20 emails & email detail reader with MIME decoding)
// - Dedicated Logout action button
// - Student final-year project architecture & milestone status
// ============================================================================

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGmail } from "../context/GmailContext";
import { GmailConnectCard } from "./GmailConnectCard";
import { InboxSection } from "./InboxSection";

export const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const { isGmailConnected, gmailEmail, messages } = useGmail();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Failed to log out", err);
      setIsLoggingOut(false);
    }
  };

  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    try {
      return new Date(dateString).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Hero Welcome Banner */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <div className="status-badge">
            <span className="status-indicator-ping"></span>
            <span className="status-indicator-dot"></span>
            <span>
              {isGmailConnected
                ? `Gmail Connected & Active (${messages.length} Emails Loaded)`
                : "Authentication Active"}
            </span>
          </div>
          <h1 className="hero-title">
            Welcome,{" "}
            <span className="gradient-text">
              {currentUser?.displayName || "Agent Explorer"}
            </span>
            !
          </h1>
          <p className="hero-subtitle">
            Firebase Google Authentication is active. Manage your session and link your
            Gmail inbox below to power the <strong>AI Email Agent</strong>.
          </p>
        </div>
      </section>

      {/* Featured Section: Gmail API Connection Card */}
      <div className="dashboard-featured-section">
        <GmailConnectCard />
      </div>

      {/* Step 3: Inbox Section (Visible when Gmail is connected) */}
      {isGmailConnected && (
        <div className="dashboard-inbox-section">
          <InboxSection />
        </div>
      )}

      {/* Main Grid: User Profile Card & Project Architecture */}
      <div className="dashboard-grid">
        {/* User Profile Card */}
        <section className="card user-profile-card">
          <div className="card-header">
            <h2 className="card-title">User Profile</h2>
            <span className="provider-tag">
              <svg className="google-icon-sm" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google Auth
            </span>
          </div>

          <div className="profile-body">
            {/* Profile Avatar */}
            <div className="profile-avatar-container">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || "User Profile"}
                  className="profile-picture"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="profile-picture-placeholder">
                  {(currentUser?.displayName || currentUser?.email || "U")[0].toUpperCase()}
                </div>
              )}
              <span className="online-badge" title="Online &amp; Authenticated"></span>
            </div>

            {/* Profile Fields */}
            <div className="profile-details-list">
              <div className="detail-row">
                <span className="detail-label">Display Name</span>
                <span className="detail-value highlight">
                  {currentUser?.displayName || "Not Provided"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Email Address</span>
                <span className="detail-value email">
                  {currentUser?.email || "No email available"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Email Verified</span>
                <span className="detail-value">
                  {currentUser?.emailVerified ? (
                    <span className="badge-verified">✓ Verified</span>
                  ) : (
                    <span className="badge-unverified">Pending</span>
                  )}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Firebase UID</span>
                <span className="detail-value mono" title={currentUser?.uid}>
                  {currentUser?.uid ? `${currentUser.uid.slice(0, 18)}...` : "N/A"}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Last Sign-in</span>
                <span className="detail-value">
                  {formatDate(currentUser?.metadata?.lastSignInTime)}
                </span>
              </div>
            </div>

            {/* Logout Action */}
            <div className="profile-actions">
              <button
                type="button"
                className="btn-logout-primary"
                onClick={handleLogout}
                disabled={isLoggingOut}
                id="dashboard-logout-btn"
              >
                {isLoggingOut ? (
                  <span className="btn-spinner"></span>
                ) : (
                  <svg
                    width="18"
                    height="18"
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
                )}
                <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Project Architecture & Modules Overview */}
        <section className="card project-roadmap-card">
          <div className="card-header">
            <h2 className="card-title">Project Architecture</h2>
            <span className="phase-indicator">
              {isGmailConnected ? "Milestone 5 Active (AI Layer)" : "Milestone 2 of 5 In Progress"}
            </span>
          </div>

          <div className="roadmap-list">
            {/* Step 1 */}
            <div className="roadmap-item completed">
              <div className="roadmap-icon">✓</div>
              <div className="roadmap-content">
                <div className="roadmap-heading">
                  <h3>Module 1: Authentication &amp; User Session</h3>
                  <span className="status-pill active">Completed</span>
                </div>
                <p>
                  Secure Google Sign-In with Firebase Web SDK. Real-time auth state
                  subscription via React Context without exposing any OAuth secrets.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`roadmap-item ${isGmailConnected ? "completed" : "active-step"}`}>
              <div className="roadmap-icon">{isGmailConnected ? "✓" : "2"}</div>
              <div className="roadmap-content">
                <div className="roadmap-heading">
                  <h3>Module 2: Gmail API Integration</h3>
                  <span className={`status-pill ${isGmailConnected ? "active" : "in-progress"}`}>
                    {isGmailConnected ? "Connected" : "Ready to Connect"}
                  </span>
                </div>
                <p>
                  OAuth 2.0 authorization using <code>gmail.modify</code> scope. Live profile
                  validation against <code>https://gmail.googleapis.com/gmail/v1/users/me/profile</code>.
                  {isGmailConnected && (
                    <span className="roadmap-email-note">
                      {" "}Connected account: <strong>{gmailEmail}</strong>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`roadmap-item ${isGmailConnected ? "completed" : "upcoming"}`}>
              <div className="roadmap-icon">{isGmailConnected ? "✓" : "3"}</div>
              <div className="roadmap-content">
                <div className="roadmap-heading">
                  <h3>Module 3: Read &amp; Display Gmail Emails</h3>
                  <span className={`status-pill ${isGmailConnected ? "active" : "planned"}`}>
                    {isGmailConnected ? "Active" : "Planned"}
                  </span>
                </div>
                <p>
                  Retrieves latest 20 messages, handles base64url decoding, parses MIME
                  structures (text/html, text/plain, multipart), and provides rich email view.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className={`roadmap-item ${isGmailConnected ? "completed" : "upcoming"}`}>
              <div className="roadmap-icon">{isGmailConnected ? "✓" : "4"}</div>
              <div className="roadmap-content">
                <div className="roadmap-heading">
                  <h3>Module 4: Email Actions</h3>
                  <span className={`status-pill ${isGmailConnected ? "active" : "planned"}`}>
                    {isGmailConnected ? "Active" : "Planned"}
                  </span>
                </div>
                <p>
                  Compose and send new emails, reply directly to conversation threads, mark
                  read/unread, star/unstar, and move emails to Trash with confirmation.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className={`roadmap-item ${isGmailConnected ? "completed" : "upcoming"}`}>
              <div className="roadmap-icon">{isGmailConnected ? "✨" : "5"}</div>
              <div className="roadmap-content">
                <div className="roadmap-heading">
                  <h3>Module 5: AI Email Features (Gemini + Genkit)</h3>
                  <span className={`status-pill ${isGmailConnected ? "active" : "planned"}`}>
                    {isGmailConnected ? "Completed" : "Planned"}
                  </span>
                </div>
                <p>
                  Google Genkit AI flows powered by Gemini: 3-5 bullet point summaries,
                  7-category email triage classification, 3 contextual reply drafts (Professional,
                  Friendly, Short), and interactive "Ask AI about email" grounded Q&amp;A.
                </p>
              </div>
            </div>

            {/* Step 6 */}
            <div className={`roadmap-item ${isGmailConnected ? "completed" : "upcoming"}`}>
              <div className="roadmap-icon">{isGmailConnected ? "🎤" : "6"}</div>
              <div className="roadmap-content">
                <div className="roadmap-heading">
                  <h3>Module 6: Voice AI Email Agent</h3>
                  <span className={`status-pill ${isGmailConnected ? "active" : "planned"}`}>
                    {isGmailConnected ? "Active & Functional" : "Planned"}
                  </span>
                </div>
                <p>
                  Hands-free email assistant using browser Web Speech &amp; SpeechSynthesis APIs:
                  voice-guided compose and reply with human confirmation safeguards, email reading aloud,
                  voice summarization, and spoken Q&amp;A. Zero external paid voice services.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Developer / Viva Quick Reference Box */}
      <section className="viva-info-box">
        <div className="viva-info-icon">🎓</div>
        <div className="viva-info-content">
          <h4>Final Year Project Quick Reference — Step 6 Voice AI Email Agent</h4>
          <p>
            <strong>Voice Input:</strong> Browser Web Speech API (<code>SpeechRecognition</code>) &bull;{" "}
            <strong>Voice Output:</strong> Browser <code>SpeechSynthesis</code> API &bull;{" "}
            <strong>Commands:</strong> Read latest, Summarize, Show unread, Find emails, Compose, Reply, Ask AI &bull;{" "}
            <strong>Safety Safeguard:</strong> Explicit user voice confirmation required before sending emails, replies, or deleting &bull;{" "}
            <strong>Cost:</strong> 100% Free native browser APIs (no paid STT/TTS services).
          </p>
        </div>
      </section>
    </div>
  );
};
