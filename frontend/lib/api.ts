import type {
  ChatMessage,
  ChatResponse,
  HouseholdSnapshotInput,
  LocalResource,
  PrepareResult,
  PrepPacket,
  ReadinessResult,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json();
  if (!response.ok) {
    const message =
      body?.detail?.message ?? body?.error?.message ?? `Request failed: ${response.status}`;
    throw new Error(message);
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

export async function preparePacket(
  userText: string,
  snapshot: HouseholdSnapshotInput,
): Promise<PrepareResult> {
  return apiFetch<PrepareResult>("/api/prepare", {
    method: "POST",
    body: JSON.stringify({ user_text: userText, snapshot }),
  });
}

export async function exportPacket(packet: PrepPacket, formats: string[]) {
  return apiFetch<{ artifacts: Array<{ format: string; content: string; storage: string }> }>(
    "/api/export",
    {
      method: "POST",
      body: JSON.stringify({ packet, formats }),
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
