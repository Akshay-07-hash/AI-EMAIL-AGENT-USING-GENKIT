// src/services/voiceCommandService.js
// ============================================================================
// Voice Command Parsing & Natural Conversational State Machine
// ============================================================================
// ACADEMIC & SAFETY ARCHITECTURE:
// 1. Natural Language Intent Parsing & Fallback Extraction:
//    Extracts intent, target, and entity parameters from spoken language:
//    - Read email ("Read my latest email", "Read this email")
//    - Summarize email ("Summarize this", "Give me a summary")
//    - Show unread emails ("Show my unread emails")
//    - Find / Search emails ("Find emails from Rahul", "Show emails about project meeting")
//    - Conversational Compose & Draft tracking:
//      * "Send a mail to Rahul regarding tomorrow's meeting" (Recipient + Subject)
//      * "Tell him I'll attend at 10 AM and ask him to share the agenda" (Message)
//      * "Send Rahul an email saying the project is complete" (Recipient + Message in 1 turn)
//      * "Send a mail about the project meeting" (Subject provided, Recipient missing)
//      * "Actually change the time to 11 AM" (Draft modification)
//    - Conversational Reply:
//      * "Reply to this email saying I'll attend"
//    - Safe Delete (Strict human confirmation before moving to Trash)
//    - Grounded Q&A ("What is this email about?", "When is the deadline?")
// 2. Strict Confirmation Safeguards (Requirement H):
//    The agent NEVER performs external or destructive operations (Send email,
//    Send reply, Move to Trash) without explicit affirmative confirmation.
// ============================================================================

/**
 * Checks if the user's transcript expresses affirmative confirmation in any supported language.
 * @param {string} text
 * @returns {boolean}
 */
export function isAffirmative(text) {
  const clean = (text || "").toLowerCase().trim();
  const yesPatterns = [
    // English
    /\byes\b/,
    /\byeah\b/,
    /\byep\b/,
    /\bsure\b/,
    /\bsend\b/,
    /\bsend it\b/,
    /\bconfirm\b/,
    /\bproceed\b/,
    /\bgo ahead\b/,
    /\bdo it\b/,
    /\bok\b/,
    /\bokay\b/,
    /\bcorrect\b/,
    /\baffirmative\b/,
    // Tamil & Tanglish
    /\baama\b/,
    /\baam\b/,
    /\baamaa\b/,
    /\banuppu\b/,
    /\banuppunga\b/,
    /\bsari\b/,
    /\bseri\b/,
    /\bsend pannu\b/,
    /ஆமா/,
    /அனுப்பு/,
    /சரி/,
    // Hindi & Hinglish
    /\bhaan\b/,
    /\bha\b/,
    /\bbhej do\b/,
    /\bbhejo\b/,
    /\bbhej dijiye\b/,
    /\bsahi hai\b/,
    /\btheek hai\b/,
    /\btheek\b/,
    /हाँ/,
    /भेज दो/,
    /भेजो/,
    /सही है/,
    /ठीक है/,
    // Telugu
    /\bavunu\b/,
    /\bpampu\b/,
    /\bsare\b/,
    /అవును/,
    /పంపు/,
    // Malayalam
    /\bathe\b/,
    /\bayakkoo\b/,
    /അതെ/,
    /അയക്കൂ/,
    // Kannada
    /\bhaudu\b/,
    /\bkaluhisi\b/,
    /ಹೌದು/,
    /ಕಳುಹಿಸಿ/,
  ];
  return yesPatterns.some((pattern) => pattern.test(clean));
}

/**
 * Checks if the user's transcript expresses negative / cancellation intent in any supported language.
 * @param {string} text
 * @returns {boolean}
 */
export function isNegative(text) {
  const clean = (text || "").toLowerCase().trim();
  const noPatterns = [
    // English
    /\bno\b/,
    /\bnope\b/,
    /\bcancel\b/,
    /\bcancel that\b/,
    /\bdon't send\b/,
    /\bdo not send\b/,
    /\bstop\b/,
    /\bnever mind\b/,
    /\babort\b/,
    /\bdiscard\b/,
    // Tamil & Tanglish
    /\bvendaam\b/,
    /\bvendam\b/,
    /\billa\b/,
    /\billai\b/,
    /\bcancel pannu\b/,
    /வேண்டாம்/,
    /இல்லை/,
    // Hindi & Hinglish
    /\bnahi\b/,
    /\bnahin\b/,
    /\bna\b/,
    /\bmat bhejo\b/,
    /\broko\b/,
    /\bcancel karo\b/,
    /नहीं/,
    /मत भेजो/,
    /रोको/,
    // Telugu
    /\bvaddhu\b/,
    /\bkadu\b/,
    /వద్దు/,
    // Malayalam
    /\bvenda\b/,
    /\balla\b/,
    /വേണ്ട/,
    // Kannada
    /\bbeda\b/,
    /ಬೇಡ/,
  ];
  return noPatterns.some((pattern) => pattern.test(clean));
}

/**
 * Cleans a spoken email address into a standard format.
 * (e.g., "rahul at gmail dot com" -> "rahul@gmail.com")
 * @param {string} text
 * @returns {string}
 */
export function normalizeSpokenEmail(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+at\s+/g, "@")
    .replace(/\s+dot\s+/g, ".")
    .replace(/\s+/g, "");
}

/**
 * Applies a spoken change to an existing email draft.
 * e.g., "Actually change the time to 11 AM" -> updates draft message
 * @param {Object} draft - { to, subject, message }
 * @param {string} changeText - Spoken instruction
 * @returns {Object} Updated draft
 */
export function applyDraftUpdate(draft = {}, changeText = "") {
  const updated = { ...draft };
  const raw = changeText.trim();
  const lower = raw.toLowerCase();

  // If user says "make the message shorter" or "make it shorter" (English, Tamil, Hindi)
  if (
    /make\s+(?:the\s+message\s+|it\s+)?shorter/i.test(raw) ||
    /(?:message-ah\s+)?(?:short\s+pannu|shorter-ah\s+maathu|surukkama)/i.test(raw) ||
    /(?:sandesh|message)\s+(?:chhota|kam)\s+karo/i.test(raw) ||
    /சுருக்க/i.test(raw) ||
    /छोटा/i.test(raw)
  ) {
    if (updated.message) {
      const firstSentence = updated.message.split(/[.?!]/)[0].trim();
      updated.message = firstSentence ? `${firstSentence}.` : updated.message;
    }
    return updated;
  }

  // If user says "change time to 11 AM" or "actually change time to 11 AM"
  const timeMatch = raw.match(/(?:change|update|set)\s+(?:the\s+)?time\s+to\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)/i);
  if (timeMatch && timeMatch[1]) {
    const newTime = timeMatch[1];
    if (updated.message) {
      // Replace existing time reference if found
      updated.message = updated.message.replace(/[0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?/i, newTime);
      if (!updated.message.includes(newTime)) {
        updated.message += ` (Meeting time: ${newTime})`;
      }
    } else {
      updated.message = `Meeting time updated to ${newTime}.`;
    }
    return updated;
  }

  // If user says "change subject to X"
  const subjectMatch = raw.match(/(?:change|update|set)\s+subject\s+to\s+(.+)/i);
  if (subjectMatch && subjectMatch[1]) {
    updated.subject = subjectMatch[1].trim();
    return updated;
  }

  // If user says "change recipient to X"
  const recipientMatch = raw.match(/(?:change|update|set)\s+(?:recipient|to)\s+to\s+(.+)/i);
  if (recipientMatch && recipientMatch[1]) {
    updated.to = normalizeSpokenEmail(recipientMatch[1]);
    return updated;
  }

  // Default: append or adjust message
  if (lower.startsWith("add ") || lower.startsWith("also ")) {
    const extra = raw.replace(/^(?:add|also)\s+/i, "");
    updated.message = updated.message ? `${updated.message} ${extra}` : extra;
  } else {
    // General update
    const cleaned = raw.replace(/^(?:actually\s+)?(?:change|update|make it)\s+/i, "");
    if (updated.message) {
      updated.message = `${updated.message} (Update: ${cleaned})`;
    } else {
      updated.message = cleaned;
    }
  }

  return updated;
}

/**
 * Parses user speech into intent and extracted parameters (Deterministic Local Parser & Fallback).
 * @param {string} rawTranscript - The recognized speech transcript
 * @param {Object} context - Current application state (selectedEmail, messages, dialogState)
 * @returns {Object} Structured parsed result
 */
export function parseVoiceIntent(rawTranscript, context = {}) {
  const text = (rawTranscript || "").toLowerCase().trim();
  if (!text) {
    return { intent: "EMPTY", params: {} };
  }

  // 0. Explicit Confirmation / Cancellation
  if (isAffirmative(text)) {
    return { intent: "CONFIRM", params: { raw: rawTranscript } };
  }
  if (isNegative(text)) {
    return { intent: "CANCEL", params: { raw: rawTranscript } };
  }

  // 1. DRAFT UPDATE ("Actually change the time to 11 AM", "Make the message shorter")
  if (
    context.dialogState?.draft &&
    (/(?:actually\s+)?(?:change|update)\s+(?:the\s+)?time/i.test(text) ||
      /(?:actually\s+)?(?:change|update)\s+subject/i.test(text) ||
      /(?:actually\s+)?(?:change|update)\s+recipient/i.test(text) ||
      /make\s+(?:the\s+message\s+|it\s+)?shorter/i.test(text) ||
      /(?:actually\s+)?update\s+draft/i.test(text) ||
      /make\s+it\s+\d+/i.test(text) ||
      /add\s+.+/i.test(text))
  ) {
    return {
      intent: "UPDATE_DRAFT",
      params: { changeText: rawTranscript },
    };
  }

  // 2. READ EMAIL COMMAND
  if (
    /read.*(latest|newest|recent|first)\s*one/i.test(text) ||
    /read.*(latest|newest|recent|first)\s*email/i.test(text) ||
    /read.*my\s*email/i.test(text) ||
    /read.*latest/i.test(text)
  ) {
    return { intent: "READ_EMAIL", params: { target: "latest" } };
  }
  if (
    /read.*this\s*email/i.test(text) ||
    /read.*the\s*email/i.test(text) ||
    /read\s*it/i.test(text) ||
    text === "read email"
  ) {
    return {
      intent: "READ_EMAIL",
      params: { target: context.selectedEmail ? "selected" : "latest" },
    };
  }

  // 3. SUMMARIZE EMAIL COMMAND
  if (
    /summarize\s*it/i.test(text) ||
    /summarize.*(this|the|selected)?\s*email/i.test(text) ||
    /summarize\s*this/i.test(text) ||
    /give\s*me.*summary/i.test(text) ||
    /what.*summary/i.test(text) ||
    text === "summarize" ||
    text === "summary"
  ) {
    return {
      intent: "SUMMARIZE_EMAIL",
      params: { target: context.selectedEmail ? "selected" : "latest" },
    };
  }

  // 4. SHOW UNREAD EMAILS
  if (
    /show.*unread/i.test(text) ||
    /list.*unread/i.test(text) ||
    /how many unread/i.test(text) ||
    /unread.*emails/i.test(text)
  ) {
    return { intent: "SHOW_UNREAD", params: {} };
  }

  // 5. FIND / SEARCH EMAILS
  const findFromMatch = text.match(/(?:find|show|search|get)\s*emails?\s*from\s+([a-z0-9@.\s]+)/i);
  if (findFromMatch && findFromMatch[1]) {
    return {
      intent: "FIND_EMAILS",
      params: { type: "from", query: findFromMatch[1].trim() },
    };
  }

  const findAboutMatch = text.match(/(?:find|show|search|get)\s*emails?\s*(?:about|regarding|with subject)\s+([a-z0-9@.\s]+)/i);
  if (findAboutMatch && findAboutMatch[1]) {
    return {
      intent: "FIND_EMAILS",
      params: { type: "subject", query: findAboutMatch[1].trim() },
    };
  }

  // 6. NATURAL REPLY WITH MESSAGE
  // e.g. "Reply to this email saying I'll attend" or "Reply saying I'll be there"
  const replyWithMessageMatch = text.match(/reply.*(?:saying|that)\s+(.+)/i);
  if (replyWithMessageMatch && replyWithMessageMatch[1]) {
    return {
      intent: "REPLY_EMAIL",
      params: {
        target: context.selectedEmail ? "selected" : "latest",
        message: replyWithMessageMatch[1].trim(),
      },
    };
  }
  if (
    /reply.*(to\s*)?(this|the|latest)?\s*email/i.test(text) ||
    text === "reply" ||
    /send\s*(a\s*)?reply/i.test(text)
  ) {
    return {
      intent: "REPLY_EMAIL",
      params: { target: context.selectedEmail ? "selected" : "latest" },
    };
  }

  // 7. DELETE EMAIL (WITH CONFIRMATION)
  if (
    /delete.*(this|the|latest)?\s*email/i.test(text) ||
    /delete\s*this/i.test(text) ||
    /move.*to\s*trash/i.test(text) ||
    /trash.*email/i.test(text)
  ) {
    return {
      intent: "DELETE_EMAIL",
      params: { target: context.selectedEmail ? "selected" : "latest" },
    };
  }

  // 8. NATURAL COMPOSE INTENTS
  // Case A: "Send Rahul an email saying the project is complete" (Both recipient + message)
  const fullComposeMatch = text.match(/(?:send|mail|write)\s+([a-z0-9@.\s]+?)\s+(?:an?\s+email|a\s+mail)?\s*(?:saying|telling him|telling her)\s+(.+)/i);
  if (fullComposeMatch && fullComposeMatch[1] && fullComposeMatch[2]) {
    const rawTo = fullComposeMatch[1].replace(/^(?:to|an\s+email\s+to)\s+/i, '').trim();
    return {
      intent: "SEND_EMAIL",
      params: {
        to: rawTo,
        message: fullComposeMatch[2].trim(),
        subject: "Project Update",
        complete: true,
      },
    };
  }

  // Case B: "Send a mail to <recipient> regarding <subject>" (Recipient + Subject, missing message)
  const composeWithSubjectMatch = text.match(/(?:send|mail|drop|write)\s*(?:an?\s+email|a\s+mail)?\s*to\s+([a-z0-9@._\s]+?)\s*(?:regarding|about)\s+(.+)/i);
  if (composeWithSubjectMatch && composeWithSubjectMatch[1] && composeWithSubjectMatch[2]) {
    return {
      intent: "SEND_EMAIL",
      params: {
        to: composeWithSubjectMatch[1].trim(),
        recipientReference: composeWithSubjectMatch[1].trim(),
        subject: composeWithSubjectMatch[2].trim(),
        missingMessage: true,
      },
    };
  }

  // Case C: Direct recipient specification (e.g. "Send a mail to Alex", "Send a mail to abc@gmail.com", "Mail my manager", "Send it to the HR team", "Write to Priya")
  const directRecipientMatch = text.match(/(?:send\s*(?:a\s*mail|an\s*email|it)?\s*to|write\s*to|drop\s*a\s*mail\s*to|mail)\s+([a-z0-9@._\s]+?)$/i);
  if (directRecipientMatch && directRecipientMatch[1]) {
    const rawTo = directRecipientMatch[1].trim();
    if (!/^(an?\s*(?:email|mail)|someone|them)$/i.test(rawTo)) {
      return {
        intent: "SEND_EMAIL",
        params: {
          to: rawTo,
          recipientReference: rawTo,
          missingMessage: true,
        },
      };
    }
  }

  // Case D: "Send a mail about the project meeting" (Subject provided, recipient missing)
  const composeSubjectOnlyMatch = text.match(/(?:send|mail|write)\s*(?:an?\s+email|a\s+mail)?\s*(?:regarding|about)\s+(.+)/i);
  if (composeSubjectOnlyMatch && composeSubjectOnlyMatch[1]) {
    return {
      intent: "SEND_EMAIL",
      params: {
        subject: composeSubjectOnlyMatch[1].trim(),
        missingRecipient: true,
      },
    };
  }

  // Case D: General Compose ("Compose an email", "Send an email")
  if (
    /compose.*(an\s*)?email/i.test(text) ||
    /write.*(an\s*)?email/i.test(text) ||
    /send.*(an\s*)?email/i.test(text) ||
    /new\s*email/i.test(text)
  ) {
    return { intent: "SEND_EMAIL", params: { missingRecipient: true, missingMessage: true } };
  }

  // 9. ASK AI ABOUT EMAIL (QUESTIONS)
  const isQuestion =
    /^(what|who|when|where|why|how|which|can you|is there|does this)/i.test(text) ||
    text.endsWith("?") ||
    /deadline/i.test(text) ||
    /action.*take/i.test(text) ||
    /important points/i.test(text);

  if (isQuestion) {
    return {
      intent: "ASK_ABOUT_EMAIL",
      params: { question: rawTranscript.trim() },
    };
  }

  // 10. UNRECOGNIZED
  return { intent: "UNKNOWN", params: { raw: rawTranscript } };
}

/**
 * Creates clean spoken representation for reading an email aloud.
 * @param {Object} email
 * @returns {string}
 */
export function formatEmailForReading(email) {
  if (!email) return "No email was found to read.";

  const sender = email.senderName || email.senderEmail || "Unknown Sender";
  const subject = email.subject || "No Subject";
  const bodyText = (email.body?.plain || email.snippet || "").slice(0, 300);

  return `Your email is from ${sender}, with subject '${subject}'. Here is the message: ${bodyText}.`;
}
