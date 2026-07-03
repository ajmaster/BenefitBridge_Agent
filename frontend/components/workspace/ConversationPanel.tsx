"use client";

import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import { copyFor } from "@/components/conversation-atlas/i18n";
import { BRAND_SHORT_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { A2UIAction, A2UITemplate } from "@/lib/types";
import { useBenefitBridgeContext } from "./BenefitBridgeContext";
import { VoiceRecorderButton } from "./VoiceRecorderButton";

// Ported from `ConversationCard` in `frontend/components/BenefitBridgeDashboard.tsx`
// (source lines 377-467), converting prop reads to `useBenefitBridgeContext()` reads.
// This is the "expanded" variant of the card (the monolith only ever rendered it with
// `expanded` set), since the workspace panel is always the persistent, full chat surface.

function toneClasses(tone: A2UITemplate["tone"]) {
  switch (tone) {
    case "success":
      return "border-green bg-green-soft";
    case "warning":
      return "border-orange bg-orange-soft";
    case "danger":
      return "border-red bg-red-soft";
    case "accent":
      return "border-blue bg-sky";
    case "source":
      return "border-line-strong bg-surface";
    case "info":
      return "border-blue/60 bg-sky/60";
    default:
      return "border-line bg-surface";
  }
}

function noticeClasses(kind: "ready" | "warn" | "error") {
  switch (kind) {
    case "error":
      return "border-red bg-red-soft text-red";
    case "warn":
      return "border-orange bg-orange-soft text-ink";
    default:
      return "border-line bg-sky/40 text-ink-soft";
  }
}

export function ConversationPanel() {
  const {
    chatMessages,
    chatTemplates,
    chatInput,
    chatBusy,
    notice,
    snapshot,
    setChatInput,
    runChat,
    runCopyCallScript,
    runDownloadCalendar,
    runDownloadMarkdown,
    runVoiceTurn,
    setActiveSection,
  } = useBenefitBridgeContext();
  const copy = copyFor(snapshot.language);

  function handleA2UIAction(action: A2UIAction) {
    switch (action.type) {
      case "open_packet":
        setActiveSection("packet");
        break;
      case "open_sources":
        setActiveSection("sources");
        break;
      case "open_resources":
        setActiveSection("resources");
        break;
      case "copy_call_script":
        void runCopyCallScript();
        break;
      case "download_markdown":
        void runDownloadMarkdown();
        break;
      case "download_calendar":
        void runDownloadCalendar();
        break;
      case "open_resource_url":
      case "open_maps_search":
        if (action.href) {
          window.open(action.href, "_blank", "noopener,noreferrer");
        }
        break;
    }
  }

  return (
    <article
      className="flex h-full flex-col gap-4 p-4"
      aria-label={copy.chatWorkspace}
      data-testid="chat-sidepanel"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AtlasIcon name="chat" className="h-5 w-5" />
          <h3 className="text-sm font-semibold text-ink">{copy.chatTitle}</h3>
        </div>
        <span className="rounded-full bg-sky px-2 py-1 text-xs font-medium text-blue-dark">
          {copy.chatBadge}
        </span>
      </div>

      {notice.text && (
        <div
          className={cn("rounded-lg border px-3 py-2 text-xs leading-5", noticeClasses(notice.kind))}
          role={notice.kind === "error" ? "alert" : "status"}
          data-testid="workspace-status"
        >
          {notice.text}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto" aria-live="polite">
        {chatMessages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              message.role === "assistant" ? "bg-sky/40 text-ink" : "ml-6 bg-blue text-white",
            )}
          >
            <span className="block text-xs font-semibold uppercase tracking-wide opacity-70">
              {message.role === "assistant" ? BRAND_SHORT_NAME : "You"}
            </span>
            <p>{message.content}</p>
          </div>
        ))}
      </div>

      {chatTemplates.length > 0 && (
        <div className="space-y-2" aria-label="Agent answer templates">
          {chatTemplates.map((template) => (
            <article
              key={template.id}
              className={cn("rounded-lg border p-3 text-sm", toneClasses(template.tone))}
              data-testid="a2ui-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-ink">{template.title}</h4>
                  {template.subtitle && <p className="text-ink-soft">{template.subtitle}</p>}
                </div>
                <span className="text-xs uppercase text-ink-soft">
                  {template.type.replaceAll("_", " ")}
                </span>
              </div>
              {template.body && <p className="mt-1 text-ink-soft">{template.body}</p>}
              {template.items.length > 0 && (
                <div className="mt-2 space-y-2">
                  {template.items.map((item, index) => (
                    <div key={`${template.id}-${index}`}>
                      {item.label && <strong className="mr-1">{item.label}</strong>}
                      {item.title && <strong className="mr-1">{item.title}</strong>}
                      {item.value && <span>{item.value}</span>}
                      {item.subtitle && <span className="text-ink-soft">{item.subtitle}</span>}
                      {item.body && <p className="text-ink-soft">{item.body}</p>}
                      {item.badges && item.badges.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.badges.map((badge) => (
                            <span
                              key={`${template.id}-${index}-${badge}`}
                              className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-ink-soft"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.links && item.links.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {item.links.map((link) => (
                            <a
                              key={`${link.label}-${link.href}`}
                              href={link.href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue underline"
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {template.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {template.actions.map((action) =>
                    action.href && action.type === "open_resource_url" ? (
                      <a
                        key={`${template.id}-${action.type}-${action.label}`}
                        href={action.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-blue"
                      >
                        {action.label}
                      </a>
                    ) : (
                      <button
                        key={`${template.id}-${action.type}-${action.label}`}
                        type="button"
                        onClick={() => handleA2UIAction(action)}
                        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-sky/50"
                      >
                        {action.label}
                      </button>
                    ),
                  )}
                </div>
              )}
              {template.citations.length > 0 && (
                <div className="mt-3 border-t border-line pt-2 text-xs text-ink-soft">
                  <span className="font-semibold text-ink">Sources:</span>{" "}
                  {template.citations.slice(0, 3).map((citation, index) => (
                    <span key={`${template.id}-${citation.source_id}`}>
                      {index > 0 ? ", " : ""}
                      {citation.url ? (
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue underline"
                        >
                          {citation.source_title ?? citation.source_id}
                        </a>
                      ) : (
                        citation.source_title ?? citation.source_id
                      )}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          runChat();
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          {copy.chatInputLabel}
        </label>
        <textarea
          id="chat-input"
          data-testid="chat-input"
          value={chatInput}
          rows={4}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder={copy.chatPlaceholder}
          className="min-h-24 rounded-lg border border-line bg-surface p-3 text-sm text-ink"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={chatBusy || !chatInput.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <AtlasIcon name="arrow" className="h-4 w-4" />
            <span>{chatBusy ? copy.chatChecking : copy.chatSend}</span>
          </button>
          <VoiceRecorderButton
            disabled={chatBusy}
            labels={{
              permissionDenied: copy.voicePermissionDenied,
              recording: copy.voiceRecording,
              speak: copy.voiceSpeak,
              stop: copy.voiceStop,
              unavailable: copy.voiceUnavailable,
              unsupported: copy.voiceNotSupported,
            }}
            onRecordingComplete={runVoiceTurn}
          />
        </div>
      </form>

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
    </article>
  );
}
