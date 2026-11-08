// src/context/GmailContext.jsx
// ============================================================================
// Gmail Context & Custom Hook (Steps 2, 3, & 4)
// ============================================================================
// Manages:
// - Gmail OAuth authorization & connection lifecycle (Step 2)
// - Latest 20 inbox messages fetching & caching (Step 3)
// - Email detail view selection (selectEmail / clearSelectedEmail) (Step 3)
// - Email Actions (Step 4):
//   * Compose and send new email
//   * Reply to conversation thread
//   * Mark as read / unread
//   * Star / unstar
//   * Move to trash (delete)
// - Feedback toast / status messages & action loading states
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  authorizeGmailAccount,
  getStoredGmailConnection,
  disconnectGmailAccount,
  GMAIL_MODIFY_SCOPE,
} from "../services/gmailAuthService";
import { fetchLatestGmailMessages } from "../services/gmailApiService";
import {
  sendGmailEmail,
  replyToGmailThread,
  markEmailAsRead,
  markEmailAsUnread,
  starGmailMessage,
  unstarGmailMessage,
  trashGmailMessage,
} from "../services/gmailActionsService";
import { useAuth } from "./AuthContext";

const GmailContext = createContext(null);

export const GmailProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [connection, setConnection] = useState(() => getStoredGmailConnection());
  const [isLoading, setIsLoading] = useState(false);
  const [gmailError, setGmailError] = useState(null);

  // Step 3: Messages State
  const [messages, setMessages] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  // Step 4: Actions State
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Sync state if user changes or logs out
  useEffect(() => {
    if (!currentUser) {
      disconnectGmailAccount();
      setConnection(null);
      setGmailError(null);
      setMessages([]);
      setSelectedEmail(null);
      setMessagesError(null);
      setIsTokenExpired(false);
      setActionFeedback(null);
      setIsComposeOpen(false);
    } else {
      const existing = getStoredGmailConnection();
      if (existing) {
        setConnection(existing);
      }
    }
  }, [currentUser]);

  /**
   * Fetches the latest 20 emails using the active OAuth access token.
   */
  const fetchInbox = useCallback(async () => {
    const activeToken = connection?.accessToken;
    if (!activeToken) {
      setMessages([]);
      return;
    }

    setIsFetchingMessages(true);
    setMessagesError(null);
    setIsTokenExpired(false);

    try {
      const latestMessages = await fetchLatestGmailMessages(activeToken, 20);
      setMessages(latestMessages);
    } catch (err) {
      console.error("Failed to fetch Gmail inbox messages:", err);
      if (err.status === 401 || err.code === "UNAUTHENTICATED") {
        setIsTokenExpired(true);
        setMessagesError(
          "Your Google OAuth access token has expired. Please click 'Re-authorize Gmail' below to refresh your connection."
        );
      } else {
        setMessagesError(
          err.message || "Unable to retrieve Gmail messages. Please check your connection."
        );
      }
    } finally {
      setIsFetchingMessages(false);
    }
  }, [connection?.accessToken]);

  // Automatically fetch messages when Gmail connection is detected
  useEffect(() => {
    if (connection?.accessToken) {
      fetchInbox();
    } else {
      setMessages([]);
      setSelectedEmail(null);
    }
  }, [connection?.accessToken, fetchInbox]);

  /**
   * Triggers the Google OAuth popup to connect the user's Gmail account.
   */
  const handleConnectGmail = async () => {
    setIsLoading(true);
    setGmailError(null);
    setMessagesError(null);
    setIsTokenExpired(false);

    try {
      const data = await authorizeGmailAccount();
      setConnection(data);
      return data;
    } catch (err) {
      setGmailError(err.message || "Failed to connect Gmail.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Disconnects the Gmail account and clears stored tokens and messages.
   */
  const handleDisconnectGmail = () => {
    disconnectGmailAccount();
    setConnection(null);
    setGmailError(null);
    setMessages([]);
    setSelectedEmail(null);
    setMessagesError(null);
    setIsTokenExpired(false);
    setActionFeedback(null);
    setIsComposeOpen(false);
  };

  const clearGmailError = () => {
    setGmailError(null);
  };

  const clearMessagesError = () => {
    setMessagesError(null);
  };

  const clearActionFeedback = () => {
    setActionFeedback(null);
  };

  /**
   * Selects an email to display in detail view.
   */
  const handleSelectEmail = (emailId) => {
    const found = messages.find((m) => m.id === emailId);
    if (found) {
      setSelectedEmail(found);
    }
  };

  /**
   * Clears selected email to return to the inbox list.
   */
  const handleClearSelectedEmail = () => {
    setSelectedEmail(null);
  };

  // ==========================================================================
  // Step 4: Email Actions Handlers
  // ==========================================================================

  /**
   * Action A: Compose and send a new email
   */
  const handleSendEmail = async (emailData) => {
    const activeToken = connection?.accessToken;
    if (!activeToken) throw new Error("No active Gmail connection found.");

    setIsActionLoading(true);
    setActionFeedback(null);

    try {
      const result = await sendGmailEmail(activeToken, emailData);
      setActionFeedback({
        type: "success",
        message: `Email successfully sent to ${emailData.to}!`,
      });
      setIsComposeOpen(false);
      // Refresh inbox in background
      fetchInbox();
      return result;
    } catch (err) {
      console.error("Failed to send email:", err);
      if (err.status === 401) setIsTokenExpired(true);
      setActionFeedback({
        type: "error",
        message: err.message || "Failed to send email. Please try again.",
      });
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  /**
   * Action B: Reply to an existing email conversation thread
   */
  const handleReplyToEmail = async (replyData) => {
    const activeToken = connection?.accessToken;
    if (!activeToken) throw new Error("No active Gmail connection found.");

    setIsActionLoading(true);
    setActionFeedback(null);

    try {
      const result = await replyToGmailThread(activeToken, replyData);
      setActionFeedback({
        type: "success",
        message: `Reply sent successfully to ${replyData.to}!`,
      });
      // Refresh inbox in background
      fetchInbox();
      return result;
    } catch (err) {
      console.error("Failed to send reply:", err);
      if (err.status === 401) setIsTokenExpired(true);
      setActionFeedback({
        type: "error",
        message: err.message || "Failed to send reply.",
      });
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  /**
   * Action C: Mark email as Read / Unread
   */
  const handleToggleRead = async (messageId) => {
    const activeToken = connection?.accessToken;
    if (!activeToken || !messageId) return;

    const target = messages.find((m) => m.id === messageId) || selectedEmail;
    if (!target) return;

    const willBeUnread = !target.isUnread;

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isUnread: willBeUnread } : m))
    );
    if (selectedEmail && selectedEmail.id === messageId) {
      setSelectedEmail((prev) => ({ ...prev, isUnread: willBeUnread }));
    }

    try {
      if (target.isUnread) {
        // Mark as read
        await markEmailAsRead(activeToken, messageId);
      } else {
        // Mark as unread
        await markEmailAsUnread(activeToken, messageId);
      }
    } catch (err) {
      console.error("Failed to toggle read status:", err);
      // Revert optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isUnread: target.isUnread } : m))
      );
      if (selectedEmail && selectedEmail.id === messageId) {
        setSelectedEmail((prev) => ({ ...prev, isUnread: target.isUnread }));
      }
      setActionFeedback({
        type: "error",
        message: "Failed to update read status on Gmail server.",
      });
    }
  };

  /**
   * Action E: Star / Unstar email
   */
  const handleToggleStar = async (messageId) => {
    const activeToken = connection?.accessToken;
    if (!activeToken || !messageId) return;

    const target = messages.find((m) => m.id === messageId) || selectedEmail;
    if (!target) return;

    const willBeStarred = !target.isStarred;

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isStarred: willBeStarred } : m))
    );
    if (selectedEmail && selectedEmail.id === messageId) {
      setSelectedEmail((prev) => ({ ...prev, isStarred: willBeStarred }));
    }

    try {
      if (target.isStarred) {
        await unstarGmailMessage(activeToken, messageId);
      } else {
        await starGmailMessage(activeToken, messageId);
      }
    } catch (err) {
      console.error("Failed to toggle star:", err);
      // Revert optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isStarred: target.isStarred } : m))
      );
      if (selectedEmail && selectedEmail.id === messageId) {
        setSelectedEmail((prev) => ({ ...prev, isStarred: target.isStarred }));
      }
      setActionFeedback({
        type: "error",
        message: "Failed to update star on Gmail server.",
      });
    }
  };

  /**
   * Action D: Move email to Trash (Delete)
   */
  const handleDeleteEmail = async (messageId) => {
    const activeToken = connection?.accessToken;
    if (!activeToken || !messageId) return;

    setIsActionLoading(true);
    setActionFeedback(null);

    try {
      await trashGmailMessage(activeToken, messageId);

      // Remove from messages array in state
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      // If currently viewing this email, return to inbox list
      if (selectedEmail && selectedEmail.id === messageId) {
        setSelectedEmail(null);
      }

      setActionFeedback({
        type: "success",
        message: "Email moved to Gmail Trash.",
      });
    } catch (err) {
      console.error("Failed to delete email:", err);
      if (err.status === 401) setIsTokenExpired(true);
      setActionFeedback({
        type: "error",
        message: err.message || "Failed to delete email from Gmail.",
      });
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  const value = {
    // Connection Info
    isGmailConnected: Boolean(connection?.emailAddress),
    gmailEmail: connection?.emailAddress || null,
    gmailScope: connection?.scope || GMAIL_MODIFY_SCOPE,
    connectedAt: connection?.connectedAt || null,
    messagesTotal: connection?.messagesTotal ?? null,
    threadsTotal: connection?.threadsTotal ?? null,
    accessToken: connection?.accessToken || null,
    isLoading,
    gmailError,
    connectGmail: handleConnectGmail,
    disconnectGmail: handleDisconnectGmail,
    clearGmailError,

    // Step 3: Inbox & Messages
    messages,
    selectedEmail,
    isFetchingMessages,
    messagesError,
    isTokenExpired,
    fetchInbox,
    selectEmail: handleSelectEmail,
    clearSelectedEmail: handleClearSelectedEmail,
    clearMessagesError,

    // Step 4: Email Actions
    isActionLoading,
    actionFeedback,
    clearActionFeedback,
    isComposeOpen,
    openCompose: () => setIsComposeOpen(true),
    closeCompose: () => setIsComposeOpen(false),
    sendEmail: handleSendEmail,
    replyEmail: handleReplyToEmail,
    toggleRead: handleToggleRead,
    toggleStar: handleToggleStar,
    deleteEmail: handleDeleteEmail,
  };

  return <GmailContext.Provider value={value}>{children}</GmailContext.Provider>;
};

/**
 * Custom hook to consume the GmailContext.
 */
export const useGmail = () => {
  const context = useContext(GmailContext);
  if (!context) {
    throw new Error("useGmail must be used within a GmailProvider");
  }
  return context;
};
