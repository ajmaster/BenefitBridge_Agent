"use client";

import { copyFor } from "@/components/conversation-atlas/i18n";
import { useBenefitBridgeContext } from "@/components/workspace/BenefitBridgeContext";
import { BoundaryList } from "@/components/workspace/shared/BoundaryList";
import { ResultStackPreview } from "@/components/workspace/shared/ResultStackPreview";

// Section body ported from the "chat" `SectionFrame` in
// `frontend/components/BenefitBridgeDashboard.tsx` (source lines 239-258: the
// `.chatSectionGrid` two-column layout of a copy column with `BoundaryList` and the
// `AtlasResultStack`/`ResultStackPreview`). The persistent chat input itself is NOT
// rendered here - it lives permanently in `ConversationPanel` (Task 7) - but the source's
// "expanded" quick-prompt chips (`copy.quickPrompts`, source lines 457-463) are surfaced
// here too per the Task 9 brief, calling the controller's `runChat` directly.

export function ChatSection() {
  const { snapshot, displayResources, packet, validationPass, chatBusy, runChat } =
    useBenefitBridgeContext();
  const copy = copyFor(snapshot.language);

  return (
    <div className="grid gap-6">
      <div>
        <span className="text-sm font-semibold text-ink-soft">{copy.sections.chat}</span>
        <h1 className="text-2xl font-semibold text-ink">{copy.sectionCopy.chat.title}</h1>
        <p className="mt-1 text-muted">{copy.sectionCopy.chat.body}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)]">
        <div className="grid gap-3 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
          <h3 className="text-lg font-semibold text-ink">{copy.chatWorkspace}</h3>
          <p className="text-muted">{copy.sectionCopy.chat.body}</p>
          <BoundaryList copy={copy.boundary} />
        </div>
        <ResultStackPreview
          packet={packet}
          resources={displayResources}
          validationPass={validationPass}
          copy={copy}
        />
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Example prompts">
        {copy.quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => runChat(prompt)}
            disabled={chatBusy}
            className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft transition-colors hover:bg-sky/40 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
