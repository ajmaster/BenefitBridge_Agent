"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, KeyboardEvent } from "react";
import AtlasIcon, { type AtlasIconName } from "@/components/workspace/icons/AtlasIcon";
import { copyFor } from "@/components/conversation-atlas/i18n";
import { BRAND_SHORT_NAME } from "@/lib/brand";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";
import type { A2UIAction, A2UITemplate, ChatMessage } from "@/lib/types";
import { useBenefitBridgeContext } from "./BenefitBridgeContext";
import { VoiceRecorderButton } from "./VoiceRecorderButton";

type ChatSurfaceVariant = "main" | "rail";
type SupportTab = "overview" | "sources" | "resources" | "packet" | "safety";

const SUPPORT_TABS: Array<{ id: SupportTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "sources", label: "Sources" },
  { id: "resources", label: "Resources" },
  { id: "packet", label: "Packet" },
  { id: "safety", label: "Safety" },
];

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

function actionIcon(actionType: A2UIAction["type"]): AtlasIconName {
  switch (actionType) {
    case "download_calendar":
      return "calendar";
    case "download_markdown":
    case "open_packet":
      return "document";
    case "open_resources":
    case "open_maps_search":
      return "map";
    case "open_sources":
    case "open_resource_url":
      return "source";
    case "copy_call_script":
      return "prepare";
    default:
      return "arrow";
  }
}

function templateTab(template: A2UITemplate): SupportTab {
  if (template.type.includes("source")) return "sources";
  if (template.type.includes("resource") || template.type.includes("handoff")) return "resources";
  if (
    template.type.includes("document") ||
    template.type.includes("packet") ||
    template.type.includes("call_script")
  ) {
    return "packet";
  }
  if (
    template.type.includes("safety") ||
    template.type.includes("privacy") ||
    template.type.includes("voice") ||
    template.type.includes("route")
  ) {
    return "safety";
  }
  return "overview";
}

function countTemplateItems(templates: A2UITemplate[]) {
  return templates.reduce((total, template) => total + Math.max(template.items.length, 1), 0);
}

export function ConversationPanel({ variant = "rail" }: { variant?: ChatSurfaceVariant }) {
  const {
    chatMessages,
    chatTemplates,
    chatDiagnostics,
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
    voiceStatus,
  } = useBenefitBridgeContext();
  const copy = copyFor(snapshot.language);
  const reducedMotion = useReducedMotion();
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);
  const readingEarlierRef = useRef(false);
  const readingTopRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [hasUnreadAssistantContent, setHasUnreadAssistantContent] = useState(false);
  const [supportDrawerOpen, setSupportDrawerOpen] = useState(false);
  const [supportDrawerTab, setSupportDrawerTab] = useState<SupportTab>("overview");
  const [debugVisible, setDebugVisible] = useState(false);
  const latestAssistantIndex = useMemo(() => {
    for (let index = chatMessages.length - 1; index >= 0; index -= 1) {
      if (chatMessages[index].role === "assistant") return index;
    }
    return -1;
  }, [chatMessages]);
  const supportCount = countTemplateItems(chatTemplates);
  const showSupport = variant === "main" && chatTemplates.length > 0;
  const showNotice = notice.text && (variant === "rail" || notice.kind !== "ready");
  const debugAllowed = process.env.NODE_ENV !== "production";

  useEffect(() => {
    const node = scrollRegionRef.current;
    if (!node) return;
    const userMovedAboveLastKnownPosition = node.scrollTop + 8 < lastScrollTopRef.current;
    if (readingEarlierRef.current || !pinnedRef.current || userMovedAboveLastKnownPosition) {
      const preserveTop = readingEarlierRef.current
        ? readingTopRef.current
        : userMovedAboveLastKnownPosition
          ? node.scrollTop
          : lastScrollTopRef.current;
      readingEarlierRef.current = true;
      readingTopRef.current = preserveTop;
      pinnedRef.current = false;
      lastScrollTopRef.current = preserveTop;
      setIsPinnedToBottom(false);
      node.scrollTop = preserveTop;
      setHasUnreadAssistantContent(chatMessages.length > 0);
      return;
    }
    window.requestAnimationFrame(() => {
      node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
      lastScrollTopRef.current = node.scrollTop;
      setHasUnreadAssistantContent(false);
    });
  }, [chatBusy, chatMessages]);

  useEffect(() => {
    const node = scrollRegionRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const userMovedAboveLastKnownPosition = node.scrollTop + 8 < lastScrollTopRef.current;
      if (pinnedRef.current && !readingEarlierRef.current && !userMovedAboveLastKnownPosition) {
        node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
        lastScrollTopRef.current = node.scrollTop;
        setHasUnreadAssistantContent(false);
      } else if (chatMessages.length > 0) {
        const preserveTop = userMovedAboveLastKnownPosition
          ? readingEarlierRef.current
            ? readingTopRef.current
            : node.scrollTop
          : lastScrollTopRef.current;
        readingEarlierRef.current = true;
        readingTopRef.current = preserveTop;
        pinnedRef.current = false;
        lastScrollTopRef.current = preserveTop;
        setIsPinnedToBottom(false);
        node.scrollTop = preserveTop;
        setHasUnreadAssistantContent(true);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [chatMessages.length]);

  function updatePinnedState() {
    const node = scrollRegionRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    const nextPinned = distanceFromBottom < 96;
    if (!nextPinned) {
      if (!readingEarlierRef.current) {
        readingTopRef.current = node.scrollTop;
      }
      readingEarlierRef.current = true;
      lastScrollTopRef.current = readingTopRef.current;
    } else if (!hasUnreadAssistantContent) {
      readingEarlierRef.current = false;
      lastScrollTopRef.current = node.scrollTop;
    }
    pinnedRef.current = nextPinned;
    setIsPinnedToBottom(nextPinned);
    if (nextPinned) setHasUnreadAssistantContent(false);
  }

  function jumpToLatest() {
    const node = scrollRegionRef.current;
    if (!node) return;
    pinnedRef.current = true;
    readingEarlierRef.current = false;
    readingTopRef.current = node.scrollHeight;
    lastScrollTopRef.current = node.scrollHeight;
    setIsPinnedToBottom(true);
    setHasUnreadAssistantContent(false);
    node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
  }

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

  function handleCopyMessage(message: ChatMessage) {
    if (!message.content) return;
    void navigator.clipboard?.writeText(message.content);
  }

  function handleRegenerate(messageIndex: number) {
    const previousUserMessage = [...chatMessages.slice(0, messageIndex)]
      .reverse()
      .find((message) => message.role === "user");
    if (!previousUserMessage || chatBusy) return;
    void runChat(previousUserMessage.content);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void runChat();
  }

  return (
    <article
      className={cn(
        "flex h-full min-h-0 flex-col",
        variant === "main"
          ? "mx-auto w-full max-w-6xl px-4 py-4 sm:px-6"
          : "gap-3 p-4",
      )}
      aria-label={copy.chatWorkspace}
      data-testid={variant === "main" ? "chat-main-surface" : "chat-rail-surface"}
    >
      <ChatHeader
        variant={variant}
        debugAllowed={debugAllowed}
        debugVisible={debugVisible}
        diagnosticsLabel={diagnosticsLabel(chatDiagnostics)}
        onToggleDebug={() => setDebugVisible((current) => !current)}
      />

      {showNotice && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs leading-5",
            variant === "main" ? "mx-auto mb-2 w-full max-w-3xl" : "",
            noticeClasses(notice.kind),
          )}
          role={notice.kind === "error" ? "alert" : "status"}
          data-testid="workspace-status"
        >
          {notice.text}
        </div>
      )}

      <div
        className={cn(
          "relative min-h-0 flex-1",
          variant === "main" ? "flex gap-4" : "",
        )}
      >
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRegionRef}
            data-testid="chat-scroll-region"
            className={cn(
              "h-full overflow-y-auto overscroll-contain pr-1",
              variant === "main" ? "mx-auto max-w-3xl space-y-5 pb-4" : "space-y-3",
            )}
            style={{ overflowAnchor: "none" }}
            onScroll={updatePinnedState}
          >
            {debugVisible && chatDiagnostics && (
              <DebugDiagnostics diagnostics={chatDiagnostics} />
            )}

            <div data-testid="chat-transcript" className="space-y-4" aria-live="polite">
              {chatMessages.length === 0 && <EmptyChatState variant={variant} />}
              {chatMessages.map((message, index) => (
                <MessageBubble
                  key={message.client_id ?? `${message.role}-${index}`}
                  message={message}
                  index={index}
                  variant={variant}
                  isLatestAssistant={index === latestAssistantIndex}
                  chatBusy={chatBusy}
                  supportCount={supportCount}
                  showSupport={showSupport}
                  supportDrawerOpen={supportDrawerOpen}
                  onOpenSupport={() => setSupportDrawerOpen(true)}
                  onCopy={() => handleCopyMessage(message)}
                  onRegenerate={() => handleRegenerate(index)}
                />
              ))}
            </div>
          </div>

          {(!isPinnedToBottom || hasUnreadAssistantContent) && chatMessages.length > 0 && (
            <button
              type="button"
              data-testid="jump-to-latest"
              onClick={jumpToLatest}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-blue shadow-atlas-soft"
            >
              {hasUnreadAssistantContent ? "New messages" : "Jump to latest"}
            </button>
          )}
        </div>

        {variant === "main" && supportDrawerOpen && (
          <SupportDrawer
            templates={chatTemplates}
            activeTab={supportDrawerTab}
            onTabChange={setSupportDrawerTab}
            onClose={() => setSupportDrawerOpen(false)}
            onAction={handleA2UIAction}
          />
        )}
      </div>

      <ChatComposer
        variant={variant}
        chatBusy={chatBusy}
        chatInput={chatInput}
        setChatInput={setChatInput}
        copy={copy}
        voiceStatus={voiceStatus}
        runChat={runChat}
        runVoiceTurn={runVoiceTurn}
        onKeyDown={handleComposerKeyDown}
      />
    </article>
  );
}

function ChatHeader({
  variant,
  debugAllowed,
  debugVisible,
  diagnosticsLabel,
  onToggleDebug,
}: {
  variant: ChatSurfaceVariant;
  debugAllowed: boolean;
  debugVisible: boolean;
  diagnosticsLabel: string;
  onToggleDebug: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        variant === "main" ? "mx-auto mb-3 w-full max-w-3xl" : "",
      )}
    >
      <div className="flex items-center gap-2">
        <AtlasIcon name="chat" className="h-5 w-5 text-blue" />
        <h1 className={cn("font-semibold text-ink", variant === "main" ? "text-lg" : "text-sm")}>
          Agent conversation
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {variant === "rail" && (
          <Link
            href="/app/chat/"
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-blue hover:bg-sky/40"
          >
            Open full chat
          </Link>
        )}
        {debugAllowed && (
          <button
            type="button"
            data-testid="chat-debug-toggle"
            onClick={onToggleDebug}
            title={diagnosticsLabel}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold",
              debugVisible
                ? "border-blue bg-sky text-blue-dark"
                : "border-line bg-white text-ink-soft hover:bg-sky/40",
            )}
          >
            Debug
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyChatState({ variant }: { variant: ChatSurfaceVariant }) {
  if (variant === "rail") {
    return (
      <div className="rounded-lg border border-line bg-white p-3 text-sm text-ink-soft">
        <p className="font-semibold text-ink">Ask a benefits question to start.</p>
        <p className="mt-1">City, county, or ZIP and broad help areas are enough.</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-[280px] place-items-center text-center">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-blue">California benefits preparation</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">Ask a question to start.</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Share a city, county, or ZIP and the broad kind of help you need. Keep private
          IDs, exact addresses, case numbers, and credentials out of chat.
        </p>
        <div className="mt-4 grid gap-2 text-left text-xs text-ink-soft sm:grid-cols-2">
          {copyFor("en").boundary.map((item) => (
            <div key={item} className="rounded-lg border border-line bg-white px-3 py-2">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  index,
  variant,
  isLatestAssistant,
  chatBusy,
  supportCount,
  showSupport,
  supportDrawerOpen,
  onOpenSupport,
  onCopy,
  onRegenerate,
}: {
  message: ChatMessage;
  index: number;
  variant: ChatSurfaceVariant;
  isLatestAssistant: boolean;
  chatBusy: boolean;
  supportCount: number;
  showSupport: boolean;
  supportDrawerOpen: boolean;
  onOpenSupport: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
}) {
  const isAssistant = message.role === "assistant";
  const label = isAssistant ? BRAND_SHORT_NAME : "You";
  return (
    <div
      className={cn(
        "group flex",
        isAssistant ? "justify-start" : "justify-end",
        variant === "rail" ? "text-sm" : "text-[15px]",
      )}
    >
      <div
        className={cn(
          "min-w-0",
          variant === "main" ? "max-w-[86%]" : "max-w-[92%]",
          !isAssistant && "rounded-2xl bg-blue px-4 py-2 text-white",
          isAssistant && variant === "rail" && "rounded-lg bg-sky/40 px-3 py-2 text-ink",
        )}
      >
        <span
          className={cn(
            "mb-1 block text-xs font-semibold uppercase opacity-70",
            variant === "main" && isAssistant ? "text-ink-soft" : "",
          )}
        >
          {label}
        </span>
        <p className="whitespace-pre-wrap leading-6">
          {message.content || (chatBusy && isLatestAssistant ? "..." : "")}
        </p>

        {isAssistant && message.content && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft opacity-100 hover:bg-sky/40 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus:opacity-100"
            >
              Copy
            </button>
            {index > 0 && variant === "main" && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={chatBusy}
                className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-soft opacity-100 hover:bg-sky/40 disabled:opacity-50 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus:opacity-100"
              >
                Regenerate
              </button>
            )}
            {isLatestAssistant && showSupport && (
              <button
                type="button"
                data-testid="chat-support-toggle"
                onClick={onOpenSupport}
                aria-expanded={supportDrawerOpen}
                className="rounded-full border border-blue/30 bg-sky px-2.5 py-1 text-xs font-semibold text-blue-dark hover:bg-sky/70"
              >
                Support ({supportCount})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SupportDrawer({
  templates,
  activeTab,
  onTabChange,
  onClose,
  onAction,
}: {
  templates: A2UITemplate[];
  activeTab: SupportTab;
  onTabChange: (tab: SupportTab) => void;
  onClose: () => void;
  onAction: (action: A2UIAction) => void;
}) {
  const visibleTemplates =
    activeTab === "overview"
      ? templates
      : templates.filter((template) => templateTab(template) === activeTab);
  const fallbackTemplates = visibleTemplates.length > 0 ? visibleTemplates : templates;

  return (
    <aside
      data-testid="chat-support-drawer"
      className="absolute inset-0 z-20 flex min-h-0 flex-col rounded-lg border border-line bg-white shadow-atlas lg:static lg:w-96 lg:shrink-0"
      aria-label="Conversation support"
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">Support</h2>
          <p className="text-xs text-ink-soft">Sources, resources, and next actions.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink-soft hover:bg-sky/40"
        >
          Close
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-line px-2 py-2">
        {SUPPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              activeTab === tab.id
                ? "bg-blue text-white"
                : "border border-line bg-surface text-ink-soft hover:bg-sky/40",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {fallbackTemplates.map((template) => (
          <SupportTemplateCard
            key={template.id}
            template={template}
            onAction={onAction}
          />
        ))}
      </div>
    </aside>
  );
}

function SupportTemplateCard({
  template,
  onAction,
}: {
  template: A2UITemplate;
  onAction: (action: A2UIAction) => void;
}) {
  return (
    <article
      className={cn("rounded-lg border p-3 text-sm", toneClasses(template.tone))}
      data-testid="a2ui-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink">{template.title}</h3>
          {template.subtitle && <p className="text-ink-soft">{template.subtitle}</p>}
        </div>
        <span className="text-xs uppercase text-ink-soft" data-testid="a2ui-card-type">
          {template.type.replaceAll("_", " ")}
        </span>
      </div>
      {template.body && <p className="mt-1 text-ink-soft">{template.body}</p>}
      {template.items.length > 0 && (
        <div className="mt-2 space-y-2">
          {template.items.map((item, index) => (
            <div key={`${template.id}-${index}`} className="rounded-md bg-white/70 p-2">
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
                      title={link.href}
                      className="inline-flex items-center gap-1 text-blue underline"
                    >
                      <AtlasIcon name="external" className="h-3 w-3" />
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
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-blue hover:bg-sky/40"
              >
                <AtlasIcon name="external" className="h-3 w-3" />
                {action.label}
              </a>
            ) : (
              <button
                key={`${template.id}-${action.type}-${action.label}`}
                type="button"
                onClick={() => onAction(action)}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-sky/50"
              >
                <AtlasIcon name={actionIcon(action.type)} className="h-3 w-3" />
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
            <span
              key={`${template.id}-${citation.source_id}`}
              className="group relative inline-flex"
            >
              {index > 0 ? ", " : ""}
              {citation.url ? (
                <a href={citation.url} target="_blank" rel="noreferrer" className="text-blue underline">
                  {citation.source_title ?? citation.source_id}
                </a>
              ) : (
                citation.source_title ?? citation.source_id
              )}
              <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-64 rounded-lg border border-line bg-white p-2 text-left text-xs text-ink shadow-atlas-soft group-hover:block group-focus-within:block">
                <span className="block font-semibold">
                  {citation.source_title ?? citation.source_id}
                </span>
                {citation.agency_owner && <span className="block">{citation.agency_owner}</span>}
                {citation.freshness_state && (
                  <span className="block">Freshness: {citation.freshness_state}</span>
                )}
              </span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function ChatComposer({
  variant,
  chatBusy,
  chatInput,
  setChatInput,
  copy,
  voiceStatus,
  runChat,
  runVoiceTurn,
  onKeyDown,
}: {
  variant: ChatSurfaceVariant;
  chatBusy: boolean;
  chatInput: string;
  setChatInput: (value: string) => void;
  copy: ReturnType<typeof copyFor>;
  voiceStatus: ComponentProps<typeof VoiceRecorderButton>["status"];
  runChat: (messageText?: string) => void;
  runVoiceTurn: (audioBlob: Blob) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const showPrompts = variant === "main";
  return (
    <div
      data-testid="chat-composer"
      className={cn(
        "shrink-0 border-t border-line bg-surface pt-3",
        variant === "main" ? "mx-auto w-full max-w-3xl" : "space-y-3",
      )}
    >
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void runChat();
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          {copy.chatInputLabel}
        </label>
        <div className="flex items-end gap-2 rounded-xl border border-line bg-white p-2 shadow-atlas-soft">
          <textarea
            id="chat-input"
            data-testid="chat-input"
            value={chatInput}
            rows={variant === "main" ? 1 : 2}
            onKeyDown={onKeyDown}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder={copy.chatPlaceholder}
            className="max-h-36 min-h-11 flex-1 resize-none border-0 bg-transparent p-2 text-sm text-ink outline-none focus-visible:outline-none"
          />
          <VoiceRecorderButton
            disabled={chatBusy}
            status={voiceStatus}
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
          <button
            type="submit"
            disabled={chatBusy || !chatInput.trim()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue text-white disabled:opacity-50"
            aria-label={chatBusy ? copy.chatChecking : copy.chatSend}
          >
            <AtlasIcon name="arrow" className="h-4 w-4" />
          </button>
        </div>
      </form>

      {showPrompts && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Example prompts">
          {copy.quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => runChat(prompt)}
              disabled={chatBusy}
              className="rounded-full border border-line bg-white px-3 py-1 text-xs text-ink-soft transition-colors hover:bg-sky/40 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DebugDiagnostics({
  diagnostics,
}: {
  diagnostics: NonNullable<ReturnType<typeof useBenefitBridgeContext>["chatDiagnostics"]>;
}) {
  return (
    <div
      data-testid="chat-diagnostics"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-soft"
      title={diagnostics.fallback_reason ?? diagnostics.response_mode}
    >
      <span className="font-semibold text-ink">
        {diagnostics.llm_invoked ? "Gemini via ADK" : "Deterministic fallback"}
      </span>
      <span>{diagnostics.model_name ?? diagnostics.response_mode}</span>
      {diagnostics.fallback_code && (
        <span className="text-muted">{diagnostics.fallback_code.replaceAll("_", " ")}</span>
      )}
      {diagnostics.graph_events.length > 0 && (
        <span className="text-muted">{diagnostics.graph_events.join(" -> ")}</span>
      )}
    </div>
  );
}

function diagnosticsLabel(
  diagnostics: ReturnType<typeof useBenefitBridgeContext>["chatDiagnostics"],
) {
  if (!diagnostics) return "No chat diagnostics yet.";
  const mode = diagnostics.llm_invoked ? "Gemini via ADK" : "Deterministic fallback";
  return diagnostics.fallback_code
    ? `${mode}: ${diagnostics.fallback_code.replaceAll("_", " ")}`
    : mode;
}
