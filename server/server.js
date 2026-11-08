// server/server.js
// ============================================================================
// Standalone Genkit AI Server (Optional companion to Vite dev middleware)
// ============================================================================
// Can be executed with:
//   node server/server.js
// Runs on port 3001 (or process.env.PORT) and handles /api/ai/* endpoints.
// ============================================================================

import http from 'node:http';
import { handleAiRequest } from './router.js';
import { getGeminiApiKey, DEFAULT_GEMINI_MODEL } from './genkit.js';

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith('/api/ai')) {
    handleAiRequest(req, res);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Endpoint not found. Use /api/ai/*' }));
  }
});

server.listen(PORT, () => {
  const apiKeyPresent = Boolean(getGeminiApiKey());
  console.log(`\n======================================================`);
  console.log(`🤖 AI Email Agent - Genkit AI Server Running on http://localhost:${PORT}`);
  console.log(`⚡ Model: ${DEFAULT_GEMINI_MODEL}`);
  console.log(`🔑 Gemini API Key: ${apiKeyPresent ? 'Configured ✅' : 'Missing ⚠️ (Add to functions/.env)'}`);
  console.log(`📡 Endpoints: /api/ai/summarize, /api/ai/categorize, /api/ai/suggest-replies, /api/ai/ask`);
  console.log(`======================================================\n`);
});
