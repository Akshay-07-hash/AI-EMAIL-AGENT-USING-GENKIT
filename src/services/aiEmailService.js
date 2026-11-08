// src/services/aiEmailService.js
// ============================================================================
// AI Email Service (Frontend Client Service)
// ============================================================================
// ACADEMIC & SECURITY ARCHITECTURE:
// 1. The client NEVER holds or transmits the Gemini API key.
// 2. All calls are routed to the secure backend (/api/ai/*), which executes
//    Google Genkit flows on the server side.
// 3. Handles network failures, missing keys, timeouts, and structured outputs.
// ============================================================================

/**
 * Checks the operational status of the Genkit AI backend.
 * @returns {Promise<{ status: string, geminiConfigured: boolean, model: string, message: string }>}
 */
export async function checkAiStatus() {
  try {
    const res = await fetch('/api/ai/status');
    if (!res.ok) {
      return {
        status: 'error',
        geminiConfigured: false,
        model: 'unknown',
        message: 'AI backend endpoint returned non-200 status.',
      };
    }
    return await res.json();
  } catch (err) {
    console.warn('[AI Service] Status check failed:', err.message);
    return {
      status: 'offline',
      geminiConfigured: false,
      model: 'unknown',
      message: 'AI backend is currently unreachable.',
    };
  }
}

/**
 * Feature A: Summarize email content using Genkit.
 * @param {Object} params
 * @param {string} params.emailContent - Body text of the email
 * @param {string} [params.subject] - Subject of the email
 * @param {string} [params.sender] - Sender of the email
 * @returns {Promise<{ summary: string, bulletPoints: string[], modelUsed?: string }>}
 */
export async function summarizeEmailContent({ emailContent, subject, sender }) {
  if (!emailContent || !emailContent.trim()) {
    throw new Error('This email has no readable body content to summarize.');
  }

  const response = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailContent, subject, sender }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data.error || 'Failed to generate AI summary.';
    const error = new Error(errorMsg);
    error.code = data.code || 'AI_ERROR';
    throw error;
  }

  return data.data;
}

/**
 * Feature B: Categorize email into one of 7 standard categories using Genkit.
 * @param {Object} params
 * @param {string} params.emailContent
 * @param {string} [params.subject]
 * @param {string} [params.sender]
 * @returns {Promise<{ category: string, confidence: string, reason: string, actionNeeded: boolean }>}
 */
export async function categorizeEmailContent({ emailContent, subject, sender }) {
  const response = await fetch('/api/ai/categorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailContent, subject, sender }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data.error || 'Failed to categorize email.';
    const error = new Error(errorMsg);
    error.code = data.code || 'AI_ERROR';
    throw error;
  }

  return data.data;
}

/**
 * Feature C: Suggest 3 contextual reply drafts (Professional, Friendly, Short).
 * Note: AI suggestions are for review and editing; they are never auto-sent.
 * @param {Object} params
 * @param {string} params.emailContent
 * @param {string} [params.subject]
 * @param {string} [params.sender]
 * @returns {Promise<{ replies: { professional: string, friendly: string, short: string }, contextSummary?: string }>}
 */
export async function suggestEmailReplies({ emailContent, subject, sender }) {
  if (!emailContent || !emailContent.trim()) {
    throw new Error('This email has no text to generate reply suggestions for.');
  }

  const response = await fetch('/api/ai/suggest-replies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailContent, subject, sender }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data.error || 'Failed to generate reply suggestions.';
    const error = new Error(errorMsg);
    error.code = data.code || 'AI_ERROR';
    throw error;
  }

  return data.data;
}

/**
 * Feature D: Ask a question about this email using Genkit.
 * @param {Object} params
 * @param {string} params.emailContent
 * @param {string} params.question
 * @param {string} [params.subject]
 * @param {string} [params.sender]
 * @returns {Promise<{ answer: string, foundInEmail: boolean, actionRecommendation?: string }>}
 */
export async function askQuestionAboutEmail({ emailContent, question, subject, sender }) {
  if (!question || !question.trim()) {
    throw new Error('Please enter a question to ask the AI.');
  }

  const response = await fetch('/api/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailContent, question, subject, sender }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data.error || 'Failed to get an answer from AI.';
    const error = new Error(errorMsg);
    error.code = data.code || 'AI_ERROR';
    throw error;
  }

  return data.data;
}

/**
 * Feature E (Step 6 Upgrade): Natural Conversational Voice Agent reasoning via Gemini + Genkit.
 * @param {Object} params
 * @param {string} params.utterance
 * @param {Object} [params.emailContext]
 * @param {Array} [params.conversationHistory]
 * @param {Object} [params.currentState]
 * @param {Array} [params.inboxSummary]
 * @returns {Promise<Object>} Structured intent, entities, missingInformation, response, draft
 */
export async function processVoiceAgentMessage({
  utterance,
  emailContext,
  conversationHistory,
  currentState,
  inboxSummary,
}) {
  if (!utterance || !utterance.trim()) {
    throw new Error('Utterance is empty.');
  }

  const response = await fetch('/api/ai/voice-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      utterance,
      emailContext,
      conversationHistory,
      currentState,
      inboxSummary,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data.error || 'Failed to process voice request with AI.';
    const error = new Error(errorMsg);
    error.code = data.code || 'AI_ERROR';
    throw error;
  }

  return data.data;
}
