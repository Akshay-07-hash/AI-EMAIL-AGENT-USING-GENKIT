// src/services/voiceService.js
// ============================================================================
// Web Speech API Service (Voice Input & Voice Output)
// ============================================================================
// ACADEMIC & ARCHITECTURAL OVERVIEW:
// 1. Voice Input (Speech-to-Text):
//    Utilizes the browser's native Web Speech API (SpeechRecognition / webkitSpeechRecognition).
//    Zero external paid APIs; runs client-side in compliant modern browsers.
// 2. Voice Output (Text-to-Speech):
//    Utilizes the browser's native SpeechSynthesis API (window.speechSynthesis).
//    Provides play, stop, and queue management with natural pacing.
// 3. Graceful Fallback:
//    Safely detects browser support and surfaces informative compatibility warnings.
// ============================================================================

/**
 * Checks if Speech Recognition is supported in the current browser environment.
 * @returns {boolean}
 */
export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Checks if Speech Synthesis is supported in the current browser environment.
 * @returns {boolean}
 */
export function isSpeechSynthesisSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
}

/**
 * Retrieves the SpeechRecognition constructor (standard or webkit-prefixed).
 */
function getSpeechRecognitionClass() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
/**
 * Detects the language/script of a given utterance using character range analysis and code-switching markers.
 * @param {string} text
 * @returns {{ name: string, code: string }}
 */
export function detectSpokenLanguage(text = "") {
  const clean = (text || "").trim();
  if (!clean) return { name: "English", code: "en" };

  // 1. Script-based Unicode detection
  // Tamil: U+0B80–U+0BFF
  if (/[\u0B80-\u0BFF]/.test(clean)) {
    return { name: "Tamil (தமிழ்)", code: "ta" };
  }
  // Devanagari (Hindi/Marathi): U+0900–U+097F
  if (/[\u0900-\u097F]/.test(clean)) {
    return { name: "Hindi (हिन्दी)", code: "hi" };
  }
  // Telugu: U+0C00–U+0C7F
  if (/[\u0C00-\u0C7F]/.test(clean)) {
    return { name: "Telugu (తెలుగు)", code: "te" };
  }
  // Malayalam: U+0D00–U+0D7F
  if (/[\u0D00-\u0D7F]/.test(clean)) {
    return { name: "Malayalam (മലയാളം)", code: "ml" };
  }
  // Kannada: U+0C80–U+0CFF
  if (/[\u0C80-\u0CFF]/.test(clean)) {
    return { name: "Kannada (ಕನ್ನಡ)", code: "kn" };
  }
  // Bengali: U+0980–U+09FF
  if (/[\u0980-\u09FF]/.test(clean)) {
    return { name: "Bengali (বাংলা)", code: "bn" };
  }
  // Gujarati: U+0A80–U+0AFF
  if (/[\u0A80-\u0AFF]/.test(clean)) {
    return { name: "Gujarati (ગુજરાતી)", code: "gu" };
  }

  // 2. Romanized transliteration / Code-switching heuristic detection
  const lower = clean.toLowerCase();

  // Tanglish (Tamil in Roman script)
  const tanglishPatterns = [
    /\b(?:anuppu|anuppunga|nalaiku|naalaiki|irukku|sollu|sollunga|mail-ku|oru\s+mail|enna|vendaam|aama|aamaa|seri|pannu|pannunga|send\s+pannu|padi|padikaadha|vaasi|kaattu|thedu|kettu)\b/,
    /-ku\b/,
    /-la\b/,
  ];
  if (tanglishPatterns.some((pattern) => pattern.test(lower))) {
    return { name: "Tamil (Tanglish)", code: "ta" };
  }

  // Hinglish (Hindi in Roman script)
  const hinglishPatterns = [
    /\b(?:bhejo|bhej\s+do|bhej\s+dijiye|kal\s+hai|kya|sandesh|nahi|nahin|haan|theek\s+hai|sahi\s+hai|batao|karo|kijiye|likho|sunao|padho|dikhao|dhoondo|mat\s+bhejo|roko|chhota)\b/,
    /\b(?:ko\s+ek|ka\s+reply|kiske\s+baare)\b/,
  ];
  if (hinglishPatterns.some((pattern) => pattern.test(lower))) {
    return { name: "Hindi (Hinglish)", code: "hi" };
  }

  // Telugu in Roman script
  const teluguPatterns = [
    /\b(?:pampu|pampandi|repu|undi|avunu|vaddhu|cheppu|cheppandi|choodu|chaduvu|kadu)\b/,
    /-ki\b/,
  ];
  if (teluguPatterns.some((pattern) => pattern.test(lower))) {
    return { name: "Telugu (తెలుగు)", code: "te" };
  }

  // Malayalam in Roman script
  const malayalamPatterns = [
    /\b(?:ayakkuka|ayakkoo|naale|aanu|athe|venda|parayuka|parayoo|vaayikkuka|alla)\b/,
    /-kku\b/,
  ];
  if (malayalamPatterns.some((pattern) => pattern.test(lower))) {
    return { name: "Malayalam (മലയാളം)", code: "ml" };
  }

  // Kannada in Roman script
  const kannadaPatterns = [
    /\b(?:kaluhisi|kalisi|naale|ide|haudu|beda|heli|odhi|thilisi)\b/,
    /-ge\b/,
  ];
  if (kannadaPatterns.some((pattern) => pattern.test(lower))) {
    return { name: "Kannada (ಕನ್ನಡ)", code: "kn" };
  }

  // Spanish
  if (/\b(?:enviar|correo|gracias|hola|cancelar|mensaje|manana)\b/.test(lower)) {
    return { name: "Spanish (Español)", code: "es" };
  }

  // French
  if (/\b(?:envoyer|courriel|merci|bonjour|annuler|message|demain)\b/.test(lower)) {
    return { name: "French (Français)", code: "fr" };
  }

  return { name: "English", code: "en" };
}

/**
 * Creates and configures a SpeechRecognition instance for conversational voice.
 * @param {Object} options
 * @param {Function} options.onResult - Called with ({ transcript, isFinal, rawEvent })
 * @param {Function} options.onError - Called with ({ error, message })
 * @param {Function} options.onStart - Called when microphone starts listening
 * @param {Function} options.onEnd - Called when microphone stops listening
 * @param {Function} [options.onSpeechStart] - Called when user begins speaking (for barge-in)
 * @param {string} [options.lang='en-IN'] - Language code (e.g. 'en-IN', 'ta-IN', 'hi-IN', 'te-IN')
 * @param {boolean} [options.continuous=true] - Continuous listening mode
 * @returns {Object|null} Recognition controller with { start, stop, abort, isActive, setLang, getLang }
 */
export function createSpeechRecognizer({
  onResult,
  onError,
  onStart,
  onEnd,
  onSpeechStart,
  lang = "en-IN",
  continuous = true,
}) {
  const SpeechClass = getSpeechRecognitionClass();
  if (!SpeechClass) {
    return null;
  }

  let recognition = null;
  let isListening = false;
  let shouldRestart = false;

  try {
    recognition = new SpeechClass();
  } catch (err) {
    console.warn("[VoiceService] Failed to instantiate SpeechRecognition:", err);
    return null;
  }

  recognition.continuous = continuous;
  recognition.interimResults = true; // Stream interim text for live real-time UI feedback
  recognition.lang = lang;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    if (onStart) onStart();
  };

  if (onSpeechStart) {
    recognition.onspeechstart = () => {
      onSpeechStart();
    };
  }

  recognition.onresult = (event) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = 0; i < event.results.length; ++i) {
      const item = event.results[i];
      const text = item[0]?.transcript || "";
      if (item.isFinal) {
        finalTranscript += text + " ";
      } else {
        interimTranscript += text;
      }
    }

    const currentTranscript = (finalTranscript + interimTranscript).trim();
    const hasFinal = Boolean(finalTranscript.trim());

    if (onResult && currentTranscript) {
      onResult({
        transcript: currentTranscript,
        isFinal: hasFinal,
        rawEvent: event,
      });
    }
  };

  recognition.onerror = (event) => {
    const errType = event.error || "unknown";

    // In continuous listening mode, 'no-speech' is routine when user pauses
    if (errType === "no-speech") {
      return;
    }

    let friendlyMessage = "An error occurred with voice recognition.";

    switch (errType) {
      case "not-allowed":
      case "permission-denied":
        friendlyMessage =
          "Microphone permission was denied. Please allow microphone access in your browser settings to use live voice.";
        break;
      case "network":
        friendlyMessage = "Network error during speech recognition. Please check your connection.";
        break;
      case "aborted":
        // Intentional aborts are normal during mic-off switching
        return;
      case "audio-capture":
        friendlyMessage = "No microphone was found. Please ensure a microphone is connected.";
        break;
      default:
        friendlyMessage = `Voice recognition error: ${errType}`;
    }

    if (onError) {
      onError({
        error: errType,
        message: friendlyMessage,
      });
    }
  };

  recognition.onend = () => {
    isListening = false;
    if (shouldRestart) {
      shouldRestart = false;
      try {
        recognition.start();
        return;
      } catch {
        // Fall through to onEnd
      }
    }
    if (onEnd) onEnd();
  };

  return {
    start: () => {
      shouldRestart = false;
      if (isListening) return;
      try {
        recognition.start();
        isListening = true;
      } catch (err) {
        console.warn("[VoiceService] recognition.start() error:", err.message);
      }
    },
    stop: () => {
      shouldRestart = false;
      isListening = false;
      try {
        recognition.stop();
      } catch {
        // Safe ignore
      }
    },
    abort: () => {
      shouldRestart = false;
      isListening = false;
      try {
        recognition.abort();
      } catch {
        // Safe ignore
      }
    },
    isActive: () => isListening,
    setLang: (newLang) => {
      if (newLang && recognition) {
        recognition.lang = newLang;
      }
    },
    getLang: () => (recognition ? recognition.lang : lang),
  };
}

/**
 * Text-to-Speech Controller with interruption / barge-in support & multilingual voices
 */
class SpeechSynthesizer {
  constructor() {
    this.currentUtterance = null;
    this.speaking = false;
  }

  /**
   * Speaks the provided text aloud using SpeechSynthesis API in the appropriate language.
   * @param {string} text - The text to speak aloud
   * @param {Object} [options]
   * @param {Function} [options.onStart] - Called when speaking begins
   * @param {Function} [options.onEnd] - Called when speaking finishes
   * @param {Function} [options.onError] - Called on speech error
   * @param {number} [options.rate=1.0] - Speech rate (0.8 - 1.2)
   * @param {number} [options.pitch=1.0] - Speech pitch
   * @param {string} [options.lang='en-US'] - Target language code or ISO tag (e.g. 'ta', 'hi', 'te', 'ml', 'kn', 'en-IN')
   */
  speak(text, options = {}) {
    if (!isSpeechSynthesisSupported()) {
      console.warn("[VoiceService] SpeechSynthesis is not supported in this browser.");
      if (options.onEnd) options.onEnd();
      return;
    }

    const cleanText = (text || "")
      .replace(/[*#`_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      if (options.onEnd) options.onEnd();
      return;
    }

    // Cancel any ongoing speech to avoid overlapping
    this.stop();

    try {
      const utterance = new window.SpeechSynthesisUtterance(cleanText);
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;

      // Normalize target language (e.g. 'ta' -> 'ta-IN', 'hi' -> 'hi-IN')
      const rawLang = (options.lang || "en-US").toLowerCase();
      const langPrefix = rawLang.split(/[-_]/)[0];
      const langTag = rawLang.includes("-")
        ? rawLang
        : rawLang === "ta"
        ? "ta-IN"
        : rawLang === "hi"
        ? "hi-IN"
        : rawLang === "te"
        ? "te-IN"
        : rawLang === "ml"
        ? "ml-IN"
        : rawLang === "kn"
        ? "kn-IN"
        : rawLang === "en"
        ? "en-IN"
        : rawLang;

      utterance.lang = langTag;

      // Pick the best available browser voice for the detected/selected language
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        // 1. Exact match on language tag (e.g. 'ta-in' or 'hi-in')
        let matchedVoice = voices.find(
          (v) => v.lang && v.lang.toLowerCase().replace(/_/g, "-") === langTag.toLowerCase()
        );

        // 2. Prefix match (e.g. 'ta' or 'hi' or 'te')
        if (!matchedVoice) {
          matchedVoice = voices.find(
            (v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix)
          );
        }

        // 3. Name match for regional voices
        if (!matchedVoice && langPrefix !== "en") {
          const langNames = {
            ta: ["tamil", "valluvar"],
            hi: ["hindi", "lekha", "neerja", "kalpana", "hemant"],
            te: ["telugu", "mohan"],
            ml: ["malayalam"],
            kn: ["kannada"],
            es: ["spanish", "espanol"],
            fr: ["french", "francais"],
          };
          const aliases = langNames[langPrefix] || [];
          matchedVoice = voices.find((v) =>
            aliases.some((a) => v.name.toLowerCase().includes(a))
          );
        }

        // 4. Graceful fallback to natural voice or default voice without crashing
        if (!matchedVoice) {
          matchedVoice =
            voices.find(
              (v) =>
                (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")) &&
                v.lang.startsWith("en")
            ) ||
            voices.find((v) => v.lang.startsWith("en")) ||
            voices[0];
        }

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onstart = () => {
        this.speaking = true;
        if (options.onStart) options.onStart();
      };

      utterance.onend = () => {
        this.speaking = false;
        this.currentUtterance = null;
        if (options.onEnd) options.onEnd();
      };

      utterance.onerror = (event) => {
        this.speaking = false;
        this.currentUtterance = null;
        // 'canceled' or 'interrupted' is normal when user interrupts
        if (event.error !== "canceled" && event.error !== "interrupted") {
          console.warn("[VoiceService] Speech synthesis error:", event.error);
        }
        if (options.onError) {
          options.onError(event);
        } else if (options.onEnd) {
          options.onEnd();
        }
      };

      this.currentUtterance = utterance;
      this.speaking = true;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("[VoiceService] speak() exception:", err);
      this.speaking = false;
      if (options.onEnd) options.onEnd();
    }
  }

  /**
   * Immediately stops any currently speaking speech synthesis.
   */
  stop() {
    this.speaking = false;
    this.currentUtterance = null;
    if (isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn("[VoiceService] cancel() error:", err.message);
      }
    }
  }

  /**
   * Barge-in interruption: immediately halts AI speech and executes callback.
   * @param {Function} [onInterrupted]
   */
  interrupt(onInterrupted) {
    if (this.isSpeaking()) {
      this.stop();
      if (onInterrupted) onInterrupted();
      return true;
    }
    return false;
  }

  /**
   * Returns true if speech synthesis is currently active.
   */
  isSpeaking() {
    if (!isSpeechSynthesisSupported()) return false;
    return this.speaking || window.speechSynthesis.speaking;
  }
}

export const speechSynthesizer = new SpeechSynthesizer();
export default speechSynthesizer;
