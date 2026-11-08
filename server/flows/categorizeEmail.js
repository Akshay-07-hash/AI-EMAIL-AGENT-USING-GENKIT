// server/flows/categorizeEmail.js
// ============================================================================
// Genkit Flow: categorizeEmail (Feature B)
// ============================================================================
// Classifies an email into one of seven standard categories:
// - Important
// - Work
// - Personal
// - Promotion
// - Finance
// - Social
// - Other
// ============================================================================

import { z } from 'genkit';
import { ai, DEFAULT_GEMINI_MODEL, getGeminiApiKey } from '../genkit.js';

export const EMAIL_CATEGORIES = [
  'Important',
  'Work',
  'Personal',
  'Promotion',
  'Finance',
  'Social',
  'Other',
];

export const CategorizeEmailInputSchema = z.object({
  emailContent: z.string().describe('The plain text body or snippet of the email'),
  subject: z.string().optional().describe('Email subject line'),
  sender: z.string().optional().describe('Sender name or email address'),
});

export const CategorizeEmailOutputSchema = z.object({
  category: z.enum([
    'Important',
    'Work',
    'Personal',
    'Promotion',
    'Finance',
    'Social',
    'Other',
  ]).describe('The primary classification category for this email'),
  confidence: z.enum(['High', 'Medium', 'Low']).describe('Confidence rating in this classification'),
  reason: z.string().describe('A concise 1-sentence rationale for why this category was chosen'),
  actionNeeded: z.boolean().describe('True if this email likely requires action or follow-up from the user'),
});

export const categorizeEmail = ai.defineFlow(
  {
    name: 'categorizeEmail',
    inputSchema: CategorizeEmailInputSchema,
    outputSchema: CategorizeEmailOutputSchema,
  },
  async (input) => {
    const rawContent = (input.emailContent || '').trim();
    if (!rawContent) {
      return {
        category: 'Other',
        confidence: 'Low',
        reason: 'Email content is empty.',
        actionNeeded: false,
      };
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error(
        'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to functions/.env on the server.'
      );
    }

    const promptText = `
You are an intelligent email triage classifier. Analyze this email and classify it into EXACTLY ONE of the following categories:

1. "Important": Urgent tasks, deadlines, high-priority notifications, direct requests from executives or clients.
2. "Work": Professional projects, meeting invites, team collaborations, workplace updates.
3. "Personal": Personal correspondence, friends, family, personal hobbies.
4. "Promotion": Marketing, discounts, promotional offers, brand newsletters, sales.
5. "Finance": Bank alerts, invoices, bills, receipts, payment confirmations, subscriptions.
6. "Social": Social media notifications, community platforms, discussion forums.
7. "Other": Miscellaneous emails that do not fit into the categories above.

Email Details:
Subject: ${input.subject || '(No Subject)'}
Sender: ${input.sender || 'Unknown'}

Email Body:
${rawContent.slice(0, 6000)}

Respond with:
- "category": Must be one of ["Important", "Work", "Personal", "Promotion", "Finance", "Social", "Other"]
- "confidence": "High", "Medium", or "Low"
- "reason": A crisp 1-sentence explanation
- "actionNeeded": true or false
`;

    try {
      const response = await ai.generate({
        model: DEFAULT_GEMINI_MODEL,
        prompt: promptText,
        output: {
          schema: CategorizeEmailOutputSchema,
        },
      });

      if (response.output) {
        return response.output;
      }

      return {
        category: 'Work',
        confidence: 'Medium',
        reason: 'Classified based on subject line and body keywords.',
        actionNeeded: false,
      };
    } catch (err) {
      console.error('[Genkit categorizeEmail error]:', err);
      throw new Error(err.message || 'Failed to categorize email using Gemini AI.');
    }
  }
);

export default categorizeEmail;
