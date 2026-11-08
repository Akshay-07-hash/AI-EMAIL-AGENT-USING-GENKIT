// server/router.js
// ============================================================================
// AI API Request Router (Server-Side)
// ============================================================================
// Dispatches /api/ai/* endpoints to the corresponding Genkit flows:
// - POST /api/ai/summarize        -> summarizeEmail
// - POST /api/ai/categorize       -> categorizeEmail
// - POST /api/ai/suggest-replies  -> suggestReplies
// - POST /api/ai/ask              -> askAboutEmail
// - GET  /api/ai/status           -> Health / Gemini status check
// ============================================================================

import {
  summarizeEmail,
  categorizeEmail,
  suggestReplies,
  askAboutEmail,
  voiceAgent,
} from './flows/index.js';
import { getGeminiApiKey, DEFAULT_GEMINI_MODEL } from './genkit.js';

const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout

/**
 * Helper to run an async operation with a timeout promise.
 */
function withTimeout(promise, timeoutMs = REQUEST_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`AI processing timed out after ${timeoutMs / 1000} seconds.`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Handles incoming Node HTTP requests for /api/ai/*
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleAiRequest(req, res) {
  // CORS & Content-Type headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Parse path (strip query parameters and base url)
  const fullUrl = req.url || '';
  const pathname = fullUrl.split('?')[0];

  // Helper to send JSON responses
  const sendJson = (statusCode, data) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  // Status check endpoint
  if (req.method === 'GET' && (pathname === '/status' || pathname === '/api/ai/status')) {
    const hasKey = Boolean(getGeminiApiKey());
    return sendJson(200, {
      status: 'ok',
      geminiConfigured: hasKey,
      model: DEFAULT_GEMINI_MODEL,
      message: hasKey
        ? 'Gemini + Genkit AI layer is ready.'
        : 'Gemini API key is not configured. Add GEMINI_API_KEY to functions/.env on the server.',
    });
  }

  if (req.method !== 'POST') {
    return sendJson(405, { success: false, error: 'Method Not Allowed. Use POST.' });
  }

  // Read request body
  let bodyData = {};
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawString = Buffer.concat(chunks).toString('utf-8');
    if (rawString) {
      bodyData = JSON.parse(rawString);
    }
  } catch (parseErr) {
    return sendJson(400, {
      success: false,
      error: 'Invalid JSON request body.',
      details: parseErr.message,
    });
  }

  // Check for API key configuration
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return sendJson(503, {
      success: false,
      code: 'MISSING_API_KEY',
      error:
        'Gemini API key is not configured on the server. Please add GEMINI_API_KEY=your_key in functions/.env and restart.',
    });
  }

  try {
    // Route 1: Summarize Email
    if (pathname === '/summarize' || pathname === '/api/ai/summarize') {
      const result = await withTimeout(summarizeEmail(bodyData));
      return sendJson(200, { success: true, data: result });
    }

    // Route 2: Categorize Email
    if (pathname === '/categorize' || pathname === '/api/ai/categorize') {
      const result = await withTimeout(categorizeEmail(bodyData));
      return sendJson(200, { success: true, data: result });
    }

    // Route 3: Suggest Replies
    if (pathname === '/suggest-replies' || pathname === '/api/ai/suggest-replies') {
      const result = await withTimeout(suggestReplies(bodyData));
      return sendJson(200, { success: true, data: result });
    }

    // Route 4: Ask AI About Email
    if (pathname === '/ask' || pathname === '/api/ai/ask') {
      const result = await withTimeout(askAboutEmail(bodyData));
      return sendJson(200, { success: true, data: result });
    }

    // Route 5: Natural Conversational Voice Agent Flow
    if (pathname === '/voice-agent' || pathname === '/api/ai/voice-agent') {
      const result = await withTimeout(voiceAgent(bodyData));
      return sendJson(200, { success: true, data: result });
    }

    // Unmatched endpoint
    return sendJson(404, {
      success: false,
      error: `Unknown AI endpoint: ${pathname}. Available: /summarize, /categorize, /suggest-replies, /ask, /voice-agent, /status`,
    });
  } catch (flowError) {
    console.error(`[AI Router Error on ${pathname}]:`, flowError);

    const errorMessage = flowError.message || 'An error occurred during AI processing.';
    const isTimeout = errorMessage.includes('timed out');

    return sendJson(500, {
      success: false,
      code: isTimeout ? 'AI_TIMEOUT' : 'AI_ERROR',
      error: errorMessage,
    });
  }
}

export default handleAiRequest;
