# AI Email Agent 🤖✉️

A modern, intelligent workspace assistant designed for automated email triage, thread summarization, and smart draft generation.

> **Project Phase:** Milestone 6 — Voice AI Email Agent (Web Speech & SpeechSynthesis)

---

## 🛠️ Tech Stack

- **Frontend:** React 19 (JavaScript) + Vite 8
- **Voice Input (STT):** Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
- **Voice Output (TTS):** Browser `SpeechSynthesis` & `SpeechSynthesisUtterance`
- **AI Orchestration:** Google Genkit (`genkit@1.42.0`)
- **AI Model:** Google Gemini (Gemini 2.5 Flash via `@genkit-ai/google-genai`)
- **Authentication & Backend:** Firebase Web SDK (v11) & Firebase Cloud Functions
- **APIs:** Google OAuth 2.0 & Gmail REST API v1 (`https://www.googleapis.com/auth/gmail.modify`)
- **Styling:** Vanilla CSS (Modern glassmorphic dark theme tokens & sound wave animations)
- **Security:** Zero client secrets in frontend; `GEMINI_API_KEY` stored exclusively on server
- **Safety Safeguard:** Mandatory explicit confirmation before sending emails, replies, or deleting

---

## 📁 Project Architecture & File Structure

```text
ai-email-agent/
├── .env                              # Local frontend Firebase configuration keys (ignored by Git)
├── .env.example                      # Template config for frontend
├── .gitignore                        # Protects sensitive files (.env, functions/.env, node_modules)
├── firebase.json                     # Firebase deployment configuration for Cloud Functions
├── index.html                        # HTML entry point with Google Fonts (Inter)
├── package.json                      # Frontend dependencies (React 19, Firebase v11, Vite, Genkit)
├── vite.config.js                    # Vite configuration with Genkit AI dev server middleware
├── server/                           # Server-Side Genkit AI Orchestration
│   ├── genkit.js                     # Genkit configuration & secure server key loader
│   ├── router.js                     # Dispatcher for /api/ai/* endpoints with timeout handling
│   ├── server.js                     # Optional standalone Node.js HTTP server
│   └── flows/                        # Dedicated Genkit AI Flows
│       ├── summarizeEmail.js         # Feature A: 3-5 bullet point executive email summary
│       ├── categorizeEmail.js        # Feature B: 7-category triage classification
│       ├── suggestReplies.js         # Feature C: 3 draft replies (Professional, Friendly, Short)
│       ├── askAboutEmail.js          # Feature D: Grounded email Q&A assistant
│       └── index.js                  # Central flow exports
├── functions/                        # Firebase Cloud Functions Architecture
│   ├── package.json                  # Server dependencies (firebase-admin, genkit, @genkit-ai/google-genai)
│   ├── index.js                      # Exports callable Genkit Cloud Functions
│   ├── .env                          # Server-only env (holds GEMINI_API_KEY & GOOGLE_CLIENT_SECRET)
│   └── .env.example                  # Server-only env template
└── src/
    ├── main.jsx                      # 🔄 UPDATED: Wraps App with Auth, Gmail & VoiceProvider
    ├── App.jsx                       # 🔄 UPDATED: Mounts Dashboard & VoiceAssistantPanel
    ├── index.css                     # Global reset, typography, and theme tokens
    ├── App.css                       # 🔄 UPDATED: Added Voice Assistant modal & sound wave styles
    ├── firebase/
    │   ├── config.js                 # Firebase App & Auth initialization from Vite env
    │   └── authService.js            # Modular Auth functions (Sign-In, Logout, State listener)
    ├── services/
    │   ├── gmailAuthService.js       # Gmail OAuth authorization with restricted modify scope
    │   ├── gmailApiService.js        # Message listing, batch details & MIME base64url decoding
    │   ├── gmailActionsService.js    # Send, reply, mark read/unread, star, trash
    │   ├── aiEmailService.js         # Client service calling /api/ai/* endpoints
    │   ├── voiceService.js           # ✨ NEW (Step 6): Web Speech API recognizer & synthesizer
    │   └── voiceCommandService.js    # ✨ NEW (Step 6): Intent parser & dialog state machine
    ├── context/
    │   ├── AuthContext.jsx           # Global user authentication state
    │   ├── GmailContext.jsx          # Action states, optimistic updates & handlers
    │   └── VoiceContext.jsx          # ✨ NEW (Step 6): Voice engine, dialog flows & speech state
    └── components/
        ├── Navbar.jsx                # 🔄 UPDATED: Added Voice Assistant toggle button
        ├── LoginPage.jsx             # Clean login card with Google Sign-In
        ├── Dashboard.jsx             # 🔄 UPDATED: Displays Step 6 roadmap & viva quick reference
        ├── GmailConnectCard.jsx      # Dedicated "Connect Gmail" panel with real-time feedback
        ├── InboxSection.jsx          # Wrapper switching between list and detail view + ComposeModal
        ├── InboxList.jsx             # Inbox list with quick star, read toggles & compose button
        ├── EmailDetail.jsx           # Embeds AiAssistantPanel & feeds reply drafts into ReplyBox
        ├── AiAssistantPanel.jsx      # Interactive AI command center (Gemini + Genkit)
        ├── VoiceAssistantPanel.jsx   # ✨ NEW (Step 6): Complete Voice AI Assistant interface
        ├── ComposeModal.jsx          # Compose email dialog (To, Cc, Bcc, Subject, Body)
        ├── ReplyBox.jsx              # Supports inserting AI and voice reply drafts
        └── ConfigAlert.jsx           # Setup guide banner shown when credentials need setup
```

---

## 🎙️ Natural Conversational Voice AI Email Agent (Step 6 Upgrade)

### 1. Dual-Layer Conversational Intelligence Architecture
- **Natural Language Reasoning Layer**: Powered by Google Genkit + Gemini (`server/flows/voiceAgent.js`). Users speak naturally without memorizing fixed command syntax (e.g. *"Send a mail to Rahul regarding tomorrow's meeting"*).
- **Multi-Turn Session Memory**: Maintains conversational context across turns, automatically detects missing information (e.g. asking *"What would you like me to tell Rahul?"*), remembers recipients and subjects, and supports in-flight draft edits (e.g. *"Actually change the time to 11 AM"*).
- **Native Browser Speech Pipeline**:
  - Voice Input (STT): Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
  - Voice Output (TTS): Browser `window.speechSynthesis` and `SpeechSynthesisUtterance`.
  - Zero paid speech APIs.
- **Resilient Dual-Layer Execution**: Uses Gemini as the primary reasoning engine with an instant deterministic client-side fallback parser for zero-downtime offline support.

### 2. Conversational Capabilities & Examples
1. **Multi-Turn Compose**:
   - Turn 1: *"Send a mail to Rahul regarding tomorrow's meeting."* -> Agent asks: *"Sure. What would you like me to tell Rahul?"*
   - Turn 2: *"Tell him I'll attend at 10 AM and ask him to share the agenda."* -> Agent prepares draft and asks: *"I've prepared the email to Rahul. Would you like me to send it?"*
   - Turn 3: *"Yes."* -> Sends email via Gmail API!
2. **Single-Turn Natural Compose**:
   - *"Send Rahul an email saying the project is complete."* -> Detects both recipient and message, does **not** ask for message again, prepares draft immediately, and requests confirmation.
3. **In-Flight Draft Modifications**:
   - *"Actually change the time to 11 AM."* -> Dynamically updates the active draft message without starting over.
4. **Context-Aware Reply**:
   - When viewing an email: *"Reply to this email saying I'll attend."* -> Uses current thread, sender, and subject, creates reply, and requests confirmation.
5. **Context-Aware Email Reading & Summaries**:
   - *"Read my latest email"*, *"Read this email"* -> Spoken playback via SpeechSynthesis.
   - *"Summarize this email"* / *"Summarize this"* -> Grounded Gemini 3-bullet summary spoken aloud.
6. **Inbox Search & Unread Status**:
   - *"Show my unread emails"*, *"Find emails from Rahul"*, *"Show emails about project"*.
7. **Email Q&A**:
   - *"What is this email about?"*, *"When is the deadline?"*, *"What action do I need to take?"*.

### 3. Visual Email Draft Preview (Requirement 8)
Before any email is sent, the Voice Assistant UI renders a dedicated visual draft preview card showing:
- **To**: Recipient email address
- **Subject**: Contextual subject line
- **Message**: Complete body text
- **Action Buttons**: `[🚀 Send Email]` and `[✕ Cancel]` alongside voice confirmation.

### 4. Human Confirmation Safeguard (Requirement H)
The voice agent strictly enforces a human-in-the-loop rule before any externally visible or destructive Gmail operation:
- **Send Email / Send Reply**: Requires explicit affirmative confirmation (*"Yes"*, *"Send it"*, *"Confirm"*).
- **Move to Trash (Delete)**: Requires explicit affirmative confirmation before deleting.
- **Cancellation**: Saying *"No"*, *"Cancel"*, *"Cancel that"*, or *"Don't send"* immediately aborts the pending action safely.

---

## 🤖 AI Email Features Architecture (Step 5)

### 1. AI Email Summary (`summarizeEmail`)
- **Flow**: `ai.defineFlow('summarizeEmail')` analyzes the email body and generates:
  - A 1-2 sentence executive overview.
  - Exactly 3 to 5 clear bullet points detailing facts, deadlines, or requested actions.
- **Non-Destructive**: Displays inside `EmailDetail.jsx` without modifying the original email.

### 2. AI Email Category (`categorizeEmail`)
- **Flow**: `ai.defineFlow('categorizeEmail')` classifies emails into one of 7 categories:
  - `Important`, `Work`, `Personal`, `Promotion`, `Finance`, `Social`, `Other`.
- **UI**: Renders a color-coded category badge with confidence score and a 1-sentence reasoning summary.

### 3. AI Reply Suggestions (`suggestReplies`)
- **Flow**: `ai.defineFlow('suggestReplies')` generates 3 distinct contextual drafts:
  1. **Professional**: Formal, business-appropriate.
  2. **Friendly**: Warm, conversational, collaborative.
  3. **Short**: Concise 1-2 sentence acknowledgment.
- **Workflow**: Clicking "Use Draft" automatically populates the text into `ReplyBox.jsx`. Suggestions are **never** auto-sent, keeping the user in full control.

### 4. Ask AI About Email (`askAboutEmail`)
- **Flow**: `ai.defineFlow('askAboutEmail')` answers user questions strictly grounded in the email content.
- **Suggested Prompts**: Provides quick-click pills:
  - *"What is this email about?"*
  - *"What action do I need to take?"*
  - *"What is the deadline?"*
  - *"Who sent this email?"*
  - *"What are the important points?"*
- **Grounded Verification**: Flags whether the requested information was explicitly present in the email or absent.

### 5. Server-Side Security & Key Storage
- **Zero Client Exposure**: The Gemini API key is never bundled into Vite or exposed to browser network requests.
- **Storage Location**: Stored on the server in `functions/.env` (or server environment variables) under `GEMINI_API_KEY`.
- **API Proxy**: In local development, `vite.config.js` mounts `genkitAiDevPlugin` to route `/api/ai/*` directly to server flows in Node.js. In production, `functions/index.js` exports callable Cloud Functions.

---

## ⚡ Email Actions Architecture (Step 4)

### 1. Compose & Send (`POST /messages/send`)
- **RFC 2822 Format**: Formats valid email headers (`To:`, `Cc:`, `Bcc:`, `Subject:`, `Date:`, `Content-Type: text/plain; charset="UTF-8"`).
- **RFC 2047 Subject**: Encodes non-ASCII characters in subjects as `=?UTF-8?B?...?=` so international characters and emojis render properly across all email clients.
- **base64url Encoding**: Uses `TextEncoder` with URL-safe base64 encoding (`+` -> `-`, `/` -> `_`, trim `=`) as required by the Gmail API payload `{ raw: "..." }`.

### 2. Thread-Aware Replies (`In-Reply-To` + `References` + `threadId`)
- Preserves the conversation history by attaching the original `threadId` at the top level of the request payload.
- Injects standard RFC 2822 threading headers:
  - `In-Reply-To: <original-message-id>`
  - `References: <original-message-id>`
- Automatically populates the recipient from the original sender and prefixes the subject with `Re: ` if not already present.

### 3. Mark Read / Unread (`POST /messages/{id}/modify`)
- Calls the Gmail modify endpoint using the existing `gmail.modify` scope:
  - **Mark as Read**: `{ removeLabelIds: ["UNREAD"] }`
  - **Mark as Unread**: `{ addLabelIds: ["UNREAD"] }`
- State updates optimistically in the UI with instant feedback and automatic rollback upon error.

### 4. Star / Unstar (`POST /messages/{id}/modify`)
- Toggles the `STARRED` system label:
  - **Star**: `{ addLabelIds: ["STARRED"] }`
  - **Unstar**: `{ removeLabelIds: ["STARRED"] }`
- Star icon reflects the change immediately both in the email row and in the detail reader.

### 5. Delete / Move to Trash (`POST /messages/{id}/trash`)
- Displays an accessible confirmation dialog before performing the deletion.
- Moves the email safely to Gmail Trash using the official `/trash` endpoint (allowing 30-day recovery in Gmail).
- Removes the email immediately from the inbox list and redirects back to the list view.

---

## 🔍 How Gmail Messages Are Retrieved & Decoded (Step 3)

### 1. Message Listing & Detail Retrieval
- **Listing**: The app issues a `GET https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox` request using the active Google OAuth access token.
- **Batch Details**: It retrieves the message IDs and queries `GET /messages/{id}?format=full` in parallel via `Promise.all()`.
- **Headers Parsed**: `Subject`, `From`, `To`, `Date`, and `Message-ID` are extracted from the payload headers array.
- **Labels Tracked**: Reads `UNREAD` and `STARRED` labels.

### 2. URL-Safe Base64 (base64url) & UTF-8 Decoding
The `decodeBase64Url()` utility translates `-` to `+`, `_` to `/`, pads with `=`, and uses `TextDecoder("utf-8")` to cleanly parse emojis and international text.

### 3. Recursive MIME Tree Traversal
Recursively traverses `multipart/alternative`, `multipart/mixed`, and `multipart/related` parts to find the best representation (`text/html` or `text/plain`).

---

## 🚀 Running the Project

```bash
# 1. Install frontend dependencies
npm install

# 2. Run the Vite development server
npm run dev
```

Visit: `http://localhost:5173/`
