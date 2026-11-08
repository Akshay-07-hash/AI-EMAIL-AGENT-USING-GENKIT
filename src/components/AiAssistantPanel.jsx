// src/components/AiAssistantPanel.jsx
// ============================================================================
// AI Assistant Panel Component (Step 5 - Gemini + Genkit)
// ============================================================================
// Provides interactive AI features for the current email:
// A. AI Summarize (3-5 bullet points)
// B. AI Email Category (Important, Work, Personal, Promotion, Finance, Social, Other)
// C. AI Reply Suggestions (Professional, Friendly, Short -> inserts into ReplyBox)
// D. Ask AI About Email (Interactive Q&A with suggested prompts)
// ============================================================================

import React, { useState, useEffect } from "react";
import {
  summarizeEmailContent,
  categorizeEmailContent,
  suggestEmailReplies,
  askQuestionAboutEmail,
  checkAiStatus,
} from "../services/aiEmailService";

const SUGGESTED_QUESTIONS = [
  "What is this email about?",
  "What action do I need to take?",
  "What is the deadline?",
  "Who sent this email?",
  "What are the important points?",
];

const CATEGORY_COLORS = {
  Important: { bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5", icon: "🚨" },
  Work: { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd", icon: "💼" },
  Personal: { bg: "#f0fdf4", text: "#15803d", border: "#86efac", icon: "🌱" },
  Promotion: { bg: "#fffbeb", text: "#b45309", border: "#fcd34d", icon: "🏷️" },
  Finance: { bg: "#faf5ff", text: "#7e22ce", border: "#d8b4fe", icon: "💳" },
  Social: { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8", icon: "👥" },
  Other: { bg: "#f8fafc", text: "#475569", border: "#cbd5e1", icon: "📁" },
};

export const AiAssistantPanel = ({ email, onSelectReplyDraft, onCategoryUpdated }) => {
  const [aiStatus, setAiStatus] = useState({ geminiConfigured: true, checking: true });

  // Feature A: Summary state
  const [summaryData, setSummaryData] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Feature B: Category state
  const [categoryData, setCategoryData] = useState(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  // Feature C: Reply Suggestions state
  const [repliesData, setRepliesData] = useState(null);
  const [isSuggestingReplies, setIsSuggestingReplies] = useState(false);
  const [repliesError, setRepliesError] = useState("");

  // Feature D: Ask AI state
  const [showAskAi, setShowAskAi] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [qnaList, setQnaList] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState("");

  // Clean email text for AI consumption
  const cleanBodyText = email?.body?.plain || email?.body?.content || email?.snippet || "";

  // Check backend status on mount
  useEffect(() => {
    checkAiStatus().then((status) => {
      setAiStatus({ geminiConfigured: status.geminiConfigured, checking: false });
    });
  }, []);

  // Handle Feature A: AI Summarize
  const handleSummarize = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setSummaryError("");

    try {
      const result = await summarizeEmailContent({
        emailContent: cleanBodyText,
        subject: email.subject,
        sender: email.senderName || email.senderEmail,
      });
      setSummaryData(result);
    } catch (err) {
      setSummaryError(err.message || "Failed to generate summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Handle Feature B: AI Categorize
  const handleCategorize = async () => {
    if (isCategorizing) return;
    setIsCategorizing(true);
    setCategoryError("");

    try {
      const result = await categorizeEmailContent({
        emailContent: cleanBodyText,
        subject: email.subject,
        sender: email.senderName || email.senderEmail,
      });
      setCategoryData(result);
      if (onCategoryUpdated) {
        onCategoryUpdated(result);
      }
    } catch (err) {
      setCategoryError(err.message || "Failed to categorize email.");
    } finally {
      setIsCategorizing(false);
    }
  };

  // Handle Feature C: Suggest Reply
  const handleSuggestReplies = async () => {
    if (isSuggestingReplies) return;
    setIsSuggestingReplies(true);
    setRepliesError("");

    try {
      const result = await suggestEmailReplies({
        emailContent: cleanBodyText,
        subject: email.subject,
        sender: email.senderName || email.senderEmail,
      });
      setRepliesData(result);
    } catch (err) {
      setRepliesError(err.message || "Failed to generate reply suggestions.");
    } finally {
      setIsSuggestingReplies(false);
    }
  };

  // Handle Feature D: Ask AI Question
  const handleAskQuestion = async (questionToAsk) => {
    const q = (questionToAsk || userQuestion).trim();
    if (!q || isAsking) return;

    setIsAsking(true);
    setAskError("");
    setShowAskAi(true);

    try {
      const result = await askQuestionAboutEmail({
        emailContent: cleanBodyText,
        question: q,
        subject: email.subject,
        sender: email.senderName || email.senderEmail,
      });

      setQnaList((prev) => [
        {
          question: q,
          answer: result.answer,
          foundInEmail: result.foundInEmail,
          actionRecommendation: result.actionRecommendation,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev,
      ]);

      setUserQuestion("");
    } catch (err) {
      setAskError(err.message || "Failed to answer question.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleCopySummary = () => {
    if (!summaryData) return;
    const textToCopy = `${summaryData.summary}\n\nKey Points:\n${summaryData.bulletPoints
      .map((pt) => `• ${pt}`)
      .join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="ai-assistant-panel" role="region" aria-label="AI Email Assistant">
      {/* Panel Header */}
      <div className="ai-panel-header">
        <div className="ai-brand-badge">
          <span className="ai-sparkle-icon">✨</span>
          <span className="ai-brand-title">Gemini AI Assistant</span>
          <span className="ai-badge-pill">Google Genkit</span>
        </div>

        {/* API Key Status Notice */}
        {!aiStatus.checking && !aiStatus.geminiConfigured && (
          <div className="ai-key-warning" title="Add GEMINI_API_KEY in functions/.env">
            <span className="warning-dot"></span>
            <span>Gemini API Key Needed in functions/.env</span>
          </div>
        )}
      </div>

      {/* Main AI Action Buttons */}
      <div className="ai-action-buttons-grid">
        {/* A. AI Summarize Button */}
        <button
          type="button"
          className={`btn-ai-action ${summaryData ? "active" : ""}`}
          onClick={handleSummarize}
          disabled={isSummarizing}
          id="ai-summarize-btn"
        >
          {isSummarizing ? (
            <>
              <span className="btn-spinner ai"></span>
              <span>Summarizing...</span>
            </>
          ) : (
            <>
              <span className="ai-icon">📝</span>
              <span>AI Summarize</span>
            </>
          )}
        </button>

        {/* B. AI Category Button */}
        <button
          type="button"
          className={`btn-ai-action ${categoryData ? "active" : ""}`}
          onClick={handleCategorize}
          disabled={isCategorizing}
          id="ai-categorize-btn"
        >
          {isCategorizing ? (
            <>
              <span className="btn-spinner ai"></span>
              <span>Categorizing...</span>
            </>
          ) : (
            <>
              <span className="ai-icon">🏷️</span>
              <span>AI Category</span>
            </>
          )}
        </button>

        {/* C. Suggest Reply Button */}
        <button
          type="button"
          className={`btn-ai-action ${repliesData ? "active" : ""}`}
          onClick={handleSuggestReplies}
          disabled={isSuggestingReplies}
          id="ai-suggest-reply-btn"
        >
          {isSuggestingReplies ? (
            <>
              <span className="btn-spinner ai"></span>
              <span>Drafting...</span>
            </>
          ) : (
            <>
              <span className="ai-icon">💡</span>
              <span>Suggest Reply</span>
            </>
          )}
        </button>

        {/* D. Ask AI Toggle Button */}
        <button
          type="button"
          className={`btn-ai-action ${showAskAi ? "active" : ""}`}
          onClick={() => setShowAskAi(!showAskAi)}
          id="ai-ask-toggle-btn"
        >
          <span className="ai-icon">💬</span>
          <span>Ask AI</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* FEATURE B: AI CATEGORY RESULT BADGE                                 */}
      {/* =================================================================== */}
      {categoryData && (
        <div
          className="ai-category-result-card"
          style={{
            borderColor: CATEGORY_COLORS[categoryData.category]?.border || "#cbd5e1",
            background: CATEGORY_COLORS[categoryData.category]?.bg || "#f8fafc",
          }}
        >
          <div className="category-card-top">
            <div className="category-tag-group">
              <span className="category-emoji">
                {CATEGORY_COLORS[categoryData.category]?.icon || "🏷️"}
              </span>
              <span
                className="category-name-badge"
                style={{ color: CATEGORY_COLORS[categoryData.category]?.text || "#1e293b" }}
              >
                {categoryData.category}
              </span>
              <span className="confidence-pill">{categoryData.confidence} Confidence</span>
              {categoryData.actionNeeded && (
                <span className="action-needed-pill">Action Required</span>
              )}
            </div>
            <button
              type="button"
              className="card-dismiss-btn"
              onClick={() => setCategoryData(null)}
              title="Dismiss"
            >
              &times;
            </button>
          </div>
          <p className="category-reason-text">{categoryData.reason}</p>
        </div>
      )}

      {categoryError && (
        <div className="ai-error-banner" role="alert">
          <span>⚠️ {categoryError}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* FEATURE A: AI EMAIL SUMMARY DISPLAY                                 */}
      {/* =================================================================== */}
      {summaryData && (
        <div className="ai-summary-card">
          <div className="summary-card-header">
            <div className="summary-title-group">
              <span className="summary-sparkle">✨</span>
              <h4>Email Summary</h4>
              <span className="bullet-count-badge">
                {summaryData.bulletPoints?.length || 0} Key Points
              </span>
            </div>
            <div className="summary-card-actions">
              <button
                type="button"
                className="btn-copy-summary"
                onClick={handleCopySummary}
                title="Copy Summary to Clipboard"
              >
                {copiedSummary ? "✓ Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="card-dismiss-btn"
                onClick={() => setSummaryData(null)}
                title="Close"
              >
                &times;
              </button>
            </div>
          </div>

          <p className="summary-overview-text">{summaryData.summary}</p>

          <ul className="summary-bullets-list">
            {summaryData.bulletPoints?.map((bullet, idx) => (
              <li key={idx} className="summary-bullet-item">
                <span className="bullet-indicator">•</span>
                <span className="bullet-content">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summaryError && (
        <div className="ai-error-banner" role="alert">
          <span>⚠️ {summaryError}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* FEATURE C: AI REPLY SUGGESTIONS                                     */}
      {/* =================================================================== */}
      {repliesData?.replies && (
        <div className="ai-replies-container">
          <div className="replies-container-header">
            <div className="replies-title-group">
              <span>💡</span>
              <h4>Suggested Reply Drafts</h4>
              <span className="replies-hint">(Click to insert into reply editor)</span>
            </div>
            <button
              type="button"
              className="card-dismiss-btn"
              onClick={() => setRepliesData(null)}
              title="Close"
            >
              &times;
            </button>
          </div>

          <div className="replies-cards-grid">
            {/* 1. Professional Draft */}
            <div className="reply-suggestion-card professional">
              <div className="suggestion-card-top">
                <span className="tone-badge professional">👔 Professional</span>
                <button
                  type="button"
                  className="btn-insert-reply"
                  onClick={() => onSelectReplyDraft(repliesData.replies.professional)}
                  title="Insert into reply editor"
                >
                  Use Draft &rarr;
                </button>
              </div>
              <p className="suggestion-text">{repliesData.replies.professional}</p>
            </div>

            {/* 2. Friendly Draft */}
            <div className="reply-suggestion-card friendly">
              <div className="suggestion-card-top">
                <span className="tone-badge friendly">😊 Friendly</span>
                <button
                  type="button"
                  className="btn-insert-reply"
                  onClick={() => onSelectReplyDraft(repliesData.replies.friendly)}
                  title="Insert into reply editor"
                >
                  Use Draft &rarr;
                </button>
              </div>
              <p className="suggestion-text">{repliesData.replies.friendly}</p>
            </div>

            {/* 3. Short Draft */}
            <div className="reply-suggestion-card short">
              <div className="suggestion-card-top">
                <span className="tone-badge short">⚡ Short</span>
                <button
                  type="button"
                  className="btn-insert-reply"
                  onClick={() => onSelectReplyDraft(repliesData.replies.short)}
                  title="Insert into reply editor"
                >
                  Use Draft &rarr;
                </button>
              </div>
              <p className="suggestion-text">{repliesData.replies.short}</p>
            </div>
          </div>
        </div>
      )}

      {repliesError && (
        <div className="ai-error-banner" role="alert">
          <span>⚠️ {repliesError}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* FEATURE D: ASK AI ABOUT THIS EMAIL                                 */}
      {/* =================================================================== */}
      {showAskAi && (
        <div className="ai-qna-section" id="ask-ai-section">
          <div className="qna-section-header">
            <div className="qna-title-group">
              <span>💬</span>
              <h4>Ask AI about this email</h4>
            </div>
            <button
              type="button"
              className="card-dismiss-btn"
              onClick={() => setShowAskAi(false)}
              title="Close"
            >
              &times;
            </button>
          </div>

          {/* Quick Suggested Question Pills */}
          <div className="suggested-pills-row">
            <span className="pills-label">Quick questions:</span>
            {SUGGESTED_QUESTIONS.map((questionText, idx) => (
              <button
                key={idx}
                type="button"
                className="question-pill-btn"
                onClick={() => handleAskQuestion(questionText)}
                disabled={isAsking}
              >
                {questionText}
              </button>
            ))}
          </div>

          {/* Question Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion();
            }}
            className="qna-input-form"
          >
            <input
              type="text"
              className="qna-input-field"
              placeholder="Ask anything about this email (e.g. deadline, next steps)..."
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              disabled={isAsking}
            />
            <button
              type="submit"
              className="btn-qna-submit"
              disabled={isAsking || !userQuestion.trim()}
            >
              {isAsking ? (
                <>
                  <span className="btn-spinner white"></span>
                  <span>Thinking...</span>
                </>
              ) : (
                <span>Ask AI</span>
              )}
            </button>
          </form>

          {askError && (
            <div className="ai-error-banner" role="alert">
              <span>⚠️ {askError}</span>
            </div>
          )}

          {/* Q&A Conversation Stream */}
          {qnaList.length > 0 && (
            <div className="qna-results-list">
              {qnaList.map((item, idx) => (
                <div key={idx} className="qna-result-card">
                  <div className="qna-user-row">
                    <span className="qna-user-tag">Q:</span>
                    <span className="qna-user-text">{item.question}</span>
                    <span className="qna-time">{item.timestamp}</span>
                  </div>
                  <div className="qna-ai-row">
                    <span className="qna-ai-avatar">✨</span>
                    <div className="qna-ai-body">
                      <p className="qna-ai-text">{item.answer}</p>
                      {item.actionRecommendation && (
                        <div className="qna-action-tip">
                          <strong>Recommended Action:</strong> {item.actionRecommendation}
                        </div>
                      )}
                      {!item.foundInEmail && (
                        <span className="not-found-hint">
                          ℹ️ Not explicitly stated in this email
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiAssistantPanel;
