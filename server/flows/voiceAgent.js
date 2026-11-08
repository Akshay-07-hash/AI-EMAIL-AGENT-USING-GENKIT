// server/flows/voiceAgent.js
// ============================================================================
// Genkit Flow: voiceAgent (Natural Conversational Voice Reasoning)
// ============================================================================
// ACADEMIC & SAFETY ARCHITECTURE:
// 1. Natural Language Intent & Entity Extraction:
//    Transforms free-form conversational user speech into structured email actions.
// 2. Multi-Turn Conversational Memory:
//    Maintains session context across turns (resolving pronouns, remembering recipients,
//    filling missing slots, and updating pending drafts).
// 3. Strict Human-in-the-Loop Safeguards:
//    Enforces explicit confirmation before any external/destructive Gmail operation.
// 4. Grounded Spoken-Friendly Responses:
//    Produces natural, concise spoken text for browser SpeechSynthesis.
// ============================================================================

import { z } from 'genkit';
import { ai, DEFAULT_GEMINI_MODEL, getGeminiApiKey } from '../genkit.js';

export const VoiceAgentInputSchema = z.object({
  utterance: z.string().describe('The user spoken speech transcript'),
  emailContext: z
    .object({
      id: z.string().optional(),
      threadId: z.string().optional(),
      subject: z.string().optional(),
      senderName: z.string().optional(),
      senderEmail: z.string().optional(),
      snippet: z.string().optional(),
      body: z.string().optional(),
    })
    .optional()
    .describe('Currently selected or active email in the client view'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'agent']),
        text: z.string(),
      })
    )
    .optional()
    .describe('Recent conversation turns in the current voice session'),
  currentState: z
    .object({
      activeAction: z.string().optional(), // 'SEND_EMAIL' | 'REPLY_EMAIL' | 'DELETE_EMAIL'
      step: z.string().optional(), // 'AWAITING_MESSAGE', 'AWAITING_RECIPIENT', 'AWAITING_SUBJECT', 'CONFIRM'
      draft: z
        .object({
          to: z.string().optional(),
          subject: z.string().optional(),
          message: z.string().optional(),
          threadId: z.string().optional(),
        })
        .optional(),
      lastReferencedEmail: z
        .object({
          id: z.string().optional(),
          sender: z.string().optional(),
          subject: z.string().optional(),
        })
        .optional(),
      lastAction: z.string().optional(),
    })
    .optional()
    .describe('Current pending dialog state machine, draft data, and last context reference'),
  inboxSummary: z
    .array(
      z.object({
        id: z.string(),
        sender: z.string().optional(),
        subject: z.string().optional(),
        isUnread: z.boolean().optional(),
        date: z.string().optional(),
      })
    )
    .optional()
    .describe('Summary list of latest messages in inbox'),
});

export const VoiceAgentOutputSchema = z.object({
  detectedLanguage: z
    .string()
    .describe(
      'Detected language and dialect of the user utterance (e.g. "English", "Tamil", "Tamil (Tanglish)", "Hindi", "Hindi (Hinglish)", "Telugu", "Malayalam", "Kannada", etc.)'
    ),
  languageCode: z
    .string()
    .describe('ISO language code for speech synthesis (e.g. "en", "ta", "hi", "te", "ml", "kn", etc.)'),
  intent: z
    .enum([
      'SEND_EMAIL',
      'REPLY_EMAIL',
      'READ_EMAIL',
      'SUMMARIZE_EMAIL',
      'SHOW_UNREAD',
      'FIND_EMAILS',
      'DELETE_EMAIL',
      'STAR_EMAIL',
      'MARK_READ',
      'MARK_UNREAD',
      'ASK_ABOUT_EMAIL',
      'UPDATE_DRAFT',
      'CONFIRM',
      'CANCEL',
      'UNKNOWN',
    ])
    .describe('Classified high-level intent'),
  entities: z
    .object({
      recipientReference: z
        .string()
        .optional()
        .describe(
          'Whatever recipient reference the user provides: email address, person name, nickname, contact, role (e.g. my manager), department/team (e.g. the HR team), or context reference'
        ),
      recipient: z
        .string()
        .optional()
        .describe('Direct alias for recipientReference'),
      subject: z.string().optional().describe('Subject line'),
      message: z.string().optional().describe('Body message or reply content'),
      query: z.string().optional().describe('Search query or question text'),
      target: z.string().optional().describe('"selected" | "latest" | identifier'),
    })
    .describe('Extracted semantic entities'),
  missingInformation: z
    .array(z.string())
    .describe('List of missing mandatory parameters: ["recipient"], ["message"], or [] if complete'),
  response: z
    .string()
    .describe('Conversational spoken text for the agent to speak aloud to the user in the appropriate language'),
  requiresConfirmation: z
    .boolean()
    .describe('True if this action requires explicit user confirmation before executing'),
  draft: z
    .object({
      to: z.string().optional(),
      subject: z.string().optional(),
      message: z.string().optional(),
      threadId: z.string().optional(),
    })
    .optional()
    .describe('Complete or in-progress email draft'),
  actionToExecute: z
    .string()
    .optional()
    .describe('Action name if ready to execute: SEND | REPLY | DELETE | READ | SUMMARIZE | SEARCH | SHOW_UNREAD'),
});

export const voiceAgent = ai.defineFlow(
  {
    name: 'voiceAgent',
    inputSchema: VoiceAgentInputSchema,
    outputSchema: VoiceAgentOutputSchema,
  },
  async (input) => {
    const userUtterance = (input.utterance || '').trim();
    if (!userUtterance) {
      return {
        detectedLanguage: 'English',
        languageCode: 'en',
        intent: 'UNKNOWN',
        entities: {},
        missingInformation: [],
        response: "I didn't hear anything. Please click the microphone and speak.",
        requiresConfirmation: false,
      };
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error(
        'Gemini API key is not configured on the server. Please add GEMINI_API_KEY to functions/.env on the server.'
      );
    }

    // Build system prompt with all context
    const historyText = (input.conversationHistory || [])
      .slice(-8)
      .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
      .join('\n');

    const emailCtx = input.emailContext;
    const emailCtxText = emailCtx
      ? `Selected Email:
- ID: ${emailCtx.id || 'N/A'}
- Sender: ${emailCtx.senderName || emailCtx.senderEmail || 'N/A'} (${emailCtx.senderEmail || ''})
- Subject: ${emailCtx.subject || 'No Subject'}
- ThreadId: ${emailCtx.threadId || ''}
- Snippet: ${(emailCtx.snippet || '').slice(0, 300)}
- Body Preview: ${(emailCtx.body || '').slice(0, 500)}`
      : 'No email currently selected.';

    const stateCtx = input.currentState;
    const pendingDraft = stateCtx?.draft;
    const lastRefEmail = stateCtx?.lastReferencedEmail;
    const lastAction = stateCtx?.lastAction;
    const stateCtxText = stateCtx
      ? `Active Action: ${stateCtx.activeAction || 'None'}
Step: ${stateCtx.step || 'Idle'}
Pending Draft: ${pendingDraft ? JSON.stringify(pendingDraft) : 'None'}
Last Referenced Email: ${lastRefEmail ? JSON.stringify(lastRefEmail) : 'None'}
Last Context Action: ${lastAction || 'None'}`
      : 'No active multi-turn action.';

    const inboxListText = (input.inboxSummary || [])
      .slice(0, 5)
      .map(
        (m, idx) =>
          `${idx + 1}. From: ${m.sender || 'Unknown'}, Subject: '${m.subject || 'No Subject'}', Unread: ${
            m.isUnread ? 'YES' : 'NO'
          }, ID: ${m.id}`
      )
      .join('\n');

    const promptText = `
You are the reasoning core of an advanced MULTILINGUAL conversational AI Email Voice Agent.
The user interacts with you primarily using spoken voice in any language they choose.
Your job is to analyze the user's latest utterance, detect the spoken language, understand their semantic intent regardless of language or script, extract all relevant entities, track multi-turn conversation memory across languages, detect any missing information, and formulate a clear, spoken-friendly response adapted to the user's language.

### CONTEXT:
[Recent Conversation History]:
${historyText || '(No previous turns in this session)'}

[Current State & Pending Draft]:
${stateCtxText}

[Inbox Messages Preview]:
${inboxListText || '(No inbox messages provided)'}

[Currently Active/Selected Email]:
${emailCtxText}

[User Spoken Utterance]:
"${userUtterance}"

---

### MULTILINGUAL & CODE-SWITCHING RULES (CRITICAL):

1. UNIVERSAL LANGUAGE UNDERSTANDING (NO FIXED COMMANDS):
   - The user can speak in ANY language: English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Malayalam (മലയാളം), Kannada (ಕನ್ನಡ), Bengali, Marathi, Gujarati, Spanish, French, German, or any other language.
   - The user can speak in NATIVE SCRIPT (e.g. "பிரியாவுக்கு ஒரு மெயில் அனுப்பு", "प्रिया को ईमेल भेजो") OR ROMANIZED TRANSLITERATION / CODE-SWITCHING (e.g. Tanglish: "Priya-ku oru mail anuppu, meeting nalaiku irukku", Hinglish: "Priya ko ek email bhejo, meeting kal hai", "Priya-ku oru mail send pannu, meeting tomorrow irukku").
   - Understand the underlying SEMANTIC MEANING. All of the above mean: Intent = SEND_EMAIL, recipient = "Priya", message = "meeting is tomorrow".
   - Set "detectedLanguage" to the name of the language (e.g. "English", "Tamil", "Tamil (Tanglish)", "Hindi", "Hindi (Hinglish)", "Telugu", "Malayalam", "Kannada", etc.).
   - Set "languageCode" to the ISO 639-1 code (e.g. "en", "ta", "hi", "te", "ml", "kn", "es", "fr", "de", etc.) so client speech synthesis can pick the matching voice.

2. MULTI-TURN CONVERSATION MEMORY ACROSS LANGUAGES:
   - The user may switch languages during the same conversation!
   - Example 1:
     * User speaks Tamil: "Priya-ku oru mail anuppu."
     * AI responds in Tamil: "என்ன message அனுப்ப வேண்டும்?" (or "Sure. What would you like me to tell Priya?")
     * User then speaks English: "Tell her that the meeting is tomorrow."
     * AI MUST understand: "her" refers to Priya from Turn 1!
   - Example 2:
     * User: "Send a mail to my manager."
     * AI: "Sure. What would you like me to tell your manager?"
     * User (Hindi): "Use bolo kal meeting 10 baje hai."
     * AI MUST understand: "use" refers to "my manager" and message is "meeting is tomorrow at 10 AM".
   - Example 3 (Active Draft Combination Across Languages):
     * Turn 1: "Send a mail to Priya."
     * Turn 2: "Subject meeting update."
     * Turn 3 (Tanglish): "Message-la tomorrow 5 PM nu sollu."
     * AI combines all 3 into one draft: { to: "Priya", subject: "meeting update", message: "tomorrow 5 PM" }.

3. INTENT RECOGNITION:
   - "SEND_EMAIL": Composing a new email.
     * English: "Send a mail to Priya", "Tell her the meeting is tomorrow", "I need to tell my manager I'll be late".
     * Tamil / Tanglish: "Priya-ku oru mail anuppu", "Priya-ku mail send pannu, meeting nalaiku nu sollu", "Manager-ku oru mail podu".
     * Hindi / Hinglish: "Priya ko ek email bhejo", "Priya ko mail karo, meeting kal hai", "Manager ko email likho".
     * Telugu: "Priya ki email pampu, meeting repu undi".
     * Malayalam: "Priya-kku oru email ayakkuka, meeting naale aanu".
     * Kannada: "Priya-ge email kaluhisi, meeting naale ide".
   - "REPLY_EMAIL": Replying to an email.
     * English: "Reply to this email saying I'll attend", "Reply saying thanks".
     * Tamil: "Indha mail-ku reply pannu", "Varuven nu reply anuppu".
     * Hindi: "Is email ka reply karo", "Bolo main aaunga".
   - "READ_EMAIL": Reading an email.
     * English: "Read my latest email", "Read the latest one", "Read it".
     * Tamil: "Latest mail-ah padi", "Kadaisi mail-ah vaasi".
     * Hindi: "Latest email padho", "Naya email sunao".
   - "SUMMARIZE_EMAIL": Summarizing an email.
     * English: "Summarize it", "Summarize this email", "What is that email about?".
     * Tamil: "Indha mail-ah summarize pannu", "Idhula enna irukku nu sollu".
     * Hindi: "Is email ka summary batao", "Ye email kiske baare mein hai?".
   - "SHOW_UNREAD": Showing unread emails.
     * English: "Show my unread emails", "How many unread emails do I have?".
     * Tamil: "Padikaadha mail-ah kaattu", "Unread emails kaattu".
     * Hindi: "Unread emails dikhao", "Kitne unread emails hain?".
   - "FIND_EMAILS": Finding/searching emails.
     * "Find emails from Rahul", "Rahul anuppina mail-ah thedu", "Rahul ke emails dhoondo".
   - "DELETE_EMAIL": Deleting email with safeguard confirmation.
     * "Delete this email", "Indha mail-ah delete pannu", "Ye email delete karo".
   - "UPDATE_DRAFT": Modifying pending draft.
     * "Make the message shorter", "Message-ah short pannu", "Sandesh chhota karo".
     * "Change subject to X", "Subject-ah X nu maathu", "Subject X kar do".
     * "Actually change time to 6", "Time 6 nu maathu", "Samay 6 baje karo".
   - "CONFIRM": Affirmative confirmation in ANY language.
     * English: "Yes", "Send it", "Go ahead", "Confirm", "Sure", "Proceed", "Do it".
     * Tamil: "Aama", "Anuppu", "Sari", "Send pannu", "Anuppunga", "Seri", "ஆமா", "அனுப்பு", "சரி".
     * Hindi: "Haan", "Bhej do", "Sahi hai", "Theek hai", "Bhejo", "Bhej dijiye", "हाँ", "भेज दो", "भेजो", "ठीक है".
     * Telugu: "Avunu", "Pampu", "Sare", "అవును", "పంపు".
     * Malayalam: "Athe", "Ayakkoo", "Sari", "അതെ", "അയക്കൂ".
     * Kannada: "Haudu", "Kaluhisi", "Sari", "ಹೌದು", "ಕಳುಹಿಸಿ".
   - "CANCEL": Negative answers or cancellation in ANY language.
     * English: "No", "Don't send", "Cancel", "Stop", "Never mind".
     * Tamil: "Vendaam", "Illa", "Cancel pannu", "வேண்டாம்", "இல்லை".
     * Hindi: "Nahi", "Mat bhejo", "Roko", "Cancel karo", "नहीं", "मत भेजो".
     * Telugu: "Vaddhu", "Kadu", "వద్దు".
     * Malayalam: "Venda", "Alla", "വേണ്ട".
     * Kannada: "Beda", "ಬೇಡ".

4. DYNAMIC RECIPIENT RESOLUTION:
   - The recipient is completely dynamic. NEVER hardcode names (Priya, Rahul, Alex, etc. are only examples).
   - The user can name ANY person, email address, role ("my manager", "team lead"), or department ("the HR team").
   - Extract the reference into entities.recipientReference, entities.recipient, and draft.to.

5. ADAPTIVE SPOKEN RESPONSE (CRITICAL):
   - PREFER RESPONDING IN THE LANGUAGE CURRENTLY SPOKEN BY THE USER.
   - If user speaks Tamil or Tanglish: formulate natural spoken Tamil or polite Tanglish (e.g. "பிரியாவுக்கு என்ன செய்தி அனுப்ப வேண்டும்?", or "மின்னஞ்சல் தயார். அனுப்பவா?").
   - If user speaks Hindi or Hinglish: formulate natural spoken Hindi or polite Hinglish (e.g. "प्रिया को क्या संदेश भेजना है?", or "ईमेल तैयार है। क्या मैं इसे भेज दूं?").
   - If user speaks English: formulate natural spoken English (e.g. "Sure. What would you like me to tell Priya?", or "Here is the email prepared for Priya. Would you like me to send it?").
   - If user switches language in the next turn, adapt smoothly to the new language!
   - NO markdown formatting (no **, *, #, bullets, or backticks) in the response text because it will be spoken aloud by TTS.
   - Keep responses concise (1 to 2 sentences).

6. STRICT CONFIRMATION SAFEGUARDS:
   - NEVER set actionToExecute="SEND" or "REPLY" or "DELETE" without explicit confirmation.
   - When a draft is ready, response MUST ask for user confirmation in their language (e.g. "Would you like me to send it?", "அனுப்பவா?", "क्या मैं इसे भेज दूं?").
`;

    const candidateModels = [
      DEFAULT_GEMINI_MODEL,
      'googleai/gemini-3.5-flash-lite',
      'googleai/gemini-3.1-pro-preview',
      'googleai/gemini-2.5-flash',
    ];

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const result = await ai.generate({
          model,
          prompt: promptText,
          output: {
            schema: VoiceAgentOutputSchema,
          },
        });

        if (result.output) {
          return result.output;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[voiceAgent] Model ${model} failed, trying fallback:`, err.message);
      }
    }

    if (lastError) {
      console.error('[voiceAgent Flow Final Error]:', lastError);
      throw lastError;
    }

    return {
      detectedLanguage: 'English',
      languageCode: 'en',
      intent: 'UNKNOWN',
      entities: {},
      missingInformation: [],
      response: "I processed your request, but couldn't determine the next action.",
      requiresConfirmation: false,
    };
  }
);

export default voiceAgent;
