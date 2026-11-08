// src/context/VoiceContext.jsx
// ============================================================================
// Real-Time Conversational AI Email Voice Agent Context (Hands-Free Live Voice)
// ============================================================================
// ARCHITECTURE & INTERACTION FLOW:
// 1. Live Conversational Voice (No Start/Stop Per Turn):
//    - User enables "Live Voice" once.
//    - Flow:
//        USER SPEAKS (Mic On, Live Transcript Streaming)
//        ↓
//        Natural Turn Detection (Silence debounce: ~1.2s, confirmation: ~0.65s)
//        ↓
//        Microphone Stops (MIC OFF, Thinking...)
//        ↓
//        Gemini + Genkit Multi-Turn Conversational Reasoning
//        ↓
//        AI Response Spoken via SpeechSynthesis (Speaking..., MIC REMAINS OFF)
//        ↓
//        Speech Ends → Microphone Automatically Restarts (Listening...)
//        ↓
//        USER SPEAKS NEXT TURN (Hands-Free multi-turn conversation)
// 2. Microphone Loop Prevention:
//    - Under no circumstances does the microphone pick up the AI's own voice.
//    - Recognition is explicitly stopped and muted before SpeechSynthesis starts,
//      and only reactivated after SpeechSynthesis has finished.
// 3. Natural Barge-In / Interruption:
//    - If the AI is speaking and the user begins speaking or presses Space/Escape,
//      SpeechSynthesis is cancelled instantly and the system switches to listening.
// 4. Multi-Turn Conversation Memory:
//    - Tracks recent dialogue history, pronoun references ("her" = Priya, "him" = manager),
//      active email draft modifications ("Make it shorter", "Change subject to X"),
//      and context-aware email navigation ("Show unread" → "Read the latest one" → "Summarize it").
// 5. Strict Confirmation Safeguards:
//    - External/destructive actions (Send, Reply, Delete) require explicit confirmation.
// ============================================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  createSpeechRecognizer,
  speechSynthesizer,
  detectSpokenLanguage,
} from "../services/voiceService";
import {
  parseVoiceIntent,
  isAffirmative,
  isNegative,
  normalizeSpokenEmail,
  formatEmailForReading,
  applyDraftUpdate,
} from "../services/voiceCommandService";
import { useGmail } from "./GmailContext";
import {
  summarizeEmailContent,
  askQuestionAboutEmail,
  processVoiceAgentMessage,
} from "../services/aiEmailService";

export const SUPPORTED_LANGUAGES = [
  { code: "auto", langTag: "en-IN", label: "Auto Detect / Multilingual", icon: "🌐" },
  { code: "ta-IN", langTag: "ta-IN", label: "Tamil (தமிழ்)", icon: "🇮🇳" },
  { code: "hi-IN", langTag: "hi-IN", label: "Hindi (हिन्दी)", icon: "🇮🇳" },
  { code: "en-IN", langTag: "en-IN", label: "English (India)", icon: "🇮🇳" },
  { code: "en-US", langTag: "en-US", label: "English (US)", icon: "🇺🇸" },
  { code: "te-IN", langTag: "te-IN", label: "Telugu (తెలుగు)", icon: "🇮🇳" },
  { code: "ml-IN", langTag: "ml-IN", label: "Malayalam (മലയാളം)", icon: "🇮🇳" },
  { code: "kn-IN", langTag: "kn-IN", label: "Kannada (ಕನ್ನಡ)", icon: "🇮🇳" },
  { code: "mr-IN", langTag: "mr-IN", label: "Marathi (मराठी)", icon: "🇮🇳" },
  { code: "bn-IN", langTag: "bn-IN", label: "Bengali (বাংলা)", icon: "🇮🇳" },
  { code: "gu-IN", langTag: "gu-IN", label: "Gujarati (ગુજરાતી)", icon: "🇮🇳" },
  { code: "es-ES", langTag: "es-ES", label: "Spanish (Español)", icon: "🇪🇸" },
  { code: "fr-FR", langTag: "fr-FR", label: "French (Français)", icon: "🇫🇷" },
  { code: "de-DE", langTag: "de-DE", label: "German (Deutsch)", icon: "🇩🇪" },
];

const VoiceContext = createContext(null);

export const VoiceProvider = ({ children }) => {
  const {
    messages,
    selectedEmail,
    selectEmail,
    sendEmail,
    replyEmail,
    deleteEmail,
  } = useGmail();

  // Browser Capability Support
  const [isSupported] = useState(() => isSpeechRecognitionSupported());

  // Panel & Live Voice State
  const [isVoiceActive, setIsVoiceActive] = useState(false); // Modal visibility
  const [isLiveVoice, setIsLiveVoice] = useState(false); // Hands-free continuous live conversation mode

  // Voice Status:
  // 'IDLE'        -> Voice inactive / mic off
  // 'LISTENING'   -> Microphone actively listening for user speech
  // 'PROCESSING'  -> Debounced utterance being processed by Gemini
  // 'SPEAKING'    -> Assistant speaking aloud (mic off)
  // 'CONFIRMING'  -> Waiting for explicit confirmation (mic active for Yes/No)
  // 'ERROR'       -> Microphone or network error
  const [voiceStatus, setVoiceStatus] = useState("IDLE");

  // Transcript states
  const [liveTranscript, setLiveTranscript] = useState(""); // Live streaming transcript while talking
  const [transcript, setTranscript] = useState(""); // Completed utterance of the turn
  const [agentResponse, setAgentResponse] = useState(
    "Hello! I am your AI Voice Email Assistant. How can I help you today?"
  );
  const [errorMessage, setErrorMessage] = useState("");

  // Conversational History (Last 15 turns)
  const [history, setHistory] = useState(() => [
    {
      id: "welcome",
      role: "agent",
      text: "Hello! I am your AI Voice Email Assistant. Turn on Live Voice to speak hands-free, or speak commands like 'Send a mail to Priya' or 'Show my unread emails'.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Multi-Turn Dialog & Draft State
  // {
  //   type: 'COMPOSE' | 'REPLY' | 'DELETE' | null,
  //   step: 'AWAITING_RECIPIENT' | 'AWAITING_MESSAGE' | 'AWAITING_SUBJECT' | 'CONFIRM' | null,
  //   draft: { to: '', subject: '', message: '', threadId?: '' },
  //   email?: Object (target email for reply/delete),
  //   lastReferencedEmail?: { id: '', sender: '', subject: '' },
  //   lastAction?: string,
  // }
  const [dialogState, setDialogState] = useState(null);

  // Multilingual State
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [detectedLanguage, setDetectedLanguage] = useState({ name: "English", code: "en" });

  // References to eliminate stale closure bugs in callbacks and async timers
  const recognizerRef = useRef(null);
  const isLiveVoiceRef = useRef(isLiveVoice);
  const isSpeakingRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const turnDebounceTimerRef = useRef(null);
  const accumulatedTranscriptRef = useRef("");
  const dialogStateRef = useRef(dialogState);
  const messagesRef = useRef(messages);
  const selectedEmailRef = useRef(selectedEmail);
  const lastReferencedEmailRef = useRef(null);
  const commitUserUtteranceRef = useRef(null);
  const selectedLanguageRef = useRef(selectedLanguage);
  const detectedLanguageRef = useRef(detectedLanguage);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    detectedLanguageRef.current = detectedLanguage;
  }, [detectedLanguage]);

  useEffect(() => {
    isLiveVoiceRef.current = isLiveVoice;
  }, [isLiveVoice]);

  useEffect(() => {
    dialogStateRef.current = dialogState;
  }, [dialogState]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    selectedEmailRef.current = selectedEmail;
    if (selectedEmail) {
      lastReferencedEmailRef.current = {
        id: selectedEmail.id,
        sender: selectedEmail.senderName || selectedEmail.senderEmail,
        subject: selectedEmail.subject,
      };
    }
  }, [selectedEmail]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Append entry to conversational history
  const addHistoryItem = useCallback((role, text) => {
    const item = {
      id: `${Date.now()}-${Math.random()}`,
      role,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setHistory((prev) => [...prev.slice(-15), item]);
  }, []);

  /**
   * Stops ongoing speech synthesis immediately.
   */
  const stopSpeaking = useCallback(() => {
    speechSynthesizer.stop();
    isSpeakingRef.current = false;
  }, []);

  /**
   * Stops microphone listening.
   */
  const stopListening = useCallback(() => {
    if (turnDebounceTimerRef.current) {
      clearTimeout(turnDebounceTimerRef.current);
      turnDebounceTimerRef.current = null;
    }
    isMicMutedRef.current = true;
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    setVoiceStatus("IDLE");
  }, []);

  /**
   * Internal helper to start browser speech recognition.
   */
  const startListeningInternal = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setErrorMessage("Speech Recognition is not supported by your browser. Please use Chrome or Edge.");
      setVoiceStatus("ERROR");
      return;
    }

    // Clear debounce timer and buffers
    if (turnDebounceTimerRef.current) {
      clearTimeout(turnDebounceTimerRef.current);
      turnDebounceTimerRef.current = null;
    }

    accumulatedTranscriptRef.current = "";
    setLiveTranscript("");
    isMicMutedRef.current = false;

    // If currently speaking, stop synthesis first
    if (speechSynthesizer.isSpeaking()) {
      speechSynthesizer.stop();
      isSpeakingRef.current = false;
    }

    // Set status
    const isConfirming = dialogStateRef.current?.step === "CONFIRM";
    setVoiceStatus(isConfirming ? "CONFIRMING" : "LISTENING");

    const activeLangObj =
      SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguageRef.current) ||
      SUPPORTED_LANGUAGES[0];
    const recognitionLang = activeLangObj.langTag || "en-IN";

    // Initialize recognizer controller if not already present
    if (!recognizerRef.current) {
      const recognizer = createSpeechRecognizer({
        continuous: true,
        lang: recognitionLang,
        onStart: () => {
          const currentStep = dialogStateRef.current?.step;
          setVoiceStatus(currentStep === "CONFIRM" ? "CONFIRMING" : "LISTENING");
        },
        onSpeechStart: () => {
          // Barge-in: if user starts speaking while AI is speaking
          if (speechSynthesizer.isSpeaking()) {
            speechSynthesizer.stop();
            isSpeakingRef.current = false;
            setVoiceStatus("LISTENING");
          }
        },
        onResult: ({ transcript: recognizedText }) => {
          // If speech synthesis is speaking, user speech takes priority (barge-in)
          if (speechSynthesizer.isSpeaking()) {
            speechSynthesizer.stop();
            isSpeakingRef.current = false;
          }

          const trimmed = (recognizedText || "").trim();
          if (!trimmed) return;

          accumulatedTranscriptRef.current = trimmed;
          setLiveTranscript(trimmed);

          // Real-time optimistic language detection while speaking
          const liveDetected = detectSpokenLanguage(trimmed);
          if (liveDetected && liveDetected.code !== detectedLanguageRef.current.code) {
            setDetectedLanguage(liveDetected);
          }

          // Reset turn debounce timer
          if (turnDebounceTimerRef.current) {
            clearTimeout(turnDebounceTimerRef.current);
            turnDebounceTimerRef.current = null;
          }

          // Natural Turn Detection (Supports fast multilingual confirmation)
          const isFastConfirm =
            dialogStateRef.current?.step === "CONFIRM" &&
            (isAffirmative(trimmed) || isNegative(trimmed));

          const debounceMs = isFastConfirm ? 650 : 1200;

          // Start debounce window: wait for user to finish speaking
          turnDebounceTimerRef.current = setTimeout(() => {
            const completedTurn = accumulatedTranscriptRef.current.trim();
            if (completedTurn) {
              // Finalize conversational turn
              commitUserUtteranceRef.current?.(completedTurn);
            }
          }, debounceMs);
        },
        onError: ({ error, message }) => {
          if (error === "no-speech" || error === "aborted") return;
          console.warn("[VoiceContext] Recognition error:", error, message);
          setErrorMessage(message);
          setVoiceStatus("ERROR");
        },
        onEnd: () => {
          // Auto-restart recognition if Live Voice is active and not intentionally muted
          if (isLiveVoiceRef.current && !isMicMutedRef.current && !isSpeakingRef.current) {
            setTimeout(() => {
              if (isLiveVoiceRef.current && !isMicMutedRef.current && !isSpeakingRef.current) {
                recognizerRef.current?.start();
              }
            }, 100);
          }
        },
      });

      recognizerRef.current = recognizer;
    } else {
      recognizerRef.current.setLang(recognitionLang);
    }

    recognizerRef.current.start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Speaks text aloud using SpeechSynthesis and manages the microphone lifecycle.
   * STRICT MICROPHONE LOOP PREVENTION:
   * 1. Mic is stopped and marked muted before speech starts.
   * 2. When speech completes, if Live Voice is still enabled, mic restarts automatically!
   */
  const speak = useCallback(
    (text, optionsOrCb, onCompleteCb) => {
      let options = {};
      let onComplete = null;

      if (typeof optionsOrCb === "function") {
        onComplete = optionsOrCb;
      } else if (typeof optionsOrCb === "object" && optionsOrCb !== null) {
        options = optionsOrCb;
        onComplete = onCompleteCb;
      } else if (typeof onCompleteCb === "function") {
        onComplete = onCompleteCb;
      }

      const cleanSpeech = (text || "")
        .replace(/[*#`_~]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      setAgentResponse(cleanSpeech);
      addHistoryItem("agent", cleanSpeech);

      if (!isSpeechSynthesisSupported()) {
        setVoiceStatus(dialogStateRef.current?.step === "CONFIRM" ? "CONFIRMING" : "IDLE");
        if (onComplete) onComplete();
        if (isLiveVoiceRef.current) {
          startListeningInternal();
        }
        return;
      }

      // CRITICAL: Stop microphone so it never hears the AI's own voice
      isMicMutedRef.current = true;
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }

      setVoiceStatus("SPEAKING");
      isSpeakingRef.current = true;

      const speechLang = options.lang || detectedLanguageRef.current?.code || "en-US";

      speechSynthesizer.speak(cleanSpeech, {
        lang: speechLang,
        rate: options.rate ?? 1.0,
        pitch: options.pitch ?? 1.0,
        onStart: () => {
          setVoiceStatus("SPEAKING");
          isSpeakingRef.current = true;
          isMicMutedRef.current = true;
          if (recognizerRef.current) {
            recognizerRef.current.stop();
          }
        },
        onEnd: () => {
          isSpeakingRef.current = false;
          if (onComplete) onComplete();

          // AUTOMATIC RETURN TO LISTENING (Hands-Free Conversation)
          if (isLiveVoiceRef.current) {
            startListeningInternal();
          } else {
            setVoiceStatus(dialogStateRef.current?.step === "CONFIRM" ? "CONFIRMING" : "IDLE");
          }
        },
        onError: () => {
          isSpeakingRef.current = false;
          if (onComplete) onComplete();
          if (isLiveVoiceRef.current) {
            startListeningInternal();
          } else {
            setVoiceStatus("IDLE");
          }
        },
      });
    },
    [addHistoryItem, startListeningInternal]
  );

  /**
   * Dynamically switches the active speech recognition acoustic language.
   */
  const changeRecognitionLanguage = useCallback(
    (langCode) => {
      setSelectedLanguage(langCode);
      const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
      const tag = langObj?.langTag || "en-IN";
      if (recognizerRef.current) {
        recognizerRef.current.setLang(tag);
        if (voiceStatus === "LISTENING" || voiceStatus === "CONFIRMING") {
          recognizerRef.current.stop();
          setTimeout(() => {
            if (isLiveVoiceRef.current && !isMicMutedRef.current && !isSpeakingRef.current) {
              recognizerRef.current?.start();
            }
          }, 120);
        }
      }
    },
    [voiceStatus]
  );

  /**
   * Barge-in interruption handler:
   * Halts SpeechSynthesis immediately and switches directly back to listening.
   */
  const interruptSpeech = useCallback(() => {
    if (speechSynthesizer.isSpeaking() || isSpeakingRef.current) {
      speechSynthesizer.stop();
      isSpeakingRef.current = false;
      if (isLiveVoiceRef.current) {
        startListeningInternal();
      } else {
        setVoiceStatus("IDLE");
      }
      return true;
    }
    return false;
  }, [startListeningInternal]);

  /**
   * Executes the confirmed action (Human Confirmation Safeguard).
   */
  const executeConfirmedAction = useCallback(
    async (currentDialog) => {
      if (!currentDialog) return;

      const { type, draft, email } = currentDialog;

      if (type === "COMPOSE" && draft) {
        try {
          // Normalize recipient to email address
          let finalTo = normalizeSpokenEmail(draft.to || "");
          if (!finalTo.includes("@")) {
            const match = messagesRef.current.find(
              (m) =>
                m.senderName &&
                m.senderName.toLowerCase().includes(draft.to.toLowerCase())
            );
            if (match && match.senderEmail) {
              finalTo = match.senderEmail;
            } else {
              finalTo = `${draft.to.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`;
            }
          }

          await sendEmail({
            to: finalTo,
            subject: draft.subject || "No Subject",
            message: draft.message || "",
          });

          const langCode = detectedLanguageRef.current?.code || "en";
          const doneMessage =
            langCode === "ta"
              ? "Done. மின்னஞ்சல் அனுப்பப்பட்டது."
              : langCode === "hi"
              ? "Done. ईमेल भेज दिया गया है।"
              : langCode === "te"
              ? "Done. ఈమెయిల్ పంపబడింది."
              : langCode === "ml"
              ? "Done. ഇമെയിൽ അയച്ചു."
              : langCode === "kn"
              ? "Done. ಇಮೇಲ್ ಕಳುಹಿಸಲಾಗಿದೆ."
              : "Done. The email has been sent.";

          setDialogState(null);
          speak(doneMessage, { lang: langCode });
        } catch (err) {
          speak(`Sorry, there was an error sending your email: ${err.message}`);
        }
        return;
      }

      if (type === "REPLY" && email) {
        try {
          await replyEmail({
            to: email.senderEmail || email.fromRaw,
            subject: draft?.subject || email.subject,
            message: draft?.message || "",
            threadId: email.threadId,
            originalMessageId: email.messageIdHeader,
          });

          const langCode = detectedLanguageRef.current?.code || "en";
          const doneReply =
            langCode === "ta"
              ? "Done. உங்கள் பதில் அனுப்பப்பட்டது."
              : langCode === "hi"
              ? "Done. आपका जवाब भेज दिया गया है।"
              : langCode === "te"
              ? "Done. మీ ప్రత్యుత్తరం పంపబడింది."
              : "Done. Your reply has been sent.";

          setDialogState(null);
          speak(doneReply, { lang: langCode });
        } catch (err) {
          speak(`Failed to send reply: ${err.message}`);
        }
        return;
      }

      if (type === "DELETE" && email) {
        try {
          await deleteEmail(email.id);

          const langCode = detectedLanguageRef.current?.code || "en";
          const doneDelete =
            langCode === "ta"
              ? "Done. மின்னஞ்சல் நீக்கப்பட்டது."
              : langCode === "hi"
              ? "Done. ईमेल हटा दिया गया है।"
              : "Done. The email has been moved to Gmail Trash.";

          setDialogState(null);
          speak(doneDelete, { lang: langCode });
        } catch (err) {
          speak(`Failed to delete email: ${err.message}`);
        }
      }
    },
    [sendEmail, replyEmail, deleteEmail, speak]
  );

  /**
   * Cancels active dialog / pending draft.
   */
  const cancelActiveAction = useCallback(() => {
    setDialogState(null);
    speak("I've cancelled that for you.");
  }, [speak]);

  /**
   * Core Conversational Voice Agent Turn Handler:
   * 1. Check for instant confirmation / cancellation if awaiting confirmation.
   * 2. Dispatch utterance + session history + draft state to Gemini Genkit flow.
   * 3. Handle returned intent, update draft, and speak natural response.
   * 4. Automatic local fallback if server is unreachable.
   */
  const handleVoiceCommand = useCallback(
    async (spokenText) => {
      const trimmed = spokenText.trim();
      if (!trimmed) return;

      setTranscript(trimmed);
      setLiveTranscript("");
      addHistoryItem("user", trimmed);
      setVoiceStatus("PROCESSING");
      setErrorMessage("");

      // Mute microphone while processing
      isMicMutedRef.current = true;
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }

      const currentDialog = dialogStateRef.current;
      const currentSelected = selectedEmailRef.current;
      const currentMessages = messagesRef.current;

      // ======================================================================
      // 1. FAST-PATH CONFIRMATION / CANCELLATION
      // ======================================================================
      if (currentDialog && currentDialog.step === "CONFIRM") {
        if (isAffirmative(trimmed)) {
          await executeConfirmedAction(currentDialog);
          return;
        }
        if (isNegative(trimmed) || /cancel/i.test(trimmed)) {
          cancelActiveAction();
          return;
        }
      }

      if (/^(cancel that|cancel|stop|never mind|discard)$/i.test(trimmed)) {
        cancelActiveAction();
        return;
      }

      // ======================================================================
      // 2. GEMINI + GENKIT NATURAL CONVERSATIONAL REASONING
      // ======================================================================
      try {
        const emailCtx = currentSelected
          ? {
              id: currentSelected.id,
              threadId: currentSelected.threadId,
              subject: currentSelected.subject,
              senderName: currentSelected.senderName,
              senderEmail: currentSelected.senderEmail,
              snippet: currentSelected.snippet,
              body:
                currentSelected.body?.plain ||
                currentSelected.body?.content ||
                currentSelected.snippet ||
                "",
            }
          : lastReferencedEmailRef.current
          ? {
              id: lastReferencedEmailRef.current.id,
              senderName: lastReferencedEmailRef.current.sender,
              subject: lastReferencedEmailRef.current.subject,
            }
          : null;

        const inboxSummary = currentMessages.slice(0, 10).map((m) => ({
          id: m.id,
          sender: m.senderName,
          subject: m.subject,
          isUnread: m.isUnread,
          date: m.date,
        }));

        const conversationHistory = historyRef.current
          .slice(-8)
          .map((h) => ({ role: h.role, text: h.text }));

        const currentState = {
          activeAction: currentDialog?.type || null,
          step: currentDialog?.step || null,
          draft: currentDialog?.draft || null,
          lastReferencedEmail: lastReferencedEmailRef.current || null,
          lastAction: currentDialog?.lastAction || null,
        };

        const aiResult = await processVoiceAgentMessage({
          utterance: trimmed,
          emailContext: emailCtx,
          conversationHistory,
          currentState,
          inboxSummary,
        });

        // --------------------------------------------------------------------
        // Handle Gemini Flow Result
        // --------------------------------------------------------------------

        // Intent: CONFIRM
        if (aiResult.intent === "CONFIRM" || aiResult.actionToExecute === "SEND") {
          if (currentDialog) {
            await executeConfirmedAction(currentDialog);
          } else {
            speak("There is no pending email action to confirm.");
          }
          return;
        }

        // Intent: CANCEL
        if (aiResult.intent === "CANCEL") {
          cancelActiveAction();
          return;
        }

        // Intent: SEND_EMAIL or UPDATE_DRAFT
        if (aiResult.intent === "SEND_EMAIL" || aiResult.intent === "UPDATE_DRAFT") {
          const existingDraft = currentDialog?.draft || {};
          const recipientRef =
            aiResult.entities?.recipientReference ||
            aiResult.entities?.recipient ||
            aiResult.draft?.to ||
            existingDraft.to ||
            "";

          const mergedDraft = {
            to: recipientRef,
            subject:
              aiResult.entities?.subject || aiResult.draft?.subject || existingDraft.subject || "",
            message:
              aiResult.entities?.message || aiResult.draft?.message || existingDraft.message || "",
          };

          const missing = aiResult.missingInformation || [];

          // Missing recipient
          if ((missing.includes("recipient") || !mergedDraft.to) && !recipientRef) {
            setDialogState({
              type: "COMPOSE",
              step: "AWAITING_RECIPIENT",
              draft: mergedDraft,
              lastAction: "SEND_EMAIL",
            });
            speak(aiResult.response || "Sure. Who would you like me to send it to?");
            return;
          }

          // Missing message
          if (missing.includes("message") && !mergedDraft.message) {
            setDialogState({
              type: "COMPOSE",
              step: "AWAITING_MESSAGE",
              draft: mergedDraft,
              lastAction: "SEND_EMAIL",
            });
            speak(
              aiResult.response ||
                `Sure. What would you like me to tell ${mergedDraft.to || "them"}?`
            );
            return;
          }

          // Missing subject (AI asked for subject)
          if (missing.includes("subject") && !mergedDraft.subject) {
            setDialogState({
              type: "COMPOSE",
              step: "AWAITING_SUBJECT",
              draft: mergedDraft,
              lastAction: "SEND_EMAIL",
            });
            speak(aiResult.response || "Got it. What subject would you like?");
            return;
          }

          // Complete draft: require affirmative human confirmation
          setDialogState({
            type: "COMPOSE",
            step: "CONFIRM",
            draft: mergedDraft,
            lastAction: "SEND_EMAIL",
          });
          speak(
            aiResult.response ||
              `I've prepared an email to ${mergedDraft.to} with the subject '${mergedDraft.subject || "Project Update"}'. Would you like me to send it?`
          );
          return;
        }

        // Intent: REPLY_EMAIL
        if (aiResult.intent === "REPLY_EMAIL") {
          const target = currentSelected || currentMessages[0];
          if (!target) {
            speak("Please open or select an email before replying.");
            return;
          }

          if (!currentSelected || currentSelected.id !== target.id) {
            selectEmail(target.id);
          }

          const replyRecipient = target.senderName || target.senderEmail || "the sender";
          const replySubject = target.subject?.startsWith("Re:")
            ? target.subject
            : `Re: ${target.subject || "Email"}`;
          const replyMsg = aiResult.entities?.message || aiResult.draft?.message || "";

          if (!replyMsg || aiResult.missingInformation?.includes("message")) {
            setDialogState({
              type: "REPLY",
              step: "AWAITING_MESSAGE",
              email: target,
              draft: {
                to: replyRecipient,
                subject: replySubject,
                message: "",
                threadId: target.threadId,
              },
              lastAction: "REPLY_EMAIL",
            });
            speak(
              aiResult.response ||
                `Replying to ${replyRecipient}. What would you like your reply to say?`
            );
            return;
          }

          setDialogState({
            type: "REPLY",
            step: "CONFIRM",
            email: target,
            draft: {
              to: replyRecipient,
              subject: replySubject,
              message: replyMsg,
              threadId: target.threadId,
            },
            lastAction: "REPLY_EMAIL",
          });
          speak(
            aiResult.response ||
              `I've prepared your reply saying '${replyMsg}'. Would you like me to send it?`
          );
          return;
        }

        // Intent: DELETE_EMAIL
        if (aiResult.intent === "DELETE_EMAIL") {
          const target = currentSelected || currentMessages[0];
          if (!target) {
            speak("No email found to delete.");
            return;
          }

          setDialogState({
            type: "DELETE",
            step: "CONFIRM",
            email: target,
            lastAction: "DELETE_EMAIL",
          });
          speak(
            aiResult.response ||
              `Are you sure you want to move the email from ${target.senderName} with subject '${target.subject}' to Gmail Trash?`
          );
          return;
        }

        // Intent: READ_EMAIL
        if (aiResult.intent === "READ_EMAIL") {
          let target = null;

          // Check if user is asking to read unread emails
          if (
            aiResult.entities?.target === "latest_unread" ||
            currentDialog?.lastAction === "SHOW_UNREAD" ||
            /latest one|unread/i.test(trimmed)
          ) {
            target = currentMessages.find((m) => m.isUnread) || currentMessages[0];
          } else if (aiResult.entities?.target === "selected" && currentSelected) {
            target = currentSelected;
          } else {
            target = currentMessages[0];
          }

          if (!target) {
            speak("You don't have any emails in your inbox right now.");
            return;
          }

          if (!currentSelected || currentSelected.id !== target.id) {
            selectEmail(target.id);
          }

          lastReferencedEmailRef.current = {
            id: target.id,
            sender: target.senderName,
            subject: target.subject,
          };

          setDialogState((prev) => ({
            ...(prev || {}),
            lastReferencedEmail: lastReferencedEmailRef.current,
            lastAction: "READ_EMAIL",
          }));

          const readText = formatEmailForReading(target);
          speak(readText);
          return;
        }

        // Intent: SUMMARIZE_EMAIL
        if (aiResult.intent === "SUMMARIZE_EMAIL") {
          const target = currentSelected || currentMessages[0];
          if (!target) {
            speak("Please select an email to summarize.");
            return;
          }

          if (!currentSelected || currentSelected.id !== target.id) {
            selectEmail(target.id);
          }

          lastReferencedEmailRef.current = {
            id: target.id,
            sender: target.senderName,
            subject: target.subject,
          };

          speak("Summarizing email with Gemini AI...", async () => {
            try {
              const bodyText =
                target.body?.plain || target.body?.content || target.snippet || "";

              const summaryResult = await summarizeEmailContent({
                emailContent: bodyText,
                subject: target.subject,
                sender: target.senderName || target.senderEmail,
              });

              const spokenSummary = `Summary: ${summaryResult.summary}. Key points: ${summaryResult.bulletPoints
                .slice(0, 3)
                .join(". ")}.`;

              speak(spokenSummary);
            } catch (err) {
              speak(`Sorry, could not summarize this email: ${err.message}`);
            }
          });
          return;
        }

        // Intent: SHOW_UNREAD
        if (aiResult.intent === "SHOW_UNREAD") {
          const unreadEmails = currentMessages.filter((m) => m.isUnread);
          if (unreadEmails.length === 0) {
            speak("You have no unread emails. Your inbox is completely up to date!");
            return;
          }

          const topSubjects = unreadEmails
            .slice(0, 3)
            .map((e, idx) => `${idx + 1}, '${e.subject}' from ${e.senderName}`)
            .join(". ");

          setDialogState((prev) => ({
            ...(prev || {}),
            lastAction: "SHOW_UNREAD",
          }));

          speak(
            `You have ${unreadEmails.length} unread emails. Here are the latest: ${topSubjects}.`
          );
          return;
        }

        // Intent: FIND_EMAILS
        if (aiResult.intent === "FIND_EMAILS") {
          const query = (aiResult.entities?.query || trimmed).toLowerCase();
          const matches = currentMessages.filter((m) => {
            return (
              (m.senderName && m.senderName.toLowerCase().includes(query)) ||
              (m.senderEmail && m.senderEmail.toLowerCase().includes(query)) ||
              (m.subject && m.subject.toLowerCase().includes(query)) ||
              (m.snippet && m.snippet.toLowerCase().includes(query))
            );
          });

          if (matches.length === 0) {
            speak(`I couldn't find any emails matching '${query}' in your recent messages.`);
            return;
          }

          const firstMatch = matches[0];
          selectEmail(firstMatch.id);
          lastReferencedEmailRef.current = {
            id: firstMatch.id,
            sender: firstMatch.senderName,
            subject: firstMatch.subject,
          };

          speak(
            `I found ${matches.length} matching emails. Showing email from ${firstMatch.senderName} regarding '${firstMatch.subject}'.`
          );
          return;
        }

        // Intent: ASK_ABOUT_EMAIL
        if (aiResult.intent === "ASK_ABOUT_EMAIL") {
          const target = currentSelected || currentMessages[0];
          if (!target) {
            speak("Please select an email to ask questions about.");
            return;
          }

          speak("Checking with Gemini AI...", async () => {
            try {
              const bodyText =
                target.body?.plain || target.body?.content || target.snippet || "";

              const answerObj = await askQuestionAboutEmail({
                emailContent: bodyText,
                question: aiResult.entities?.query || trimmed,
                subject: target.subject,
                sender: target.senderName || target.senderEmail,
              });

              speak(answerObj.answer);
            } catch (err) {
              speak(`Sorry, Gemini could not answer that: ${err.message}`);
            }
          });
          return;
        }

        // General AI Response
        speak(
          aiResult.response ||
            "I'm here. You can ask me to read emails, summarize them, compose a new message, or reply."
        );
      } catch (aiError) {
        console.warn("[VoiceContext] AI flow failed, using local conversational fallback:", aiError);

        // ====================================================================
        // 3. DETERMINISTIC LOCAL CONVERSATIONAL FALLBACK
        // ====================================================================
        const parsed = parseVoiceIntent(trimmed, {
          selectedEmail: currentSelected,
          messages: currentMessages,
          dialogState: currentDialog,
        });

        if (parsed.intent === "UPDATE_DRAFT" && currentDialog?.draft) {
          const updatedDraft = applyDraftUpdate(currentDialog.draft, trimmed);
          setDialogState({
            type: "COMPOSE",
            step: "CONFIRM",
            draft: updatedDraft,
          });
          speak("I've updated the email draft. Should I send it now?");
          return;
        }

        if (currentDialog) {
          if (currentDialog.step === "AWAITING_RECIPIENT") {
            const recipient = normalizeSpokenEmail(trimmed);
            const updatedDraft = { ...currentDialog.draft, to: recipient };
            if (!updatedDraft.message) {
              setDialogState({
                type: "COMPOSE",
                step: "AWAITING_MESSAGE",
                draft: updatedDraft,
              });
              speak(`Got it, sending to ${recipient}. What should the message say?`);
            } else {
              setDialogState({
                type: "COMPOSE",
                step: "CONFIRM",
                draft: updatedDraft,
              });
              speak(
                `Your email to ${recipient} with subject '${updatedDraft.subject}' is ready. Would you like me to send it?`
              );
            }
            return;
          }

          if (currentDialog.step === "AWAITING_MESSAGE") {
            const message = trimmed;
            const updatedDraft = { ...currentDialog.draft, message };
            setDialogState({
              type: currentDialog.type,
              step: "CONFIRM",
              draft: updatedDraft,
              email: currentDialog.email,
            });
            speak(
              currentDialog.type === "REPLY"
                ? `Your reply is: '${message}'. Would you like me to send it?`
                : `Your email is ready. Would you like me to send it?`
            );
            return;
          }
        }

        if (parsed.intent === "SEND_EMAIL") {
          const params = parsed.params || {};
          const newDraft = {
            to: params.recipientReference || params.to || "",
            subject: params.subject || "Project Update",
            message: params.message || "",
          };

          if (params.complete) {
            setDialogState({
              type: "COMPOSE",
              step: "CONFIRM",
              draft: newDraft,
            });
            speak(
              `I've prepared an email to ${newDraft.to} with the subject '${newDraft.subject}'. Would you like me to send it?`
            );
            return;
          }

          if (params.missingMessage) {
            setDialogState({
              type: "COMPOSE",
              step: "AWAITING_MESSAGE",
              draft: newDraft,
            });
            speak(`Sure. What would you like me to tell ${newDraft.to || "them"}?`);
            return;
          }

          setDialogState({
            type: "COMPOSE",
            step: "AWAITING_RECIPIENT",
            draft: newDraft,
          });
          speak("Who would you like me to send it to?");
          return;
        }

        speak("I heard you. You can say 'Send a mail to Priya', 'Show my unread emails', or 'Summarize this email'.");
      }
    },
    [
      executeConfirmedAction,
      cancelActiveAction,
      speak,
      selectEmail,
      addHistoryItem,
    ]
  );

  /**
   * Finalizes user turn from debounced speech.
   */
  const commitUserUtterance = useCallback(
    (text) => {
      if (turnDebounceTimerRef.current) {
        clearTimeout(turnDebounceTimerRef.current);
        turnDebounceTimerRef.current = null;
      }
      accumulatedTranscriptRef.current = "";
      setLiveTranscript("");
      handleVoiceCommand(text);
    },
    [handleVoiceCommand]
  );

  useEffect(() => {
    commitUserUtteranceRef.current = commitUserUtterance;
  }, [commitUserUtterance]);

  /**
   * Turns ON Hands-Free Live Voice mode.
   * Microphone continuously listens and automatically reactivates after each AI turn.
   */
  const startLiveVoice = useCallback(() => {
    setIsLiveVoice(true);
    isLiveVoiceRef.current = true;
    setIsVoiceActive(true);
    setErrorMessage("");
    startListeningInternal();
  }, [startListeningInternal]);

  /**
   * Turns OFF Live Voice mode.
   * Completely stops microphone and speech synthesis without auto-restarting.
   */
  const stopLiveVoice = useCallback(() => {
    setIsLiveVoice(false);
    isLiveVoiceRef.current = false;
    isMicMutedRef.current = true;
    stopSpeaking();
    stopListening();
    setVoiceStatus("IDLE");
  }, [stopSpeaking, stopListening]);

  /**
   * Toggles Live Voice on or off.
   */
  const toggleLiveVoice = useCallback(() => {
    if (isLiveVoiceRef.current) {
      stopLiveVoice();
    } else {
      startLiveVoice();
    }
  }, [startLiveVoice, stopLiveVoice]);

  /**
   * Global Keyboard Shortcuts:
   * Pressing Space or Escape while AI is speaking interrupts and starts listening.
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input or textarea
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea" || e.target?.isContentEditable) {
        return;
      }

      if (e.code === "Space" || e.key === "Escape") {
        if (speechSynthesizer.isSpeaking() || isSpeakingRef.current) {
          e.preventDefault();
          interruptSpeech();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [interruptSpeech]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      isLiveVoiceRef.current = false;
      isMicMutedRef.current = true;
      speechSynthesizer.stop();
      if (recognizerRef.current) {
        recognizerRef.current.abort();
      }
      if (turnDebounceTimerRef.current) {
        clearTimeout(turnDebounceTimerRef.current);
      }
    };
  }, []);

  const value = {
    isSupported,
    isVoiceActive,
    isLiveVoice,
    voiceStatus,
    transcript,
    liveTranscript,
    agentResponse,
    errorMessage,
    history,
    dialogState,
    openVoicePanel: () => setIsVoiceActive(true),
    closeVoicePanel: () => {
      stopSpeaking();
      stopListening();
      setIsVoiceActive(false);
    },
    toggleVoicePanel: () => {
      if (isVoiceActive) {
        stopSpeaking();
        stopListening();
        setIsVoiceActive(false);
      } else {
        setIsVoiceActive(true);
      }
    },
    startLiveVoice,
    stopLiveVoice,
    toggleLiveVoice,
    startListening: startListeningInternal,
    stopListening,
    speak,
    stopSpeaking,
    interruptSpeech,
    speakAgain: () => speak(agentResponse),
    sendManualCommand: (cmd) => handleVoiceCommand(cmd),
    confirmAction: () => executeConfirmedAction(dialogState),
    cancelAction: cancelActiveAction,
    resetDialog: () => {
      setDialogState(null);
      speak("Voice dialog reset. Ready for your command.");
    },
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
};

export default VoiceContext;
