// src/components/ComposeModal.jsx
// ============================================================================
// Compose Email Modal Component (Action A)
// ============================================================================
// Provides a clean modal form to compose and send emails via Gmail API:
// - To, Cc, Bcc fields
// - Subject line
// - Message body
// - Send button with loading spinner
// - Cancel / Close button
// - Client validation & error display
// ============================================================================

import React, { useState } from "react";
import { useGmail } from "../context/GmailContext";

export const ComposeModal = () => {
  const { isComposeOpen, closeCompose, sendEmail, isActionLoading } = useGmail();

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [formError, setFormError] = useState("");

  if (!isComposeOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!to.trim()) {
      setFormError("Please provide at least one recipient email in the 'To' field.");
      return;
    }

    try {
      await sendEmail({
        to,
        cc: showCc ? cc : "",
        bcc: showBcc ? bcc : "",
        subject,
        message,
      });
      // Reset form
      setTo("");
      setCc("");
      setBcc("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setFormError(err.message || "Failed to send email.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeCompose} role="dialog" aria-modal="true">
      <div
        className="compose-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Modal Header */}
        <div className="compose-header">
          <div className="compose-header-title">
            <svg
              className="compose-icon-svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <h3>New Message</h3>
          </div>
          <button
            type="button"
            className="compose-close-btn"
            onClick={closeCompose}
            title="Close compose"
          >
            &times;
          </button>
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="compose-error-alert" role="alert">
            <span className="compose-error-icon">⚠️</span>
            <span>{formError}</span>
          </div>
        )}

        {/* Compose Form */}
        <form onSubmit={handleSubmit} className="compose-form">
          {/* To Field */}
          <div className="compose-field-row">
            <label htmlFor="compose-to" className="compose-label">
              To:
            </label>
            <input
              id="compose-to"
              type="email"
              className="compose-input"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              disabled={isActionLoading}
              autoFocus
            />
            <div className="compose-cc-toggles">
              {!showCc && (
                <button
                  type="button"
                  className="btn-text-toggle"
                  onClick={() => setShowCc(true)}
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  className="btn-text-toggle"
                  onClick={() => setShowBcc(true)}
                >
                  Bcc
                </button>
              )}
            </div>
          </div>

          {/* Optional Cc Field */}
          {showCc && (
            <div className="compose-field-row">
              <label htmlFor="compose-cc" className="compose-label">
                Cc:
              </label>
              <input
                id="compose-cc"
                type="text"
                className="compose-input"
                placeholder="cc@example.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                disabled={isActionLoading}
              />
              <button
                type="button"
                className="btn-text-toggle close"
                onClick={() => {
                  setShowCc(false);
                  setCc("");
                }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Optional Bcc Field */}
          {showBcc && (
            <div className="compose-field-row">
              <label htmlFor="compose-bcc" className="compose-label">
                Bcc:
              </label>
              <input
                id="compose-bcc"
                type="text"
                className="compose-input"
                placeholder="bcc@example.com"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                disabled={isActionLoading}
              />
              <button
                type="button"
                className="btn-text-toggle close"
                onClick={() => {
                  setShowBcc(false);
                  setBcc("");
                }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Subject Line */}
          <div className="compose-field-row">
            <label htmlFor="compose-subject" className="compose-label">
              Subject:
            </label>
            <input
              id="compose-subject"
              type="text"
              className="compose-input"
              placeholder="Project update / Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isActionLoading}
            />
          </div>

          {/* Message Area */}
          <div className="compose-body-row">
            <textarea
              id="compose-message"
              className="compose-textarea"
              placeholder="Write your email message here..."
              rows={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isActionLoading}
              required
            />
          </div>

          {/* Modal Actions Footer */}
          <div className="compose-footer">
            <button
              type="submit"
              className="btn-send-email"
              disabled={isActionLoading}
              id="send-email-btn"
            >
              {isActionLoading ? (
                <>
                  <span className="btn-spinner white"></span>
                  <span>Sending...</span>
                </>
              ) : (
                <>
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
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  <span>Send Email</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-cancel-compose"
              onClick={closeCompose}
              disabled={isActionLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
