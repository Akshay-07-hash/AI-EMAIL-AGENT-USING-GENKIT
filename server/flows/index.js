// server/flows/index.js
// ============================================================================
// Genkit AI Email Flows Export
// ============================================================================
// Central export for all modular Genkit flows used by AI Email Agent:
// 1. summarizeEmail (Feature A)
// 2. categorizeEmail (Feature B)
// 3. suggestReplies (Feature C)
// 4. askAboutEmail (Feature D)
// ============================================================================

export { summarizeEmail } from './summarizeEmail.js';
export { categorizeEmail, EMAIL_CATEGORIES } from './categorizeEmail.js';
export { suggestReplies } from './suggestReplies.js';
export { askAboutEmail } from './askAboutEmail.js';
export { voiceAgent } from './voiceAgent.js';
