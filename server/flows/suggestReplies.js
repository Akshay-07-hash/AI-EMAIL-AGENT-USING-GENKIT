// server/flows/suggestReplies.js
// ============================================================================
// Genkit Flow: suggestReplies (Feature C)
// ============================================================================
// Generates 3 contextual reply drafts (Professional, Friendly, Short)
// that can be inserted into the existing ReplyBox for user editing.
// Note: Suggestions are NEVER sent automatically.
// ============================================================================

import { z } from 'genkit';
import { ai, DEFAULT_GEMINI_MODEL, getGeminiApiKey } from '../genkit.js';

export const SuggestRepliesInputSchema = z.object({
  emailContent: z.string().describe('The plain text body of the incoming email'),
  subject: z.string().optional().describe('Email subject line'),
  sender: z.string().optional().describe('Sender name or email address'),
});

export const SuggestRepliesOutputSchema = z.object({
  replies: z.object({
    professional: z.string().describe('A polite, formal, and business-appropriate reply draft'),
    friendly: z.string().describe('A warm, collaborative, and friendly reply draft'),
    short: z.string().describe('A concise 1-2 sentence quick response or acknowledgment draft'),
  }),
  contextSummary: z.string().optional().describe('Brief context note considered by the AI'),
});

export const suggestReplies = ai.defineFlow(
  {
    name: 'suggestReplies',
    inputSchema: SuggestRepliesInputSchema,
    outputSchema: SuggestRepliesOutputSchema,
  },
  async (input) => {
    const rawContent = (input.emailContent || '').trim();
    if (!rawContent) {
      throw new Error('Email content is empty. Cannot generate reply drafts without message text.');
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error(
        'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to functions/.env on the server.'
      );
    }

    const promptText = `
You are an expert AI Email Assistant. Generate 3 distinct, contextual reply drafts to the following email:

Subject: ${input.subject || '(No Subject)'}
Sender: ${input.sender || 'Unknown'}

Email Body:
${rawContent.slice(0, 6000)}

Generate exactly three versions:
1. "professional": Formal, polite, well-structured, business-appropriate.
2. "friendly": Warm, collegial, appreciative, easygoing.
3. "short": Ultra-concise, 1 to 2 sentences acknowledging the message or confirming the requested action.

Guidelines:
- Write in the first person ("I" or "We").
- Do NOT use generic placeholders like "[Your Name]" or "[Insert Date]". Write natural drafts that are ready to read and edit.
- Address the sender politely when appropriate.
`;

    try {
      const response = await ai.generate({
        model: DEFAULT_GEMINI_MODEL,
        prompt: promptText,
        output: {
          schema: SuggestRepliesOutputSchema,
        },
      });

      if (response.output) {
        return response.output;
      }

      return {
        replies: {
          professional: 'Thank you for your email. I have reviewed the details and will follow up with you shortly.',
          friendly: 'Thanks so much for reaching out! I appreciate the update and will get back to you soon.',
          short: 'Received, thank you! I will review this and get back to you.',
        },
      };
    } catch (err) {
      console.error('[Genkit suggestReplies error]:', err);
      throw new Error(err.message || 'Failed to generate reply suggestions using Gemini AI.');
    }
  }
);

export default suggestReplies;
