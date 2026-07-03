import { authEnabled, getFirebaseAuth } from "./firebase";
import type {
  CaliforniaCountiesResponse,
  CaliforniaResourceCoverageFilter,
  CaliforniaResourcesResponse,
  ChatMessage,
  ChatResponse,
  HouseholdSnapshotInput,
  LocalResource,
  PrepareResult,
  PrepPacket,
  ReadinessResult,
  VoiceTurnResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function authHeaders(): Promise<Record<string, string>> {
  if (!authEnabled) return {};
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(await authHeaders()),
      ...(init?.headers ?? {}),
    },
  });

  const rawBody = await response.text();
  let body: unknown = null;
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const payload = body as
      | { detail?: { message?: string }; error?: { message?: string } }
      | null;
    const message =
      payload?.detail?.message ??
      payload?.error?.message ??
      (response.status === 404
        ? "AidAtlasCA API is not available at this preview URL."
        : `Request failed: ${response.status}`);
    throw new Error(message);
  }
  if (body === null) {
    throw new Error("AidAtlasCA API returned a non-JSON response.");
  }
  return body as T;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  snapshot: HouseholdSnapshotInput,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages, snapshot }),
  });
}

export async function sendVoiceTurn(
  audioBase64: string,
  messages: ChatMessage[],
  snapshot: HouseholdSnapshotInput,
): Promise<VoiceTurnResponse> {
  return apiFetch<VoiceTurnResponse>("/api/voice/turn", {
    method: "POST",
    body: JSON.stringify({ audio_base64: audioBase64, messages, snapshot }),
  });
}

export async function preparePacket(
  userText: string,
  snapshot: HouseholdSnapshotInput,
): Promise<PrepareResult> {
  return apiFetch<PrepareResult>("/api/prepare", {
    method: "POST",
    body: JSON.stringify({ user_text: userText, snapshot }),
  });
}

export async function exportPacket(
  packet: PrepPacket,
  formats: string[],
  resources?: LocalResource[],
) {
  return apiFetch<{ artifacts: Array<{ format: string; content: string; storage: string }> }>(
    "/api/export",
    {
      method: "POST",
      body: JSON.stringify({ packet, formats, resources }),
    },
  );
}

export async function translatePacket(packet: PrepPacket) {
  return apiFetch("/api/translate", {
    method: "POST",
    body: JSON.stringify({ packet, target_language: "es" }),
  });
}

export async function fetchReadiness(): Promise<ReadinessResult> {
  return apiFetch<ReadinessResult>("/api/eval/readiness");
}

export async function fetchResources(
  jurisdiction: string,
  needType: string,
): Promise<{ resources: LocalResource[]; availability_notice: string }> {
  const params = new URLSearchParams({ jurisdiction, need_type: needType });
  return apiFetch<{ resources: LocalResource[]; availability_notice: string }>(
    `/api/resources?${params.toString()}`,
  );
}

export async function fetchCaliforniaCounties(): Promise<CaliforniaCountiesResponse> {
  return apiFetch<CaliforniaCountiesResponse>("/api/california/counties");
}

export async function fetchCaliforniaResources({
  county,
  needType,
  coverage = "all",
  limit = 12,
}: {
  county: string;
  needType: string;
  coverage?: CaliforniaResourceCoverageFilter;
  limit?: number;
}): Promise<CaliforniaResourcesResponse> {
  const params = new URLSearchParams({
    county,
    need_type: needType,
    coverage,
    limit: String(limit),
  });
  return apiFetch<CaliforniaResourcesResponse>(
    `/api/california/resources?${params.toString()}`,
  );
}
