// server/flows/summarizeEmail.js
// ============================================================================
// Genkit Flow: summarizeEmail (Feature A)
// ============================================================================
// Generates a clean 3-5 bullet point executive summary of an email
// without modifying the original email body.
// ============================================================================

import { z } from 'genkit';
import { ai, DEFAULT_GEMINI_MODEL, getGeminiApiKey } from '../genkit.js';

export const SummarizeEmailInputSchema = z.object({
  emailContent: z.string().describe('The plain text body or decoded content of the email'),
  subject: z.string().optional().describe('Email subject line'),
  sender: z.string().optional().describe('Sender name or email address'),
});

export const SummarizeEmailOutputSchema = z.object({
  summary: z.string().describe('A crisp 1-2 sentence overview of the email'),
  bulletPoints: z.array(z.string()).describe('3 to 5 clear bullet points detailing key facts, deadlines, or actions'),
  modelUsed: z.string().optional().describe('The model that generated this summary'),
});

export const summarizeEmail = ai.defineFlow(
  {
    name: 'summarizeEmail',
    inputSchema: SummarizeEmailInputSchema,
    outputSchema: SummarizeEmailOutputSchema,
  },
  async (input) => {
    const rawContent = (input.emailContent || '').trim();
    if (!rawContent) {
      throw new Error('Email content is empty. Cannot summarize an email without readable body text.');
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error(
        'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to functions/.env on the server.'
      );
    }

    const promptText = `
You are an expert AI Email Assistant. Analyze the following email message and generate a clear, concise summary for a busy professional.

Subject: ${input.subject || '(No Subject)'}
Sender: ${input.sender || 'Unknown'}

Email Body:
${rawContent.slice(0, 8000)}

Requirements:
1. Provide a crisp 1 to 2 sentence executive overview in "summary".
2. Provide exactly 3 to 5 informative bullet points in "bulletPoints".
3. Highlight any critical actions, dates, deadlines, or questions requiring response.
4. Keep the tone professional, objective, and easy to skim.
`;

    try {
      const response = await ai.generate({
        model: DEFAULT_GEMINI_MODEL,
        prompt: promptText,
        output: {
          schema: SummarizeEmailOutputSchema,
        },
      });

      if (response.output) {
        return {
          ...response.output,
          modelUsed: DEFAULT_GEMINI_MODEL,
        };
      }

      // Fallback in case raw text was returned
      const text = response.text || '';
      return {
        summary: text.slice(0, 160) || 'Summary generated.',
        bulletPoints: text
          .split('\n')
          .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
          .filter((line) => line.length > 5)
          .slice(0, 5),
        modelUsed: DEFAULT_GEMINI_MODEL,
      };
    } catch (err) {
      console.error('[Genkit summarizeEmail error]:', err);
      throw new Error(err.message || 'Failed to summarize email using Gemini AI.');
    }
  }
);

export default summarizeEmail;
