import type {
  ChatMessage,
  ChatResponse,
  ChatSession,
  PolicyCitation,
  QuickAction,
  ToolTrace,
  TypedResponsePayload,
  UiAction,
} from "./types";
import { API_BASE_URL } from "../../config";
import { authorizedFetch } from "../auth/authApi";
import { mergeAssistantAlternatives } from "./messageTransforms";

type BackendUiAction = {
  id: string;
  type: "table" | "chart" | "card" | "button";
  title: string;
  // table
  columns?: string[];
  rows?: Array<Record<string, string>>;
  // chart
  chartType?: "bar" | "line" | "pie";
  series?: Array<{ name: string; data: Array<{ label: string; value: number }> }>;
  // card / button
  description?: string;
  buttonLabel?: string;
  href?: string;
};

type BackendArtifact = {
  id: string;
  session_id: string;
  title: string;
  prompt: string;
  artifact_type: "pdf" | "pptx" | "docx" | "xlsx" | "txt";
  status: string;
  file_name: string | null;
  mime_type: string | null;
  has_preview: boolean;
  preview_url: string | null;
  download_url: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type BackendCitation = {
  label: string;
  source: string;
  uri?: string;
  image?: string;
};

type BackendError = {
  reference_id: string;
  user_message: string;
  what_i_tried: string;
  next_options: string[];
};

type BackendSkillTrace = {
  tool: string;
  status: "success" | "blocked" | "error";
  latency_ms: number;
  attempts: number;
};

type BackendChatResponse = {
  response_type: "text" | "product_card" | "order_card" | "escalation" | "refusal" | "loyalty_card";
  message: string;
  message_text: string;
  confidence_score?: number;
  payload?: TypedResponsePayload;
  policy_citations?: PolicyCitation[];
  quick_actions?: QuickAction[];
  ui_actions: BackendUiAction[];
  citations: BackendCitation[];
  tool_trace: BackendSkillTrace[];
  errors: BackendError[];
  summary?: string;
  follow_up?: string;
  show_sources?: boolean;
  session_title?: string;
};

type BackendSession = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type BackendSessionListResponse = {
  items: BackendSession[];
};

type BackendSessionMessage = {
  id: string;
  role: "user" | "assistant";
  message_text: string;
  payload_json: Record<string, unknown>;
  created_at: string;
};

type BackendTraceRow = {
  tool: string;
  status: "success" | "blocked" | "error";
  latency_ms: number;
  attempts: number;
};

type BackendSessionMessagesResponse = {
  session: BackendSession;
  messages: BackendSessionMessage[];
  traces: BackendTraceRow[];
};

const apiBase = API_BASE_URL;

const asString = (value: unknown) => (typeof value === "string" ? value : "");

function toUiAction(action: BackendUiAction): UiAction {
  return {
    id: action.id,
    type: action.type,
    title: action.title,
    columns: action.columns,
    rows: action.rows,
    chartType: action.chartType,
    series: action.series,
    description: action.description,
    buttonLabel: action.buttonLabel,
    href: action.href,
  };
}

function mapChatResponse(response: BackendChatResponse): ChatResponse {
  return {
    response_type: response.response_type,
    message: response.message,
    message_text: response.message_text,
    confidence_score: response.confidence_score,
    payload: response.payload,
    policy_citations: response.policy_citations,
    quick_actions: response.quick_actions,
    ui_actions: response.ui_actions.map(toUiAction),
    citations: response.citations.map((item) => ({
      label: item.label,
      source: item.source,
      uri: item.uri,
      image: item.image,
    })),
    tool_trace: response.tool_trace.map(
      (item): ToolTrace => ({
        tool: item.tool,
        status: item.status,
        latencyMs: item.latency_ms,
      }),
    ),
    errors: response.errors.map(
      (item) =>
        `${item.user_message} Ref: ${item.reference_id}. Next: ${item.next_options.join(" / ")}`,
    ),
    summary: response.summary,
    follow_up: response.follow_up,
    showSources: response.show_sources,
    session_title: response.session_title,
  };
}

function mapSession(session: BackendSession): ChatSession {
  return {
    id: session.id,
    name: session.title,
    role: "agent",
    updatedAt: session.updated_at,
    messages: [],
  };
}

function mapSessionMessages(payload: BackendSessionMessagesResponse): ChatMessage[] {
  const traces = payload.traces.map(
    (item): ToolTrace => ({
      tool: item.tool,
      status: item.status,
      latencyMs: item.latency_ms,
    }),
  );

  const lastAssistantIndex = [...payload.messages]
    .map((message, idx) => ({ idx, role: message.role }))
    .reverse()
    .find((item) => item.role === "assistant")?.idx;

  // First pass - map each DB row to a ChatMessage.
  const flat: ChatMessage[] = payload.messages.map((message, idx) => {
    const rawActions = message.payload_json.ui_actions as BackendUiAction[] | undefined;
    const rawCitations = (message.payload_json.citations as BackendCitation[] | undefined) ?? [];
    const rawErrors = (message.payload_json.errors as BackendError[] | undefined) ?? [];
    const mapped = rawActions ? rawActions.map(toUiAction) : undefined;

    return {
      id: message.id,
      role: message.role,
      text: message.message_text,
      responseType:
        typeof message.payload_json.response_type === "string"
          ? (message.payload_json.response_type as ChatResponse["response_type"])
          : undefined,
      confidenceScore:
        typeof message.payload_json.confidence_score === "number"
          ? message.payload_json.confidence_score
          : undefined,
      payload:
        message.payload_json.payload && typeof message.payload_json.payload === "object"
          ? (message.payload_json.payload as TypedResponsePayload)
          : undefined,
      policyCitations: Array.isArray(message.payload_json.policy_citations)
        ? (message.payload_json.policy_citations as PolicyCitation[])
        : undefined,
      quickActions: Array.isArray(message.payload_json.quick_actions)
        ? (message.payload_json.quick_actions as QuickAction[])
        : undefined,
      timestamp: message.created_at,
      uiActions: mapped,
      citations: rawCitations.map((item) => ({
        label: item.label,
        source: item.source,
        uri: item.uri,
        image: item.image,
      })),
      toolTrace: idx === lastAssistantIndex ? traces : undefined,
      errors: rawErrors.map((item) => `${item.user_message} Ref: ${item.reference_id}`),
      summary: typeof message.payload_json.summary === "string" ? message.payload_json.summary : undefined,
      follow_up: typeof message.payload_json.follow_up === "string" ? message.payload_json.follow_up : undefined,
      showSources: typeof message.payload_json.show_sources === "boolean" ? message.payload_json.show_sources : undefined,
    };
  });

  return mergeAssistantAlternatives(flat);
}

export async function listSessionsApi(): Promise<ChatSession[]> {
  const response = await authorizedFetch(`${apiBase}/sessions`);
  if (!response.ok) {
    throw new Error("Failed to list sessions");
  }
  const payload = (await response.json()) as BackendSessionListResponse;
  return payload.items.map(mapSession);
}

export async function createSessionApi(sessionId: string, title: string): Promise<ChatSession> {
  const response = await authorizedFetch(`${apiBase}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: sessionId, title }),
  });
  if (!response.ok) {
    throw new Error("Failed to create session");
  }
  const payload = (await response.json()) as BackendSession;
  return mapSession(payload);
}

export async function fetchSessionMessagesApi(sessionId: string): Promise<ChatMessage[]> {
  const response = await authorizedFetch(`${apiBase}/sessions/${sessionId}/messages`);
  if (!response.ok) {
    throw new Error("Failed to load messages");
  }
  const payload = (await response.json()) as BackendSessionMessagesResponse;
  return mapSessionMessages(payload);
}

export async function deleteSessionApi(sessionId: string): Promise<void> {
  const response = await authorizedFetch(`${apiBase}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete session");
  }
}

export async function renameSessionApi(sessionId: string, title: string): Promise<void> {
  const response = await authorizedFetch(`${apiBase}/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    throw new Error("Failed to rename session");
  }
}

export async function sendChatPromptApi(
  sessionId: string,
  prompt: string,
  modes: { research: boolean; thinking: boolean } = { research: false, thinking: true },
): Promise<ChatResponse> {
  const response = await authorizedFetch(`${apiBase}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      prompt,
      context: { modes },
    }),
  });
  const payload = (await response.json()) as BackendChatResponse;
  if (!response.ok) {
    return mapChatResponse(payload);
  }
  return mapChatResponse(payload);
}

type StreamEvent =
  | { type: "status"; phase: string; message: string }
  | { type: "token"; token: string }
  | { type: "result"; payload: BackendChatResponse }
  | { type: "error"; payload: BackendChatResponse };

export async function sendChatPromptStreamApi(
  sessionId: string,
  prompt: string,
  modes: { research: boolean; thinking: boolean },
  onDelta: (delta: string) => void,
  onStatus?: (phase: string, message: string) => void,
  isRetry = false,
): Promise<ChatResponse> {
  const response = await authorizedFetch(`${apiBase}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      prompt,
      is_retry: isRetry || undefined,
      context: { modes },
    }),
  });

  if (!response.body) {
    return sendChatPromptApi(sessionId, prompt, modes);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: BackendChatResponse | null = null;
  let errorPayload: BackendChatResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const event = JSON.parse(trimmed) as StreamEvent;
        if (event.type === "status") {
          onStatus?.(event.phase, event.message);
        } else if (event.type === "token") {
          onDelta(event.token);
        } else if (event.type === "result") {
          finalPayload = event.payload;
        } else if (event.type === "error") {
          errorPayload = event.payload;
        }
      } catch {
        // Ignore malformed stream chunks.
      }
    }
  }

  if (errorPayload) {
    return mapChatResponse(errorPayload);
  }

  if (finalPayload) {
    return mapChatResponse(finalPayload);
  }

  return sendChatPromptApi(sessionId, prompt, modes);
}

export async function fetchArtifactApi(
  artifactId: string,
): Promise<BackendArtifact> {
  const response = await authorizedFetch(`${apiBase}/artifacts/${artifactId}`);
  if (!response.ok) {
    throw new Error("Failed to load artifact");
  }
  return (await response.json()) as BackendArtifact;
}

export async function fetchArtifactPreviewApi(previewUrl: string): Promise<string> {
  const response = await authorizedFetch(`${apiBase}${previewUrl}`);
  if (!response.ok) {
    throw new Error("Failed to load artifact preview");
  }
  return response.text();
}

export async function downloadArtifactApi(downloadUrl: string, fileName: string): Promise<void> {
  const response = await authorizedFetch(`${apiBase}${downloadUrl}`);
  if (!response.ok) {
    throw new Error("Failed to download artifact");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
