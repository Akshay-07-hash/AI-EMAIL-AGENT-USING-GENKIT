// src/components/EmailDetail.jsx
// ============================================================================
// Email Detail View Component (with Step 4 Actions)
// ============================================================================
// Displays a full email message and provides instant actions:
// - Back to Inbox
// - Reply (Action B)
// - Mark as Read / Unread (Action C)
// - Star / Unstar (Action E)
// - Delete to Trash with confirmation (Action D)
// - Readable HTML and Plain Text views
// ============================================================================

import React, { useState } from "react";
import { useGmail } from "../context/GmailContext";
import { ReplyBox } from "./ReplyBox";
import { AiAssistantPanel } from "./AiAssistantPanel";

export const EmailDetail = () => {
  const {
    selectedEmail,
    clearSelectedEmail,
    toggleRead,
    toggleStar,
    deleteEmail,
    isActionLoading,
    actionFeedback,
    clearActionFeedback,
  } = useGmail();

  const [viewMode, setViewMode] = useState("html"); // 'html' or 'plain'
  const [isReplying, setIsReplying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [initialReplyDraft, setInitialReplyDraft] = useState("");
  const [detectedCategory, setDetectedCategory] = useState(null);

  if (!selectedEmail) return null;

  const {
    id,
    subject,
    senderName,
    senderEmail,
    toRaw,
    dateFull,
    isUnread,
    isStarred,
    body,
  } = selectedEmail;

  const hasHtml = Boolean(body?.html);
  const hasPlain = Boolean(body?.plain);

  const handleDelete = async () => {
    try {
      await deleteEmail(id);
    } catch {
      // Error handled via context
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleSelectReplyDraft = (draftText) => {
    setInitialReplyDraft(draftText);
    setIsReplying(true);
    setTimeout(() => {
      const replyEl = document.querySelector(".email-reply-container");
      if (replyEl) {
        replyEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  return (
    <div className="email-detail-card" role="article" aria-label="Email details">
      {/* Action Feedback Banner */}
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

      {/* Detail View Toolbar */}
      <div className="email-detail-toolbar">
        <div className="toolbar-left">
          <button
            type="button"
            className="btn-back-inbox"
            onClick={clearSelectedEmail}
            id="back-to-inbox-btn"
          >
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
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Back to Inbox</span>
          </button>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="toolbar-actions">
          {/* Reply Button (Action B) */}
          <button
            type="button"
            className={`btn-action-tool ${isReplying ? "active" : ""}`}
            onClick={() => setIsReplying(!isReplying)}
            title="Reply to sender"
            id="detail-reply-btn"
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
              <polyline points="9 17 4 12 9 7"></polyline>
              <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
            </svg>
            <span>Reply</span>
          </button>

          {/* Star / Unstar Button (Action E) */}
          <button
            type="button"
            className={`btn-action-tool star-tool ${isStarred ? "starred" : ""}`}
            onClick={() => toggleStar(id)}
            disabled={isActionLoading}
            title={isStarred ? "Remove Star" : "Star this email"}
            id="detail-star-btn"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={isStarred ? "#f59e0b" : "none"}
              stroke={isStarred ? "#f59e0b" : "currentColor"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>{isStarred ? "Starred" : "Star"}</span>
          </button>

          {/* Mark as Read / Unread Button (Action C) */}
          <button
            type="button"
            className="btn-action-tool"
            onClick={() => toggleRead(id)}
            disabled={isActionLoading}
            title={isUnread ? "Mark as Read" : "Mark as Unread"}
            id="detail-read-btn"
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
              {isUnread ? (
                <>
                  <path d="M2 12l5 5L20 4"></path>
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="4" fill="currentColor"></circle>
                </>
              )}
            </svg>
            <span>{isUnread ? "Mark Read" : "Mark Unread"}</span>
          </button>

          {/* Delete Button (Action D) */}
          <button
            type="button"
            className="btn-action-tool delete-tool"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isActionLoading}
            title="Move email to Trash"
            id="detail-delete-btn"
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
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>

          {/* View Mode Toggle (HTML vs Plain Text) */}
          {hasHtml && hasPlain && (
            <div className="body-view-toggle">
              <button
                type="button"
                className={`toggle-btn ${viewMode === "html" ? "active" : ""}`}
                onClick={() => setViewMode("html")}
              >
                HTML
              </button>
              <button
                type="button"
                className={`toggle-btn ${viewMode === "plain" ? "active" : ""}`}
                onClick={() => setViewMode("plain")}
              >
                Text
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal (Action D) */}
      {showDeleteConfirm && (
        <div className="confirm-delete-overlay" role="dialog" aria-modal="true">
          <div className="confirm-delete-card">
            <div className="confirm-delete-icon">🗑️</div>
            <h3>Move this email to Trash?</h3>
            <p>
              This message will be moved to your Gmail Trash. You can recover it from
              your Gmail Trash within 30 days.
            </p>
            <div className="confirm-delete-actions">
              <button
                type="button"
                className="btn-confirm-delete"
                onClick={handleDelete}
                disabled={isActionLoading}
                id="confirm-delete-action-btn"
              >
                {isActionLoading ? "Deleting..." : "Move to Trash"}
              </button>
              <button
                type="button"
                className="btn-cancel-delete"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isActionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Header */}
      <div className="email-detail-header">
        <div className="email-detail-title-row">
          <h2 className="email-detail-subject">{subject}</h2>
          <div className="email-header-tags">
            {detectedCategory && (
              <span className="email-category-tag">
                🏷️ {detectedCategory.category}
              </span>
            )}
            {isStarred && <span className="email-star-tag">★ Starred</span>}
            {isUnread ? (
              <span className="email-unread-badge">Unread</span>
            ) : (
              <span className="email-read-badge">Read</span>
            )}
          </div>
        </div>

        <div className="email-meta-card">
          <div className="email-meta-avatar">
            {(senderName || senderEmail || "U")[0].toUpperCase()}
          </div>
          <div className="email-meta-info">
            <div className="meta-line">
              <span className="meta-sender-name">{senderName}</span>
              <span className="meta-sender-email">&lt;{senderEmail}&gt;</span>
            </div>
            <div className="meta-subline">
              <span className="meta-to">
                <strong>To:</strong> {toRaw || "Me"}
              </span>
              <span className="meta-divider">&bull;</span>
              <span className="meta-date">{dateFull}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 5: AI Assistant Panel (Gemini + Genkit) */}
      <AiAssistantPanel
        key={selectedEmail.id}
        email={selectedEmail}
        onSelectReplyDraft={handleSelectReplyDraft}
        onCategoryUpdated={setDetectedCategory}
      />

      {/* Inline Reply Editor (Action B) */}
      {isReplying && (
        <div className="email-reply-container">
          <ReplyBox
            email={selectedEmail}
            initialText={initialReplyDraft}
            onCancel={() => {
              setIsReplying(false);
              setInitialReplyDraft("");
            }}
          />
        </div>
      )}

      {/* Email Body Content */}
      <div className="email-detail-body-container">
        {viewMode === "html" && hasHtml ? (
          <div className="email-html-wrapper">
            <iframe
              title="Email Body"
              className="email-html-iframe"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        font-size: 14px;
                        line-height: 1.6;
                        color: #1e293b;
                        background: #ffffff;
                        margin: 16px;
                        word-wrap: break-word;
                      }
                      a { color: #2563eb; }
                      img { max-width: 100%; height: auto; }
                      table { max-width: 100% !important; }
                    </style>
                  </head>
                  <body>${body.html}</body>
                </html>
              `}
            />
          </div>
        ) : (
          <div className="email-plain-wrapper">
            <pre className="email-plain-text">
              {body?.plain || body?.content || "(No message body text)"}
            </pre>
          </div>
        )}
      </div>

      {/* Quick Reply Button at bottom of email body */}
      {!isReplying && (
        <div className="email-bottom-reply-prompt">
          <button
            type="button"
            className="btn-bottom-reply"
            onClick={() => {
              setIsReplying(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
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
              <polyline points="9 17 4 12 9 7"></polyline>
              <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
            </svg>
            <span>Click here to Reply to {senderName}</span>
          </button>
        </div>
      )}
    </div>
  );
};
