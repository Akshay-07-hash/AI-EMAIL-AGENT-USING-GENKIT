// src/components/ReplyBox.jsx
// ============================================================================
// Reply Box Component (Action B)
// ============================================================================
// Inline collapsible reply editor:
// - Pre-fills recipient from senderEmail
// - Retains Gmail threadId to keep response in original thread
// - Sends reply with In-Reply-To header
// - Provides loading state and duplicate submission prevention
// ============================================================================

import React, { useState } from "react";
import { useGmail } from "../context/GmailContext";

export const ReplyBox = ({ email, initialText = "", onCancel }) => {
  const { replyEmail, isActionLoading } = useGmail();
  const [replyText, setReplyText] = useState(initialText || "");
  const [prevInitialText, setPrevInitialText] = useState(initialText);
  const [replyError, setReplyError] = useState("");

  if (initialText !== prevInitialText) {
    setPrevInitialText(initialText);
    setReplyText(initialText);
  }

  const handleSendReply = async (e) => {
    e.preventDefault();
    setReplyError("");

    if (!replyText.trim()) {
      setReplyError("Please enter a reply message before sending.");
      return;
    }

    try {
      await replyEmail({
        to: email.senderEmail || email.fromRaw,
        subject: email.subject,
        message: replyText,
        threadId: email.threadId,
        originalMessageId: email.messageIdHeader,
      });

      // Reset and close on success
      setReplyText("");
      if (onCancel) onCancel();
    } catch (err) {
      setReplyError(err.message || "Failed to send reply.");
    }
  };

  return (
    <div className="reply-box-card" role="region" aria-label="Reply to email">
      <div className="reply-box-header">
        <div className="reply-header-info">
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
            <polyline points="9 17 4 12 9 7"></polyline>
            <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
          </svg>
          <span>
            Replying to <strong>{email.senderName}</strong> &lt;{email.senderEmail}&gt;
          </span>
        </div>
        <span className="reply-thread-badge">
          Thread #{email.threadId.slice(0, 8)}
        </span>
      </div>

      {replyError && (
        <div className="reply-error-alert" role="alert">
          <span>⚠️</span>
          <span>{replyError}</span>
        </div>
      )}

      <form onSubmit={handleSendReply} className="reply-form">
        <textarea
          className="reply-textarea"
          placeholder={`Write your reply to ${email.senderName}...`}
          rows={5}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          disabled={isActionLoading}
          autoFocus
          required
        />

        <div className="reply-actions-row">
          <button
            type="submit"
            className="btn-send-reply"
            disabled={isActionLoading}
            id="send-reply-btn"
          >
            {isActionLoading ? (
              <>
                <span className="btn-spinner white"></span>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
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
                <span>Send Reply</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-cancel-reply"
            onClick={onCancel}
            disabled={isActionLoading}
          >
            Discard
          </button>
        </div>
      </form>
    </div>
  );
};
