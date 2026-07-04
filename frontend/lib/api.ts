import type {
  CaliforniaCountiesResponse,
  CaliforniaResourceCoverageFilter,
  CaliforniaResourcesResponse,
  ChatMessage,
  ChatResponse,
  ChatStreamEvent,
  HouseholdSnapshotInput,
  LocalResource,
  PrepareResult,
  PrepPacket,
  ReadinessResult,
  VoiceStatus,
  VoiceTurnResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function apiChatMessages(messages: ChatMessage[]): Array<Pick<ChatMessage, "role" | "content">> {
  return messages.map(({ role, content }) => ({ role, content }));
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
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
    body: JSON.stringify({ messages: apiChatMessages(messages), snapshot }),
  });
}

export async function streamChatMessage(
  messages: ChatMessage[],
  snapshot: HouseholdSnapshotInput,
  handlers: {
    onStatus?: (event: Extract<ChatStreamEvent, { type: "status" }>["payload"]) => void;
    onDelta?: (text: string) => void;
    onFinal?: (response: ChatResponse) => void;
  },
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: apiChatMessages(messages), snapshot }),
  });

  if (!response.ok || !response.body) {
    return sendChatMessage(messages, snapshot);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: ChatResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const event = parseStreamEvent(part);
      if (!event) continue;
      if (event.type === "status") handlers.onStatus?.(event.payload);
      if (event.type === "delta") handlers.onDelta?.(event.payload.text);
      if (event.type === "final") {
        finalResponse = event.payload;
        handlers.onFinal?.(event.payload);
      }
    }
  }

  if (!finalResponse) {
    throw new Error("Chat stream ended before the final response.");
  }
  return finalResponse;
}

function parseStreamEvent(raw: string): ChatStreamEvent | null {
  const line = raw
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.startsWith("data: "));
  if (!line) return null;
  try {
    return JSON.parse(line.slice("data: ".length)) as ChatStreamEvent;
  } catch {
    return null;
  }
}

export async function sendVoiceTurn(
  audioBase64: string,
  messages: ChatMessage[],
  snapshot: HouseholdSnapshotInput,
): Promise<VoiceTurnResponse> {
  return apiFetch<VoiceTurnResponse>("/api/voice/turn", {
    method: "POST",
    body: JSON.stringify({ audio_base64: audioBase64, messages: apiChatMessages(messages), snapshot }),
  });
}

export async function fetchVoiceStatus(): Promise<VoiceStatus> {
  return apiFetch<VoiceStatus>("/api/voice/status");
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
