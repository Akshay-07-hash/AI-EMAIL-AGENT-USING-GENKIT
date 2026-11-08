// src/services/gmailApiService.js
// ============================================================================
// Gmail REST API Service - Message Fetching & MIME Decoding
// ============================================================================
// Retrieves and decodes emails using the official Gmail REST API v1:
// - Fetches message list (latest 20 messages)
// - Retrieves full message details (headers, payload, parts)
// - Robust URL-Safe Base64 (base64url) decoding with UTF-8 support
// - Recursively handles MIME types (text/plain, text/html, multipart/alternative, multipart/mixed)
// ============================================================================

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/**
 * Decodes a URL-safe Base64 (base64url) encoded string with full UTF-8 support.
 * Handles Unicode, multi-byte characters, accents, and emojis safely.
 *
 * @param {string} base64UrlStr
 * @returns {string} Decoded plain text / HTML string
 */
export const decodeBase64Url = (base64UrlStr) => {
  if (!base64UrlStr) return "";

  try {
    // 1. Replace base64url characters with standard base64 characters
    let base64 = base64UrlStr.replace(/-/g, "+").replace(/_/g, "/");

    // 2. Pad with '=' until length is a multiple of 4
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    // 3. Decode binary string using atob
    const binaryStr = atob(base64);

    // 4. Convert binary string to UTF-8 bytes to correctly support Unicode/Emojis
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    return new TextDecoder("utf-8").decode(bytes);
  } catch (error) {
    console.warn("Base64URL decoding fallback encountered:", error);
    try {
      // Fallback decode attempt
      return decodeURIComponent(
        atob(base64UrlStr.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } catch {
      return "(Unable to decode message content)";
    }
  }
};

/**
 * Extracts a specific header value by name (case-insensitive).
 *
 * @param {Array<{name: string, value: string}>} headers
 * @param {string} name
 * @returns {string}
 */
export const getHeaderValue = (headers = [], name) => {
  if (!Array.isArray(headers)) return "";
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : "";
};

/**
 * Parses sender information from the 'From' header.
 * E.g. "Google Cloud <no-reply@google.com>" -> { name: "Google Cloud", email: "no-reply@google.com" }
 *
 * @param {string} fromHeader
 * @returns {{ name: string, email: string }}
 */
export const parseSender = (fromHeader) => {
  if (!fromHeader) return { name: "Unknown Sender", email: "" };

  const match = fromHeader.match(/^(.*?)\s*<(.+?)>$/);
  if (match) {
    const rawName = match[1].replace(/^["']|["']$/g, "").trim();
    return {
      name: rawName || match[2].trim(),
      email: match[2].trim(),
    };
  }

  return {
    name: fromHeader.trim(),
    email: fromHeader.trim(),
  };
};

/**
 * Recursively traverses Gmail message payload MIME tree to extract:
 * - text/html body (if available)
 * - text/plain body (as fallback or plain text view)
 * Supports: text/plain, text/html, multipart/alternative, multipart/mixed, multipart/related
 *
 * @param {Object} payload
 * @returns {{ html: string, plain: string, content: string, isHtml: boolean }}
 */
export const extractEmailBody = (payload) => {
  if (!payload) {
    return { html: "", plain: "", content: "(No content available)", isHtml: false };
  }

  let textHtml = "";
  let textPlain = "";

  const traverse = (part) => {
    if (!part) return;

    const mimeType = (part.mimeType || "").toLowerCase();
    const bodyData = part.body?.data;

    if (mimeType === "text/html" && bodyData && !textHtml) {
      textHtml = decodeBase64Url(bodyData);
    } else if (mimeType === "text/plain" && bodyData && !textPlain) {
      textPlain = decodeBase64Url(bodyData);
    }

    // Recursively traverse parts (multipart/alternative, multipart/mixed, etc.)
    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        traverse(subPart);
      }
    }
  };

  traverse(payload);

  // If payload itself has data directly
  if (!textHtml && !textPlain && payload.body?.data) {
    const mime = (payload.mimeType || "").toLowerCase();
    const decoded = decodeBase64Url(payload.body.data);
    if (mime === "text/html") {
      textHtml = decoded;
    } else {
      textPlain = decoded;
    }
  }

  const finalContent = textHtml || textPlain || "(No readable message body)";

  return {
    html: textHtml,
    plain: textPlain,
    content: finalContent,
    isHtml: Boolean(textHtml),
  };
};

/**
 * Formats an email timestamp for display.
 * E.g. "Today 2:30 PM", "Yesterday", or "Oct 19, 2026"
 *
 * @param {string} dateHeader
 * @param {string|number} internalDate
 * @returns {string}
 */
export const formatEmailDate = (dateHeader, internalDate) => {
  let dateObj = null;

  if (internalDate) {
    const timestamp = parseInt(internalDate, 10);
    if (!isNaN(timestamp)) {
      dateObj = new Date(timestamp);
    }
  }

  if (!dateObj && dateHeader) {
    dateObj = new Date(dateHeader);
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return dateHeader || "Unknown Date";
  }

  const now = new Date();
  const isToday =
    now.getDate() === dateObj.getDate() &&
    now.getMonth() === dateObj.getMonth() &&
    now.getFullYear() === dateObj.getFullYear();

  if (isToday) {
    return dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === dateObj.getDate() &&
    yesterday.getMonth() === dateObj.getMonth() &&
    yesterday.getFullYear() === dateObj.getFullYear();

  if (isYesterday) {
    return "Yesterday";
  }

  return dateObj.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: now.getFullYear() === dateObj.getFullYear() ? undefined : "numeric",
  });
};

/**
 * Formats a full date/time for the detailed email view.
 *
 * @param {string} dateHeader
 * @param {string|number} internalDate
 * @returns {string}
 */
export const formatFullDateTime = (dateHeader, internalDate) => {
  let dateObj = null;

  if (internalDate) {
    const timestamp = parseInt(internalDate, 10);
    if (!isNaN(timestamp)) {
      dateObj = new Date(timestamp);
    }
  }

  if (!dateObj && dateHeader) {
    dateObj = new Date(dateHeader);
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return dateHeader || "Unknown Date";
  }

  return dateObj.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Fetches the latest N messages from the user's Gmail inbox.
 *
 * @param {string} accessToken
 * @param {number} maxResults Defaults to 20
 * @returns {Promise<Array<Object>>} Parsed message objects
 */
export const fetchLatestGmailMessages = async (accessToken, maxResults = 20) => {
  if (!accessToken) {
    throw new Error("Active Google OAuth access token is required to fetch messages.");
  }

  // 1. List latest message IDs
  const listUrl = `${GMAIL_API_BASE}/messages?maxResults=${maxResults}&q=in:inbox`;
  const listResponse = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!listResponse.ok) {
    const errorBody = await listResponse.json().catch(() => ({}));
    const err = new Error(
      errorBody.error?.message ||
      `Failed to list Gmail messages (HTTP ${listResponse.status})`
    );
    err.status = listResponse.status;
    err.code = listResponse.status === 401 ? "UNAUTHENTICATED" : "API_ERROR";
    throw err;
  }

  const listData = await listResponse.json();
  const messageItems = listData.messages || [];

  if (messageItems.length === 0) {
    return [];
  }

  // 2. Fetch details for each message in parallel
  const detailPromises = messageItems.map(async (msg) => {
    try {
      const detailUrl = `${GMAIL_API_BASE}/messages/${msg.id}?format=full`;
      const detailRes = await fetch(detailUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!detailRes.ok) {
        return null;
      }

      const detailData = await detailRes.json();
      const headers = detailData.payload?.headers || [];

      const subject = getHeaderValue(headers, "Subject") || "(No Subject)";
      const from = getHeaderValue(headers, "From");
      const to = getHeaderValue(headers, "To");
      const date = getHeaderValue(headers, "Date");
      const sender = parseSender(from);
      const isUnread = (detailData.labelIds || []).includes("UNREAD");
      const isStarred = (detailData.labelIds || []).includes("STARRED");
      const messageIdHeader = getHeaderValue(headers, "Message-ID") || getHeaderValue(headers, "Message-Id");

      // Extract decoded bodies
      const body = extractEmailBody(detailData.payload);

      return {
        id: detailData.id,
        threadId: detailData.threadId,
        messageIdHeader,
        labelIds: detailData.labelIds || [],
        isUnread,
        isStarred,
        snippet: detailData.snippet || "",
        internalDate: detailData.internalDate,
        dateFormatted: formatEmailDate(date, detailData.internalDate),
        dateFull: formatFullDateTime(date, detailData.internalDate),
        subject,
        fromRaw: from,
        toRaw: to,
        senderName: sender.name,
        senderEmail: sender.email,
        body,
      };
    } catch (err) {
      console.warn(`Failed to fetch details for message ${msg.id}`, err);
      return null;
    }
  });

  const detailedMessages = await Promise.all(detailPromises);

  // Filter out any null responses
  return detailedMessages.filter(Boolean);
};
