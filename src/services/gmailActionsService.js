// src/services/gmailActionsService.js
// ============================================================================
// Gmail Actions Service (Step 4: Email Actions)
// ============================================================================
// Provides modular functions for:
// - Composing & sending new emails (POST /messages/send)
// - Replying to existing conversation threads (with threadId & In-Reply-To)
// - Marking emails as read / unread (POST /messages/{id}/modify)
// - Starring / unstarring emails (add/remove 'STARRED' label)
// - Moving emails to Trash (POST /messages/{id}/trash)
//
// SECURITY:
// - Uses the existing `https://www.googleapis.com/auth/gmail.modify` scope.
// - Zero OAuth client secrets are used or exposed in frontend code.
// ============================================================================

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/**
 * Encodes a string into URL-Safe Base64 (base64url) with full UTF-8 byte support.
 * @param {string} str
 * @returns {string} base64url string
 */
export const encodeBase64Url = (str) => {
  if (!str) return "";
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Encodes an email subject header using RFC 2047 standard for UTF-8 compatibility.
 * Allows subjects with emojis, accents, and international characters.
 * @param {string} subject
 * @returns {string}
 */
export const encodeSubjectHeader = (subject = "") => {
  if (!subject) return "";
  // If subject only contains basic ASCII, return as is
  if (/^[\x20-\x7E]*$/.test(subject)) {
    return subject;
  }
  const utf8Bytes = new TextEncoder().encode(subject);
  let binary = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
};

/**
 * Constructs an RFC 2822 / RFC 822 formatted raw email string.
 * @param {Object} options
 * @param {string} options.to
 * @param {string} [options.cc]
 * @param {string} [options.bcc]
 * @param {string} options.subject
 * @param {string} options.message
 * @param {string} [options.inReplyTo]
 * @param {string} [options.references]
 * @returns {string} Raw email string
 */
export const createRfc822Message = ({
  to,
  cc,
  bcc,
  subject,
  message,
  inReplyTo,
  references,
}) => {
  const lines = [
    `To: ${to.trim()}`,
    cc && cc.trim() ? `Cc: ${cc.trim()}` : null,
    bcc && bcc.trim() ? `Bcc: ${bcc.trim()}` : null,
    `Subject: ${encodeSubjectHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
  ];

  if (inReplyTo) {
    lines.push(`In-Reply-To: ${inReplyTo}`);
  }
  if (references) {
    lines.push(`References: ${references}`);
  }

  // Filter out any null values and append body
  const headerSection = lines.filter(Boolean).join("\r\n");

  // Format HTML body with paragraph/line breaks preserved
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">
      ${message.replace(/\n/g, "<br/>")}
    </div>
  `;

  return `${headerSection}\r\n\r\n${htmlBody}`;
};

/**
 * Handles API errors from Gmail REST calls.
 * @param {Response} response
 * @param {string} defaultMessage
 */
const handleApiError = async (response, defaultMessage) => {
  const errorData = await response.json().catch(() => ({}));
  const errorMessage = errorData.error?.message || defaultMessage;
  const error = new Error(`${errorMessage} (HTTP ${response.status})`);
  error.status = response.status;
  error.code = response.status === 401 ? "UNAUTHENTICATED" : "API_ERROR";
  throw error;
};

/**
 * A. Send a new composed email.
 * @param {string} accessToken
 * @param {Object} emailData
 * @param {string} emailData.to
 * @param {string} [emailData.cc]
 * @param {string} [emailData.bcc]
 * @param {string} emailData.subject
 * @param {string} emailData.message
 * @returns {Promise<Object>} Gmail API send response
 */
export const sendGmailEmail = async (
  accessToken,
  { to, cc, bcc, subject, message }
) => {
  if (!accessToken) throw new Error("Missing active access token.");
  if (!to || !to.trim()) throw new Error("Recipient ('To') is required.");

  const rawRfc822 = createRfc822Message({
    to,
    cc,
    bcc,
    subject: subject || "(No Subject)",
    message: message || "",
  });

  const encodedRaw = encodeBase64Url(rawRfc822);

  const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      raw: encodedRaw,
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Failed to send email via Gmail API.");
  }

  return response.json();
};

/**
 * B. Reply to an existing email conversation thread.
 * @param {string} accessToken
 * @param {Object} replyData
 * @param {string} replyData.to
 * @param {string} replyData.subject
 * @param {string} replyData.message
 * @param {string} replyData.threadId
 * @param {string} [replyData.originalMessageId]
 * @returns {Promise<Object>}
 */
export const replyToGmailThread = async (
  accessToken,
  { to, subject, message, threadId, originalMessageId }
) => {
  if (!accessToken) throw new Error("Missing active access token.");
  if (!to || !to.trim()) throw new Error("Reply recipient is required.");
  if (!threadId) throw new Error("Thread ID is required for replies.");

  // Ensure subject begins with 'Re: '
  const replySubject = subject.toLowerCase().startsWith("re:")
    ? subject
    : `Re: ${subject}`;

  const rawRfc822 = createRfc822Message({
    to,
    subject: replySubject,
    message: message || "",
    inReplyTo: originalMessageId,
    references: originalMessageId,
  });

  const encodedRaw = encodeBase64Url(rawRfc822);

  const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      raw: encodedRaw,
      threadId, // Keeps reply in the original Gmail thread
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Failed to send reply to Gmail thread.");
  }

  return response.json();
};

/**
 * C. Mark an email as read by removing the 'UNREAD' label.
 * @param {string} accessToken
 * @param {string} messageId
 * @returns {Promise<Object>} Updated message
 */
export const markEmailAsRead = async (accessToken, messageId) => {
  if (!accessToken || !messageId) throw new Error("Token and messageId required.");

  const response = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      removeLabelIds: ["UNREAD"],
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Failed to mark email as read.");
  }

  return response.json();
};

/**
 * C. Mark an email as unread by adding the 'UNREAD' label.
 * @param {string} accessToken
 * @param {string} messageId
 * @returns {Promise<Object>} Updated message
 */
export const markEmailAsUnread = async (accessToken, messageId) => {
  if (!accessToken || !messageId) throw new Error("Token and messageId required.");

  const response = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      addLabelIds: ["UNREAD"],
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Failed to mark email as unread.");
  }

  return response.json();
};

/**
 * E. Star an email by adding the 'STARRED' label.
 * @param {string} accessToken
 * @param {string} messageId
 * @returns {Promise<Object>} Updated message
 */
export const starGmailMessage = async (accessToken, messageId) => {
  if (!accessToken || !messageId) throw new Error("Token and messageId required.");

  const response = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      addLabelIds: ["STARRED"],
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Failed to star email.");
  }

  return response.json();
};

/**
 * E. Unstar an email by removing the 'STARRED' label.
 * @param {string} accessToken
 * @param {string} messageId
 * @returns {Promise<Object>} Updated message
 */
export const unstarGmailMessage = async (accessToken, messageId) => {
  if (!accessToken || !messageId) throw new Error("Token and messageId required.");

  const response = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      removeLabelIds: ["STARRED"],
    }),
  });

  if (!response.ok) {
    await handleApiError(response, "Failed to remove star from email.");
  }

  return response.json();
};

/**
 * D. Move an email message to Trash.
 * @param {string} accessToken
 * @param {string} messageId
 * @returns {Promise<Object>}
 */
export const trashGmailMessage = async (accessToken, messageId) => {
  if (!accessToken || !messageId) throw new Error("Token and messageId required.");

  const response = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/trash`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    await handleApiError(response, "Failed to move email to Trash.");
  }

  return response.json();
};
