// src/components/GmailConnectCard.jsx
// ============================================================================
// Gmail Connection Section Component
// ============================================================================
// Provides a clean, modern interface for the user to:
// - Authorize Gmail access with `https://www.googleapis.com/auth/gmail.modify`
// - View real-time "Gmail Connected" status
// - Inspect the connected Gmail address
// - View API statistics (messages, threads) from GET /users/me/profile
// - Disconnect the Gmail account cleanly
// ============================================================================

import React from "react";
import { useGmail } from "../context/GmailContext";

export const GmailConnectCard = () => {
  const {
    isGmailConnected,
    gmailEmail,
    gmailScope,
    connectedAt,
    messagesTotal,
    threadsTotal,
    isLoading,
    gmailError,
    connectGmail,
    disconnectGmail,
    clearGmailError,
  } = useGmail();

  const handleConnect = async () => {
    try {
      await connectGmail();
    } catch {
      // Errors handled via context state and displayed below
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="card gmail-connect-card">
      <div className="card-header">
        <div className="gmail-card-title-group">
          <div className="gmail-icon-wrapper">
            {/* Gmail Icon */}
            <svg className="gmail-logo-icon" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"
              />
              <path
                fill="#FBBC05"
                d="M4 4l8 6 8-6H4z"
              />
              <path
                fill="#4285F4"
                d="M2 6l10 7.5L22 6v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6z"
              />
              <path
                fill="#34A853"
                d="M2 18V6l10 7.5L2 18z"
              />
            </svg>
          </div>
          <div>
            <h2 className="card-title">Gmail API Integration</h2>
            <p className="card-subtitle-small">OAuth 2.0 &bull; Modify Scope</p>
          </div>
        </div>

        {/* Status Badge */}
        {isGmailConnected ? (
          <span className="gmail-status-pill connected">
            <span className="status-indicator-dot"></span>
            Gmail Connected
          </span>
        ) : (
          <span className="gmail-status-pill disconnected">
            <span className="status-indicator-dot gray"></span>
            Not Connected
          </span>
        )}
      </div>

      {/* Error Alert Display */}
      {gmailError && (
        <div className="gmail-error-banner" role="alert">
          <div className="gmail-error-icon">⚠️</div>
          <div className="gmail-error-text">
            <strong>Authorization Error:</strong> {gmailError}
          </div>
          <button
            type="button"
            className="gmail-error-close"
            onClick={clearGmailError}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Body: Connected vs Disconnected State */}
      <div className="gmail-card-body">
        {isGmailConnected ? (
          /* ========================================================
             CONNECTED STATE
             ======================================================== */
          <div className="gmail-connected-view">
            <div className="gmail-connection-hero">
              <div className="gmail-check-circle">✓</div>
              <div className="gmail-connection-hero-text">
                <h3>Inbox Successfully Connected</h3>
                <p>
                  AI Email Agent has been granted authorized access to interact with your
                  Gmail account using the official Google API.
                </p>
              </div>
            </div>

            {/* Account Details Box */}
            <div className="gmail-details-grid">
              <div className="detail-row">
                <span className="detail-label">Connected Gmail Account</span>
                <span className="detail-value email highlight">
                  <svg className="mail-check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  {gmailEmail}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Authorized Scope</span>
                <span className="detail-value mono scope-pill" title={gmailScope}>
                  https://www.googleapis.com/auth/gmail.modify
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Permission Level</span>
                <span className="detail-value badge-modify">
                  Restricted Modify (Read, Draft, Label)
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Connected On</span>
                <span className="detail-value">
                  {formatDateTime(connectedAt)}
                </span>
              </div>

              {messagesTotal !== null && (
                <div className="detail-row stats-row">
                  <span className="detail-label">Live API Verification</span>
                  <span className="detail-value stats-badge">
                    📬 {messagesTotal.toLocaleString()} messages verified
                  </span>
                </div>
              )}
            </div>

            {/* Disconnect Action */}
            <div className="gmail-actions">
              <button
                type="button"
                className="btn-disconnect-gmail"
                onClick={disconnectGmail}
                title="Disconnect your Gmail account from AI Email Agent"
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
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                  <line x1="12" y1="2" x2="12" y2="12"></line>
                </svg>
                <span>Disconnect Gmail</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
             DISCONNECTED STATE
             ======================================================== */
          <div className="gmail-disconnected-view">
            <p className="gmail-intro-text">
              To enable AI triage, smart summarizing, and automatic drafting in subsequent
              phases, grant AI Email Agent permission to connect with your Gmail account.
            </p>

            {/* Scope Information Badge */}
            <div className="scope-info-box">
              <div className="scope-info-header">
                <span className="shield-icon">🛡️</span>
                <strong>Principle of Least Privilege</strong>
              </div>
              <ul className="scope-checklist">
                <li>
                  <span className="check-bullet">✓</span>
                  <span>
                    Requests restricted scope: <code>gmail.modify</code>
                  </span>
                </li>
                <li>
                  <span className="check-bullet">✓</span>
                  <span>
                    Does <strong>NOT</strong> request unrestricted <code>mail.google.com</code> access
                  </span>
                </li>
                <li>
                  <span className="check-bullet">✓</span>
                  <span>
                    No Google OAuth client secrets are exposed in browser code
                  </span>
                </li>
              </ul>
            </div>

            {/* Connect Action Button */}
            <div className="gmail-actions">
              <button
                type="button"
                className="btn-connect-gmail"
                onClick={handleConnect}
                disabled={isLoading}
                id="connect-gmail-btn"
              >
                {isLoading ? (
                  <>
                    <span className="btn-spinner white"></span>
                    <span>Connecting to Gmail...</span>
                  </>
                ) : (
                  <>
                    <svg className="gmail-button-icon" viewBox="0 0 24 24">
                      <path
                        fill="#ffffff"
                        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"
                        opacity="0.15"
                      />
                      <path
                        fill="#ffffff"
                        d="M4 6l8 5 8-5H4z"
                      />
                      <path
                        fill="#ffffff"
                        d="M20 18H4V8l8 5 8-5v10z"
                      />
                    </svg>
                    <span>Connect Gmail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
