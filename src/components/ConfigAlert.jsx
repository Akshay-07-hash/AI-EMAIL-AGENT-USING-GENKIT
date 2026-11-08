// src/components/ConfigAlert.jsx
// ============================================================================
// Firebase Setup Guidance Banner
// ============================================================================
// Shows a helpful setup guide if `.env` has not yet been populated with
// valid Firebase project credentials.
// ============================================================================

import React, { useState } from "react";

export const ConfigAlert = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="config-banner" role="alert">
      <div className="config-banner-content">
        <div className="config-banner-icon">⚙️</div>
        <div className="config-banner-text">
          <strong>Firebase Setup Needed:</strong> Your <code>.env</code> file is
          currently using placeholder keys. To enable Google Sign-In, please add
          your Firebase project credentials.
        </div>
        <button
          type="button"
          className="config-banner-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Hide Instructions" : "Setup Guide (3 Steps)"}
        </button>
      </div>

      {isExpanded && (
        <div className="config-banner-details">
          <ol>
            <li>
              <strong>Create or open a Firebase project:</strong> Visit the{" "}
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
              >
                Firebase Console
              </a>
              .
            </li>
            <li>
              <strong>Enable Google Sign-In:</strong> Go to{" "}
              <em>Build &gt; Authentication &gt; Sign-in method</em>, click{" "}
              <strong>Google</strong>, enable it, and save.
            </li>
            <li>
              <strong>Copy Web App Config:</strong> In <em>Project Settings &gt; General &gt; Your Apps</em>,
              select or register a Web App (<code>&lt;/&gt;</code>), copy the values into your{" "}
              <code>.env</code> file, and restart <code>npm run dev</code>.
            </li>
          </ol>
          <p className="config-note">
            💡 <em>Note:</em> In Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains,
            verify that <code>localhost</code> is listed so local testing works seamlessly.
          </p>
        </div>
      )}
    </div>
  );
};
