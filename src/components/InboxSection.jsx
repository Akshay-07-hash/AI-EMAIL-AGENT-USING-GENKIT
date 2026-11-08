// src/components/InboxSection.jsx
// ============================================================================
// Inbox Section Container
// ============================================================================
// Conditionally renders:
// - ComposeModal (when Compose Email is clicked)
// - EmailDetail (when an email is clicked)
// - InboxList (when viewing the email list)
// ============================================================================

import React from "react";
import { useGmail } from "../context/GmailContext";
import { InboxList } from "./InboxList";
import { EmailDetail } from "./EmailDetail";
import { ComposeModal } from "./ComposeModal";

export const InboxSection = () => {
  const { selectedEmail } = useGmail();

  return (
    <div className="inbox-section-wrapper">
      {/* Compose Email Modal */}
      <ComposeModal />

      {/* Main View: Detail vs List */}
      {selectedEmail ? <EmailDetail /> : <InboxList />}
    </div>
  );
};
