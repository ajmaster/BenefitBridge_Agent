"use client";

import { ConversationPanel } from "@/components/workspace/ConversationPanel";

export function ChatSection() {
  return (
    <div className="h-full min-h-[calc(100dvh-64px)] lg:min-h-0" data-testid="chat-route">
      <ConversationPanel variant="main" />
    </div>
  );
}
