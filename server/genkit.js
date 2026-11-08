// server/genkit.js
// ============================================================================
// Google Genkit + Gemini AI Configuration (Server-Side)
// ============================================================================
// ACADEMIC & SECURITY ARCHITECTURE:
// 1. Google Genkit is used as the orchestration framework for generative AI.
// 2. The Gemini model (e.g., gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash)
//    is connected via @genkit-ai/google-genai.
// 3. CRITICAL SECURITY:
//    The GEMINI_API_KEY is loaded strictly in Node.js on the server side.
//    It is NEVER exposed in the React frontend bundle or in VITE_ environment variables.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Loads server-side environment variables from functions/.env or .env.server
 * if they are not already set in process.env.
 */
export function loadServerEnv() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'functions/.env'),
    path.resolve(process.cwd(), '.env.server'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const varName = key.trim();
            const varValue = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            if (varValue) {
              process.env[varName] = varValue;
              if (varName === 'GEMINI_API_KEY') {
                process.env.GOOGLE_GENAI_API_KEY = varValue;
                process.env.GOOGLE_API_KEY = varValue;
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[Genkit Server] Warning reading ${envPath}:`, err.message);
      }
    }
  }
}

// Load server variables on startup
loadServerEnv();

/**
 * Retrieves the configured Gemini API key from server environment.
 * @returns {string|null}
 */
export function getGeminiApiKey() {
  loadServerEnv();
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

/**
 * Target Gemini model for Genkit flows.
 * Uses gemini-3.5-flash-lite by default for fast, high-quality reasoning.
 */
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'googleai/gemini-3.5-flash-lite';

/**
 * Initializes and exports the singleton Genkit AI instance.
 */
const apiKey = getGeminiApiKey();

export const ai = genkit({
  plugins: [
    googleAI(apiKey ? { apiKey } : {}),
  ],
  model: DEFAULT_GEMINI_MODEL,
});

export default ai;
