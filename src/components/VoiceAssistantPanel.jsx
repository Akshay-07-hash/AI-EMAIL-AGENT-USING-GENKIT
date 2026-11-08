// src/components/VoiceAssistantPanel.jsx
// ============================================================================
// Real-Time Conversational Voice Assistant Panel (Live Hands-Free Interaction)
// ============================================================================
// ACADEMIC & SAFETY ARCHITECTURE:
// 1. Hands-Free Conversational Voice Interaction:
//    - User enables "Live Voice" once.
//    - Automatic multi-turn progression: User speaks -> AI understands -> AI speaks ->
//      Mic automatically listens again. Zero manual button presses between turns!
// 2. Real-Time Transcript Streaming:
//    - While user speaks, transcript streams live to UI in real time.
//    - Only finalized, debounced sentences are dispatched to Gemini.
// 3. Strict Microphone Loop Prevention:
//    - Microphone is completely disabled during AI processing and SpeechSynthesis.
//    - AI voice can NEVER trigger a user command.
// 4. Natural Barge-In / Interruption:
//    - Space key, Escape key, or tapping the banner immediately halts AI speech
//      and switches straight back to listening for user utterance.
// 5. Visual Email Draft Preview Card:
//    - Structured display (To, Subject, Message, [Send], [Cancel]) before sending.
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import { useVoice } from "../context/VoiceContext";

const QUICK_COMMANDS = [
  "Send a mail to Priya",
  "Tell her the meeting is tomorrow at 5 PM",
  "Project meeting",
  "Make the message shorter",
  "Yes, send it",
  "Now show me my unread emails",
  "Read the latest one",
  "Summarize it",
  "Cancel that",
];

export const VoiceAssistantPanel = () => {
  const {
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
    startLiveVoice,
    stopLiveVoice,
    toggleLiveVoice,
    interruptSpeech,
    speakAgain,
    stopSpeaking,
    toggleVoicePanel,
    closeVoicePanel,
    sendManualCommand,
    confirmAction,
    cancelAction,
    resetDialog,
  } = useVoice();

  const [typedInput, setTypedInput] = useState("");
  const historyScrollRef = useRef(null);

  // Auto-scroll conversational history when new items are added
  useEffect(() => {
    if (historyScrollRef.current) {
      historyScrollRef.current.scrollTop = historyScrollRef.current.scrollHeight;
    }
  }, [history, liveTranscript, agentResponse]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    sendManualCommand(typedInput.trim());
    setTypedInput("");
  };

  const getStatusBadge = () => {
    switch (voiceStatus) {
      case "LISTENING":
        return {
          label: "Listening...",
          className: "status-listening",
          dotClass: "dot-listening",
          icon: "🎤",
        };
      case "PROCESSING":
        return {
          label: "Thinking...",
          className: "status-processing",
          dotClass: "dot-processing",
          icon: "🧠",
        };
      case "SPEAKING":
        return {
          label: "Speaking...",
          className: "status-speaking",
          dotClass: "dot-speaking",
          icon: "🔊",
        };
      case "CONFIRMING":
        return {
          label: "Waiting for confirmation",
          className: "status-confirming",
          dotClass: "dot-confirming",
          icon: "⏳",
        };
      case "ERROR":
        return {
          label: "Voice error",
          className: "status-error",
          dotClass: "dot-error",
          icon: "⚠️",
        };
      case "IDLE":
      default:
        return {
          label: isLiveVoice ? "Listening..." : "Voice inactive",
          className: isLiveVoice ? "status-listening" : "status-ready",
          dotClass: isLiveVoice ? "dot-listening" : "dot-ready",
          icon: isLiveVoice ? "🎤" : "○",
        };
    }
  };

  const statusBadge = getStatusBadge();
  const hasDraft = Boolean(
    dialogState?.draft &&
      (dialogState.draft.to || dialogState.draft.subject || dialogState.draft.message)
  );

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        className={`voice-floating-btn ${isVoiceActive ? "active" : ""} ${
          voiceStatus === "LISTENING" || voiceStatus === "CONFIRMING" ? "listening-pulse" : ""
        } ${isLiveVoice ? "live-active-btn" : ""}`}
        onClick={toggleVoicePanel}
        id="voice-assistant-toggle-btn"
        title="Live Voice AI Assistant (Click to open)"
        aria-label="Toggle Live Voice AI Assistant"
      >
        <span className="voice-btn-mic-icon">🎤</span>
        <span className="voice-btn-label">
          {isLiveVoice ? "Live Voice (ON)" : "Voice Assistant"}
        </span>
        {isLiveVoice && <span className="voice-live-dot"></span>}
        {voiceStatus === "SPEAKING" && <span className="voice-speaking-waves">🔊</span>}
      </button>

      {/* Voice Assistant Dialog Panel Modal */}
      {isVoiceActive && (
        <div
          className="voice-panel-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Real-Time Conversational Voice AI Assistant"
        >
          <div className="voice-panel-card">
            {/* Header */}
            <div className="voice-panel-header">
              <div className="voice-header-left">
                <span className="voice-header-icon">🎤</span>
                <div>
                  <div className="voice-header-title-row">
                    <h3 className="voice-header-title">Live Conversational Voice Agent</h3>
                    {isLiveVoice && (
                      <span className="badge-live-stream">
                        <span className="live-pulse-dot"></span>
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="voice-header-subtitle">
                    Natural conversational interaction &bull; Hands-free email assistant
                  </p>
                </div>
              </div>

              <div className="voice-header-right">
                {/* Live Voice Primary Master Switch */}
                <button
                  type="button"
                  className={`btn-live-toggle ${isLiveVoice ? "active" : ""}`}
                  onClick={toggleLiveVoice}
                  id="voice-live-toggle-btn"
                  title={isLiveVoice ? "Click to turn off hands-free voice" : "Click to turn on hands-free live voice"}
                >
                  <span className="live-toggle-indicator"></span>
                  <span className="live-toggle-text">
                    {isLiveVoice ? "Live Voice: ON" : "Turn ON Live Voice"}
                  </span>
                </button>

                {/* Status Indicator Pill */}
                <div className={`voice-status-pill ${statusBadge.className}`}>
                  <span className={`voice-status-dot ${statusBadge.dotClass}`}></span>
                  <span className="voice-status-icon">{statusBadge.icon}</span>
                  <span className="voice-status-text">{statusBadge.label}</span>
                </div>

                <button
                  type="button"
                  className="voice-close-btn"
                  onClick={closeVoicePanel}
                  aria-label="Close Voice Assistant"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Browser Support Warning */}
            {!isSupported && (
              <div className="voice-warning-banner" role="alert">
                <span>⚠️</span>
                <div>
                  <strong>Speech Recognition is not supported by your current browser.</strong>
                  <p>
                    Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for
                    live microphone voice input. You can still type natural requests below and hear speech output!
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="voice-error-banner" role="alert">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            {/* Real-time Streaming Transcript Box */}
            <div className={`voice-live-transcript-card ${voiceStatus === "LISTENING" ? "listening-active" : ""}`}>
              <div className="live-transcript-header">
                <span className="live-transcript-tag">
                  {voiceStatus === "LISTENING" && "🎤 Listening..."}
                  {voiceStatus === "PROCESSING" && "🧠 Thinking..."}
                  {voiceStatus === "SPEAKING" && "🔊 AI Speaking..."}
                  {voiceStatus === "CONFIRMING" && "⏳ Awaiting Your Confirmation..."}
                  {voiceStatus === "IDLE" && "○ Voice Ready"}
                </span>
                {voiceStatus === "LISTENING" && (
                  <span className="live-listening-hint">Speak naturally into your microphone</span>
                )}
              </div>
              <div className="live-transcript-content">
                {liveTranscript ? (
                  <p className="live-transcript-text active-speech">"{liveTranscript}"</p>
                ) : voiceStatus === "LISTENING" || voiceStatus === "CONFIRMING" ? (
                  <p className="live-transcript-placeholder">
                    {isLiveVoice
                      ? "Listening for your voice... (Speak anytime)"
                      : "Click 'Turn ON Live Voice' or 'Start Listening' to speak"}
                  </p>
                ) : voiceStatus === "PROCESSING" ? (
                  <p className="live-transcript-placeholder thinking">
                    AI is reasoning with Gemini...
                  </p>
                ) : (
                  <p className="live-transcript-placeholder">
                    {transcript ? `Last utterance: "${transcript}"` : "Turn on Live Voice to begin talking naturally"}
                  </p>
                )}
              </div>
            </div>

            {/* Barge-In / Interruption Banner (Active while AI is speaking) */}
            {voiceStatus === "SPEAKING" && (
              <div
                className="voice-bargein-banner"
                onClick={interruptSpeech}
                title="Tap to stop AI speech and speak now"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") interruptSpeech();
                }}
              >
                <span className="bargein-icon">✋</span>
                <span className="bargein-text">
                  <strong>Tap to Interrupt &amp; Speak</strong> (or press Space key)
                </span>
                <span className="bargein-sub">AI speech will stop immediately</span>
              </div>
            )}

            {/* Active Conversational Dialog Banner */}
            {dialogState && (
              <div className="voice-dialog-flow-card">
                <div className="dialog-flow-header">
                  <span className="dialog-flow-badge">
                    {dialogState.type === "COMPOSE" && "✉️ Conversational Email Compose"}
                    {dialogState.type === "REPLY" && "↩️ Conversational Reply"}
                    {dialogState.type === "DELETE" && "🗑️ Delete Email Safeguard"}
                  </span>
                  <button
                    type="button"
                    className="btn-cancel-dialog"
                    onClick={cancelAction || resetDialog}
                    title="Cancel this voice action"
                  >
                    Cancel Action
                  </button>
                </div>
                <div className="dialog-flow-step-hint">
                  {dialogState.step === "AWAITING_RECIPIENT" && (
                    <span>💡 Speak the recipient (e.g. "Priya", "my manager", or an email)</span>
                  )}
                  {dialogState.step === "AWAITING_MESSAGE" && (
                    <span>💡 Speak what you would like the message to say</span>
                  )}
                  {dialogState.step === "AWAITING_SUBJECT" && (
                    <span>💡 Speak what subject you would like for this email</span>
                  )}
                  {dialogState.step === "CONFIRM" && (
                    <span className="confirm-prompt-highlight">
                      🛡️ Safeguard: Say "Yes" to send, "Make it shorter" to edit, or "Cancel" to abort
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Visual Email Draft Preview Card (Requirement 8) */}
            {hasDraft && (
              <div className="voice-draft-preview-card" role="region" aria-label="Email Draft Preview">
                <div className="voice-draft-preview-header">
                  <span className="voice-draft-badge">📝 Email Draft Preview</span>
                  {dialogState?.step === "CONFIRM" && (
                    <span className="voice-draft-pending-pill">
                      ⏳ Awaiting Confirmation
                    </span>
                  )}
                </div>

                <div className="voice-draft-grid">
                  <div className="voice-draft-row">
                    <span className="draft-row-label">To:</span>
                    <span className="draft-row-value">
                      {dialogState.draft.to || (
                        <em className="draft-placeholder">Awaiting recipient...</em>
                      )}
                    </span>
                  </div>

                  <div className="voice-draft-row">
                    <span className="draft-row-label">Subject:</span>
                    <span className="draft-row-value">
                      {dialogState.draft.subject || (
                        <em className="draft-placeholder">Inferred from context or awaiting subject...</em>
                      )}
                    </span>
                  </div>

                  <div className="voice-draft-message-row">
                    <span className="draft-row-label">Message:</span>
                    <div className="draft-message-box">
                      {dialogState.draft.message || (
                        <em className="draft-placeholder">Awaiting message content...</em>
                      )}
                    </div>
                  </div>
                </div>

                {/* Send & Cancel Action Controls */}
                {dialogState?.step === "CONFIRM" && (
                  <div className="voice-draft-actions-bar">
                    <button
                      type="button"
                      className="btn-draft-send"
                      onClick={confirmAction}
                      disabled={voiceStatus === "PROCESSING"}
                      id="voice-draft-send-btn"
                    >
                      🚀 Send Email
                    </button>
                    <button
                      type="button"
                      className="btn-draft-cancel"
                      onClick={cancelAction}
                      disabled={voiceStatus === "PROCESSING"}
                      id="voice-draft-cancel-btn"
                    >
                      ✕ Cancel
                    </button>
                    <span className="draft-voice-hint">
                      Or speak naturally: "Yes", "Make it shorter", or "No"
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Multi-turn Conversation History Stream */}
            <div className="voice-history-section">
              <div className="voice-history-header">
                <span className="history-title">Conversation History</span>
                <span className="history-count">
                  {history.filter((h) => h.id !== "welcome").length} turns
                </span>
              </div>
              <div className="voice-history-scroll" ref={historyScrollRef}>
                {history.map((turn) => (
                  <div key={turn.id} className={`voice-bubble ${turn.role}`}>
                    <div className="voice-bubble-header">
                      <span className="voice-bubble-label">
                        {turn.role === "user" ? "You" : "AI Agent"}
                      </span>
                      <span className="voice-bubble-time">{turn.timestamp}</span>
                    </div>
                    <p className="voice-bubble-text">{turn.text}</p>
                  </div>
                ))}

                {/* Agent Speaking Wave Animation if actively speaking */}
                {voiceStatus === "SPEAKING" && (
                  <div className="voice-bubble agent active-speaking-bubble">
                    <div className="voice-bubble-header">
                      <span className="voice-bubble-label">AI Agent</span>
                      <span className="audio-sound-wave" aria-label="Speaking">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                    </div>
                    <p className="voice-bubble-text">{agentResponse}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Controls Bar */}
            <div className="voice-controls-row">
              {/* Live Voice Primary Button */}
              {isLiveVoice ? (
                <button
                  type="button"
                  className="btn-voice-control btn-stop-listening"
                  onClick={stopLiveVoice}
                  id="voice-live-stop-btn"
                >
                  <span className="control-icon">⏹</span>
                  <span>Turn OFF Live Voice</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-voice-control btn-start-live"
                  onClick={startLiveVoice}
                  disabled={!isSupported}
                  id="voice-live-start-btn"
                >
                  <span className="control-icon">🔴</span>
                  <span>Turn ON Live Voice</span>
                </button>
              )}

              {/* Speak / Re-speak Output */}
              <button
                type="button"
                className="btn-voice-control btn-speak-output"
                onClick={speakAgain}
                disabled={voiceStatus === "SPEAKING" || voiceStatus === "PROCESSING"}
                id="voice-speak-again-btn"
                title="Speak the agent's response aloud"
              >
                <span className="control-icon">🔊</span>
                <span>Speak Again</span>
              </button>

              {/* Interrupt / Stop Speaking */}
              <button
                type="button"
                className="btn-voice-control btn-stop-speaking"
                onClick={stopSpeaking}
                disabled={voiceStatus !== "SPEAKING"}
                id="voice-stop-speaking-btn"
                title="Stop speaking aloud"
              >
                <span className="control-icon">⏹</span>
                <span>Stop Speech</span>
              </button>
            </div>

            {/* Quick Natural Conversational Chips */}
            <div className="voice-quick-commands-section">
              <span className="quick-commands-title">Try speaking naturally:</span>
              <div className="quick-commands-chips">
                {QUICK_COMMANDS.map((cmd, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="voice-chip-btn"
                    onClick={() => sendManualCommand(cmd)}
                    disabled={voiceStatus === "PROCESSING"}
                  >
                    "{cmd}"
                  </button>
                ))}
              </div>
            </div>

            {/* Keyboard typing fallback */}
            <form onSubmit={handleManualSubmit} className="voice-manual-form">
              <input
                type="text"
                className="voice-manual-input"
                placeholder="Or type naturally (e.g. 'Send a mail to Priya', 'Make the message shorter')..."
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                disabled={voiceStatus === "PROCESSING"}
              />
              <button
                type="submit"
                className="btn-voice-send"
                disabled={!typedInput.trim() || voiceStatus === "PROCESSING"}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistantPanel;
