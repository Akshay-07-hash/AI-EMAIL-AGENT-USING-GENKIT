// src/components/InboxList.jsx
// ============================================================================
// Inbox List Component (with Step 4 Actions)
// ============================================================================
// Displays the retrieved list of the latest 20 Gmail messages with:
// - Compose Email button (Action A)
// - Quick Star / Unstar toggle (Action E)
// - Quick Mark Read / Unread toggle (Action C)
// - Sender name & email
// - Subject line
// - Date/time formatting
// - Short preview snippet
// - Refresh Inbox action
// - Skeleton loading and error handling
// ============================================================================

import React from "react";
import { useGmail } from "../context/GmailContext";

export const InboxList = () => {
  const {
    messages,
    isFetchingMessages,
    messagesError,
    isTokenExpired,
    fetchInbox,
    selectEmail,
    connectGmail,
    clearMessagesError,
    openCompose,
    toggleRead,
    toggleStar,
    isActionLoading,
    actionFeedback,
    clearActionFeedback,
  } = useGmail();

  const unreadCount = messages.filter((m) => m.isUnread).length;

  return (
    <div className="inbox-card" role="region" aria-label="Gmail Inbox">
      {/* Action Feedback Banner (Success or Error) */}
      {actionFeedback && (
        <div className={`action-feedback-banner ${actionFeedback.type}`} role="status">
          <span>{actionFeedback.type === "success" ? "✓" : "⚠️"}</span>
          <span className="feedback-text">{actionFeedback.message}</span>
          <button
            type="button"
            className="feedback-close-btn"
            onClick={clearActionFeedback}
          >
            &times;
          </button>
        </div>
      )}

      {/* Inbox Header Bar */}
      <div className="inbox-header">
        <div className="inbox-header-title">
          <div className="inbox-icon-badge">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
            </svg>
          </div>
          <div>
            <h2 className="inbox-title">Gmail Inbox</h2>
            <div className="inbox-badges">
              <span className="badge-count">
                {messages.length} {messages.length === 1 ? "Email" : "Emails"} Loaded
              </span>
              {unreadCount > 0 && (
                <span className="badge-unread-count">
                  {unreadCount} Unread
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls: Compose & Refresh */}
        <div className="inbox-controls">
          {/* Action A: Compose Email Button */}
          <button
            type="button"
            className="btn-compose-inbox"
            onClick={openCompose}
            id="compose-email-btn"
            title="Compose and send a new email"
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
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Compose</span>
          </button>

          {/* Refresh Inbox Button */}
          <button
            type="button"
            className="btn-refresh-inbox"
            onClick={fetchInbox}
            disabled={isFetchingMessages}
            title="Refresh latest emails from Gmail API"
            id="refresh-inbox-btn"
          >
            <svg
              className={`refresh-icon ${isFetchingMessages ? "spinning" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>{isFetchingMessages ? "Fetching..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {messagesError && (
        <div className="inbox-error-card" role="alert">
          <div className="inbox-error-icon">⚠️</div>
          <div className="inbox-error-content">
            <p><strong>Error loading emails:</strong> {messagesError}</p>
            <div className="inbox-error-actions">
              {isTokenExpired ? (
                <button
                  type="button"
                  className="btn-error-action"
                  onClick={connectGmail}
                >
                  Re-authorize Gmail
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-error-action"
                  onClick={fetchInbox}
                >
                  Try Again
                </button>
              )}
              <button
                type="button"
                className="btn-error-dismiss"
                onClick={clearMessagesError}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="inbox-content">
        {isFetchingMessages && messages.length === 0 ? (
          /* Skeleton Loader */
          <div className="inbox-skeleton-list">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="inbox-skeleton-row">
                <div className="skeleton-dot"></div>
                <div className="skeleton-avatar"></div>
                <div className="skeleton-body">
                  <div className="skeleton-line skeleton-sender"></div>
                  <div className="skeleton-line skeleton-subject"></div>
                  <div className="skeleton-line skeleton-snippet"></div>
                </div>
                <div className="skeleton-date"></div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          /* Empty State */
          <div className="inbox-empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Messages Found</h3>
            <p>Your Gmail inbox has no messages or the query returned empty.</p>
            <button
              type="button"
              className="btn-inbox-retry"
              onClick={fetchInbox}
            >
              Refresh Inbox
            </button>
          </div>
        ) : (
          /* Message List */
          <div className="email-rows-list">
            {messages.map((email) => (
              <div
                key={email.id}
                className={`email-row ${email.isUnread ? "unread" : "read"}`}
                onClick={() => selectEmail(email.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    selectEmail(email.id);
                  }
                }}
              >
                {/* Unread Status Indicator */}
                <div className="email-row-status">
                  <span
                    className={`email-status-dot ${email.isUnread ? "active" : "inactive"}`}
                    title={email.isUnread ? "Unread email" : "Read email"}
                  />
                </div>

                {/* Quick Star Toggle Button (Action E) */}
                <button
                  type="button"
                  className={`row-star-btn ${email.isStarred ? "starred" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(email.id);
                  }}
                  disabled={isActionLoading}
                  title={email.isStarred ? "Starred" : "Star"}
                  aria-label={email.isStarred ? "Starred" : "Star"}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill={email.isStarred ? "#f59e0b" : "none"}
                    stroke={email.isStarred ? "#f59e0b" : "currentColor"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </button>

                {/* Sender Avatar */}
                <div className="email-sender-avatar">
                  {(email.senderName || email.senderEmail || "U")[0].toUpperCase()}
                </div>

                {/* Email Summary */}
                <div className="email-row-details">
                  <div className="email-row-top">
                    <span className="email-row-sender" title={email.fromRaw}>
                      {email.senderName}
                    </span>
                    <div className="email-row-top-right">
                      {/* Quick Read/Unread Toggle (Action C) */}
                      <button
                        type="button"
                        className="row-read-toggle-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRead(email.id);
                        }}
                        title={email.isUnread ? "Mark as Read" : "Mark as Unread"}
                        aria-label={email.isUnread ? "Mark as Read" : "Mark as Unread"}
                      >
                        {email.isUnread ? "Mark Read" : "Mark Unread"}
                      </button>
                      <span className="email-row-date">
                        {email.dateFormatted}
                      </span>
                    </div>
                  </div>

                  <div className="email-row-subject">
                    {email.subject}
                  </div>

                  <div className="email-row-snippet">
                    {email.snippet}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
