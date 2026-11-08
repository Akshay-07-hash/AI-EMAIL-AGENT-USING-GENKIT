// server/flows/askAboutEmail.js
// ============================================================================
// Genkit Flow: askAboutEmail (Feature D)
// ============================================================================
// Answers arbitrary user questions about a specific email using Gemini,
// grounding answers strictly in the email content.
// ============================================================================

import { z } from 'genkit';
import { ai, DEFAULT_GEMINI_MODEL, getGeminiApiKey } from '../genkit.js';

export const AskAboutEmailInputSchema = z.object({
  emailContent: z.string().describe('The plain text body of the email'),
  question: z.string().describe('The user question about this email'),
  subject: z.string().optional().describe('Email subject line'),
  sender: z.string().optional().describe('Sender name or email address'),
});

export const AskAboutEmailOutputSchema = z.object({
  answer: z.string().describe('Direct, clear answer to the user question based on the email content'),
  foundInEmail: z.boolean().describe('True if the answer was explicitly found in the email, false if absent or uncertain'),
  actionRecommendation: z.string().optional().describe('Optional recommended action based on the question'),
});

export const askAboutEmail = ai.defineFlow(
  {
    name: 'askAboutEmail',
    inputSchema: AskAboutEmailInputSchema,
    outputSchema: AskAboutEmailOutputSchema,
  },
  async (input) => {
    const rawContent = (input.emailContent || '').trim();
    const userQuestion = (input.question || '').trim();

    if (!userQuestion) {
      throw new Error('Please enter a question to ask about this email.');
    }

    if (!rawContent) {
      throw new Error('Email body is empty. Cannot analyze an email with no content.');
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error(
        'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to functions/.env on the server.'
      );
    }

    const promptText = `
You are an intelligent email question-answering assistant. Answer the user's question directly, accurately, and concisely based strictly on the email provided below.

Email Details:
Subject: ${input.subject || '(No Subject)'}
Sender: ${input.sender || 'Unknown'}

Email Body:
${rawContent.slice(0, 8000)}

User Question:
"${userQuestion}"

Instructions:
1. Provide a direct, helpful answer to the question in "answer".
2. If the answer is found in the email, set "foundInEmail" to true.
3. If the email does NOT mention or contain the requested information, set "foundInEmail" to false and politely inform the user that the information is not present in this email.
4. If applicable, provide a short "actionRecommendation".
`;

    try {
      const response = await ai.generate({
        model: DEFAULT_GEMINI_MODEL,
        prompt: promptText,
        output: {
          schema: AskAboutEmailOutputSchema,
        },
      });

      if (response.output) {
        return response.output;
      }

      return {
        answer: response.text || 'No answer could be generated.',
        foundInEmail: true,
      };
    } catch (err) {
      console.error('[Genkit askAboutEmail error]:', err);
      throw new Error(err.message || 'Failed to answer question about email using Gemini AI.');
    }
  }
);

export default askAboutEmail;
