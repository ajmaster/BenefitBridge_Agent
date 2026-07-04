"use client";

import { useEffect, useRef, useState } from "react";

import {
  exportPacket,
  fetchVoiceStatus,
  fetchReadiness,
  fetchResources,
  preparePacket,
  sendChatMessage,
  sendVoiceTurn,
  streamChatMessage,
  translatePacket,
} from "../../lib/api";
import { blobToBase64, playAudioBase64 } from "../../lib/audio";
import type {
  A2UITemplate,
  ChatDiagnostics,
  ChatMessage,
  HouseholdSnapshotInput,
  Language,
  LocalResource,
  PrepareResult,
  ReadinessResult,
  SyntheticProfile,
  VoiceStatus,
} from "../../lib/types";
import { fallbackResult, syntheticProfiles } from "../../data/syntheticProfiles";
import { getStoredLocale } from "@/lib/locale-storage";
import { copyFor } from "./i18n";

export type NoticeKind = "ready" | "warn" | "error";

export type Notice = {
  kind: NoticeKind;
  text: string;
};

export const fallbackResources: LocalResource[] = [
  {
    id: "second-harvest-demo",
    organization: "Second Harvest of Silicon Valley",
    service_name: "Food connection",
    service_type: "food",
    jurisdiction: "Santa Clara County",
    phone: "1-800-984-3663",
    url: "https://www.shfb.org/get-food/",
    map_query: "Second Harvest of Silicon Valley Food Connection Santa Clara County",
    maps_url:
      "https://www.google.com/maps/search/?api=1&query=Second%20Harvest%20of%20Silicon%20Valley%20Food%20Connection%20Santa%20Clara%20County",
    languages: ["en", "es"],
    call_before_going: true,
    availability_notice: "Call before going.",
  },
  {
    id: "scc-ssa-demo",
    organization: "Santa Clara County Social Services Agency",
    service_name: "Public benefits help",
    service_type: "county services",
    jurisdiction: "Santa Clara County",
    url: "https://ssa.santaclaracounty.gov/apply-public-benefits",
    map_query: "Santa Clara County Social Services Agency public benefits Santa Clara County",
    maps_url:
      "https://www.google.com/maps/search/?api=1&query=Santa%20Clara%20County%20Social%20Services%20Agency%20public%20benefits%20Santa%20Clara%20County",
    languages: ["en", "es"],
    call_before_going: true,
    availability_notice: "Office details can change.",
  },
];

export type AtlasSection =
  | "chat"
  | "prepare"
  | "sources"
  | "resources"
  | "packet"
  | "california";

const COMPACT_CHAT_TEMPLATE_TYPES = new Set([
  "fact_summary",
  "question_set",
  "benefit_paths",
  "local_resources",
  "source_links",
  "privacy_notice",
  "safety_handoff",
  "route_status",
  "voice_status",
]);

function compactChatTemplates(templates: A2UITemplate[]): A2UITemplate[] {
  return templates.filter((template) => COMPACT_CHAT_TEMPLATE_TYPES.has(template.type));
}

export function useBenefitBridgeController() {
  const [selectedProfileId, setSelectedProfileId] = useState(syntheticProfiles[0].id);
  const [snapshot, setSnapshot] = useState<HouseholdSnapshotInput>(() => ({
    ...syntheticProfiles[0].snapshot,
    language: getStoredLocale() ?? "en",
  }));
  const [userText, setUserText] = useState(syntheticProfiles[0].userText);
  const [result, setResult] = useState<PrepareResult>(fallbackResult);
  const [resources, setResources] = useState<LocalResource[]>(fallbackResources);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({
    enabled: false,
    available: false,
    provider: "disabled",
    live: false,
    reason: "loading",
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatTemplates, setChatTemplates] = useState<A2UITemplate[]>([]);
  const [chatDiagnostics, setChatDiagnostics] = useState<ChatDiagnostics | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [notice, setNotice] = useState<Notice>(() => ({
    kind: "ready",
    text: copyFor(getStoredLocale() ?? "en").noticeReady,
  }));
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<AtlasSection>("chat");
  const chatMessageCounterRef = useRef(0);

  const packet = result.packet ?? fallbackResult.packet;
  const validationPass = result.validation?.pass ?? false;
  const displayResources = resources.length > 0 ? resources : fallbackResources;

  useEffect(() => {
    fetchReadiness()
      .then(setReadiness)
      .catch(() => {
        setReadiness(null);
      });
  }, []);

  useEffect(() => {
    fetchVoiceStatus()
      .then(setVoiceStatus)
      .catch(() => {
        setVoiceStatus({
          enabled: false,
          available: false,
          provider: "disabled",
          live: false,
          reason: "api_unavailable",
        });
      });
  }, []);

  async function runPrepare(profile?: SyntheticProfile) {
    const nextSnapshot = profile?.snapshot ?? snapshot;
    const nextText = profile?.userText ?? userText;
    const text = copyFor(nextSnapshot.language);
    setBusy(true);
    setNotice({ kind: "ready", text: text.noticePreparing });
    try {
      const prepared = await preparePacket(nextText, nextSnapshot);
      setResult(prepared);
      if (prepared.route === "privacy_block") {
        setNotice({
          kind: "warn",
          text: text.noticePrivacy,
        });
      } else {
        setNotice({
          kind: "ready",
          text: text.noticePrepared,
        });
      }
      await refreshResources(nextSnapshot);
    } catch (error) {
      setResult(fallbackResult);
      setNotice({
        kind: "warn",
        text:
          error instanceof Error
            ? `API unavailable: ${error.message}. Showing a local prep packet.`
            : text.noticeFallback,
      });
    } finally {
      setBusy(false);
    }
  }

  async function runChat(messageText?: string) {
    const content = (messageText ?? chatInput).trim();
    if (!content || chatBusy) return;

    const nextMessages: ChatMessage[] = [...chatMessages, createChatMessage("user", content)];
    const assistantMessage = createChatMessage("assistant", "");
    setChatMessages(nextMessages);
    setChatInput("");
    setChatBusy(true);
    setNotice({ kind: "ready", text: copyFor(snapshot.language).noticeChat });

    try {
      let streamedText = "";
      setChatMessages([...nextMessages, assistantMessage]);
      const response = await streamChatMessage(nextMessages, snapshot, {
        onStatus: (status) => {
          setNotice({ kind: "ready", text: status.message });
        },
        onDelta: (text) => {
          streamedText += text;
          updateChatMessage(assistantMessage.client_id, streamedText.trim());
        },
      });
      applyChatResponse(nextMessages, response, assistantMessage.client_id);
    } catch (error) {
      try {
        const response = await sendChatMessage(nextMessages, snapshot);
        applyChatResponse(nextMessages, response, assistantMessage.client_id);
      } catch (fallbackError) {
        const message =
          fallbackError instanceof Error
            ? `Chat workflow unavailable: ${fallbackError.message}`
            : "Chat workflow unavailable.";
        updateChatMessage(assistantMessage.client_id, message);
        setNotice({
          kind: "error",
          text: message,
        });
      }
    } finally {
      setChatBusy(false);
    }
  }

  function createChatMessage(role: ChatMessage["role"], content: string): ChatMessage {
    chatMessageCounterRef.current += 1;
    return {
      role,
      content,
      client_id: `message-${Date.now()}-${chatMessageCounterRef.current}`,
    };
  }

  function updateChatMessage(clientId: string | undefined, content: string) {
    if (!clientId) return;
    setChatMessages((messages) =>
      messages.map((message) =>
        message.client_id === clientId ? { ...message, content } : message,
      ),
    );
  }

  function applyChatResponse(
    nextMessages: ChatMessage[],
    response: Awaited<ReturnType<typeof sendChatMessage>>,
    assistantClientId?: string,
  ) {
    const assistantMessage = createChatMessage("assistant", response.message);
    if (assistantClientId) {
      setChatMessages((messages) =>
        messages.map((message) =>
          message.client_id === assistantClientId
            ? { ...message, content: response.message }
            : message,
        ),
      );
    } else {
      setChatMessages([...nextMessages, assistantMessage]);
    }
    setChatTemplates(compactChatTemplates(response.ui_templates));
    setChatDiagnostics(
      response.diagnostics ??
        (response.response_mode
          ? {
              response_mode: response.response_mode,
              llm_invoked: Boolean(response.llm_invoked),
              model_name: response.model_name,
              fallback_reason: response.fallback_reason,
              fallback_code: response.fallback_code,
              graph_events: response.events,
            }
          : null),
    );
    setSnapshot(response.snapshot);

    if (response.packet) {
      setResult({
        route: response.route,
        events: response.events,
        packet: response.packet,
        validation: response.validation,
      });
    }
    if (response.resources && response.resources.length > 0) {
      setResources(response.resources);
    }

    setNotice({
      kind: response.route === "privacy_block" ? "warn" : "ready",
      text:
        response.route === "privacy_block"
          ? copyFor(response.snapshot.language).noticeChatBlocked
          : copyFor(response.snapshot.language).noticeChatUpdated,
    });
  }

  async function runVoiceTurn(audioBlob: Blob) {
    if (chatBusy) return;
    setChatBusy(true);
    setNotice({ kind: "ready", text: copyFor(snapshot.language).noticeChat });

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const response = await sendVoiceTurn(audioBase64, chatMessages, snapshot);
      const nextMessages: ChatMessage[] = [
        ...chatMessages,
        createChatMessage("user", response.transcript),
        createChatMessage("assistant", response.message),
      ];
      setChatMessages(nextMessages);
      setChatTemplates(compactChatTemplates(response.ui_templates));
      setSnapshot(response.snapshot);

      if (response.packet) {
        setResult({
          route: response.route,
          events: response.events,
          packet: response.packet,
          validation: response.validation,
        });
      }
      if (response.resources && response.resources.length > 0) {
        setResources(response.resources);
      }
      if (response.audio_base64) {
        playAudioBase64(response.audio_base64);
      }

      setNotice({
        kind: response.route === "privacy_block" ? "warn" : "ready",
        text:
          response.route === "privacy_block"
            ? copyFor(response.snapshot.language).noticeChatBlocked
            : copyFor(response.snapshot.language).noticeChatUpdated,
      });
    } catch (error) {
      setVoiceStatus((current) => ({
        ...current,
        available: false,
        live: false,
        reason: error instanceof Error ? error.message : "voice_turn_failed",
      }));
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? `Voice turn unavailable: ${error.message}`
            : "Voice turn unavailable.",
      });
    } finally {
      setChatBusy(false);
    }
  }

  async function refreshResources(nextSnapshot: HouseholdSnapshotInput) {
    const jurisdiction = nextSnapshot.location_text || "San Jose, CA";
    const need = nextSnapshot.needs[0] ?? "food";
    try {
      const response = await fetchResources(jurisdiction, need);
      if (response.resources.length > 0) {
        setResources(response.resources);
      }
    } catch {
      setResources(fallbackResources);
    }
  }

  async function runExport() {
    if (!packet) return;
    setBusy(true);
    try {
      const response = await exportPacket(packet, ["html", "json", "md"], displayResources);
      setNotice({
        kind: "ready",
        text: `Export prepared in-session: ${response.artifacts
          .map((artifact) => artifact.format.toUpperCase())
          .join(", ")}.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? `Export blocked: ${error.message}`
            : "Export blocked by validation.",
      });
    } finally {
      setBusy(false);
    }
  }

  function runPrintPacket() {
    if (!packet || typeof window === "undefined") return;
    setNotice({
      kind: "ready",
      text: copyFor(snapshot.language).noticePrintReady,
    });
    window.print();
  }

  async function runCopyCallScript() {
    if (!packet?.call_script) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(packet.call_script);
      setNotice({
        kind: "ready",
        text: copyFor(snapshot.language).noticeCallScriptCopied,
      });
    } catch {
      setNotice({
        kind: "error",
        text: copyFor(snapshot.language).noticeCallScriptBlocked,
      });
    } finally {
      setBusy(false);
    }
  }

  async function runDownloadMarkdown() {
    if (!packet) return;
    setBusy(true);
    try {
      const response = await exportPacket(packet, ["md"], displayResources);
      const artifact = response.artifacts.find((item) => item.format === "md");
      if (!artifact) {
        throw new Error("Markdown export was not returned.");
      }
      const blob = new Blob([artifact.content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "aidatlasca-prep-documents.md";
      link.click();
      URL.revokeObjectURL(url);
      setNotice({
        kind: "ready",
        text: copyFor(snapshot.language).noticeMarkdownReady,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? `Markdown download blocked: ${error.message}`
            : "Markdown download blocked by validation.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function runDownloadCalendar() {
    if (!packet) return;
    setBusy(true);
    try {
      const response = await exportPacket(packet, ["ics"]);
      const artifact = response.artifacts.find((item) => item.format === "ics");
      if (!artifact) {
        throw new Error("Calendar export was not returned.");
      }
      const blob = new Blob([artifact.content], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "aidatlasca-reminders.ics";
      link.click();
      URL.revokeObjectURL(url);
      setNotice({
        kind: "ready",
        text: copyFor(snapshot.language).noticeCalendarReady,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? `Calendar export blocked: ${error.message}`
            : "Calendar export blocked by validation.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function runTranslate() {
    if (!packet) return;
    setBusy(true);
    try {
      await translatePacket(packet);
      setNotice({
        kind: "ready",
        text: copyFor("es").noticeTranslated,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? `Spanish translation blocked: ${error.message}`
            : "Spanish translation blocked by validation.",
      });
    } finally {
      setBusy(false);
    }
  }

  function updateSnapshot<K extends keyof HouseholdSnapshotInput>(
    key: K,
    value: HouseholdSnapshotInput[K],
  ) {
    setSnapshot((current) => ({ ...current, [key]: value }));
  }

  function setLanguage(language: Language) {
    setSnapshot((current) => ({ ...current, language }));
    setNotice({ kind: "ready", text: copyFor(language).noticeReady });
  }

  function toggleNeed(need: string) {
    const exists = snapshot.needs.includes(need);
    const nextNeeds = exists
      ? snapshot.needs.filter((item) => item !== need)
      : [...snapshot.needs, need];
    updateSnapshot("needs", nextNeeds);
  }

  function handleSelectProfile(profileId: string) {
    const nextProfile = syntheticProfiles.find((profile) => profile.id === profileId);
    setSelectedProfileId(profileId);
    if (nextProfile) {
      setSnapshot(nextProfile.snapshot);
      setUserText(nextProfile.userText);
      setChatTemplates([]);
      void runPrepare(nextProfile);
    }
  }

  return {
    activeSection,
    busy,
    chatBusy,
    chatDiagnostics,
    chatInput,
    chatMessages,
    chatTemplates,
    displayResources,
    handleSelectProfile,
    notice,
    packet,
    readiness,
    result,
    runChat,
    runDownloadCalendar,
    runDownloadMarkdown,
    runExport,
    runPrintPacket,
    runCopyCallScript,
    runPrepare,
    runTranslate,
    runVoiceTurn,
    selectedProfileId,
    setActiveSection,
    setChatInput,
    setLanguage,
    setUserText,
    snapshot,
    toggleNeed,
    updateSnapshot,
    userText,
    validationPass,
    voiceStatus,
  };
}
