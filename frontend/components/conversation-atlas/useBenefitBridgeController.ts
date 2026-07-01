"use client";

import { useEffect, useState } from "react";

import {
  exportPacket,
  fetchReadiness,
  fetchResources,
  preparePacket,
  sendChatMessage,
  translatePacket,
} from "../../lib/api";
import type {
  A2UITemplate,
  ChatMessage,
  HouseholdSnapshotInput,
  Language,
  LocalResource,
  PrepareResult,
  ReadinessResult,
  SyntheticProfile,
} from "../../lib/types";
import { fallbackResult, syntheticProfiles } from "../../data/syntheticProfiles";
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
  | "bay-area";

export function useBenefitBridgeController() {
  const [selectedProfileId, setSelectedProfileId] = useState(syntheticProfiles[0].id);
  const [snapshot, setSnapshot] = useState<HouseholdSnapshotInput>(
    syntheticProfiles[0].snapshot,
  );
  const [userText, setUserText] = useState(syntheticProfiles[0].userText);
  const [result, setResult] = useState<PrepareResult>(fallbackResult);
  const [resources, setResources] = useState<LocalResource[]>(fallbackResources);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: copyFor(syntheticProfiles[0].snapshot.language).chatStarter,
    },
  ]);
  const [chatTemplates, setChatTemplates] = useState<A2UITemplate[]>([]);
  const [chatInput, setChatInput] = useState(
    "I am in San Jose and need food, health coverage, and utility help.",
  );
  const [notice, setNotice] = useState<Notice>({
    kind: "ready",
    text: copyFor(syntheticProfiles[0].snapshot.language).noticeReady,
  });
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<AtlasSection>("chat");

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
            ? `API unavailable: ${error.message}. Showing deterministic demo packet.`
            : text.noticeFallback,
      });
    } finally {
      setBusy(false);
    }
  }

  async function runChat(messageText?: string) {
    const content = (messageText ?? chatInput).trim();
    if (!content || chatBusy) return;

    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatBusy(true);
    setNotice({ kind: "ready", text: copyFor(snapshot.language).noticeChat });

    try {
      const response = await sendChatMessage(nextMessages, snapshot);
      setChatMessages([...nextMessages, { role: "assistant", content: response.message }]);
      setChatTemplates(response.ui_templates);
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
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? `Chat workflow unavailable: ${error.message}`
            : "Chat workflow unavailable.",
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
      const response = await exportPacket(packet, ["html", "json", "md"]);
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
    setChatMessages((messages) => {
      if (messages.length === 1 && messages[0].role === "assistant") {
        return [{ role: "assistant", content: copyFor(language).chatStarter }];
      }
      return messages;
    });
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
    runExport,
    runPrepare,
    runTranslate,
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
  };
}
