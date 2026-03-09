import type { ChatMessage, ChatResponse, ChatSession, ToolTrace, UiAction } from "./types";
import { API_BASE_URL } from "../../config";

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
  message_text: string;
  ui_actions: BackendUiAction[];
  citations: BackendCitation[];
  tool_trace: BackendSkillTrace[];
  errors: BackendError[];
  summary?: string;
  follow_up?: string;
  show_sources?: boolean;
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

type BackendPresentation = {
  id: string;
  session_id: string;
  title: string;
  prompt: string;
  status: string;
  html_content: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type BackendExportResponse = {
  presentation_id: string;
  format: "pdf" | "pptx";
  file_name: string;
  download_url: string;
  mime_type: string;
  note?: string;
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
    message_text: response.message_text,
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

  // First pass — map each DB row to a ChatMessage
  const flat: ChatMessage[] = payload.messages.map((message, idx) => {
    const rawActions = message.payload_json.ui_actions as BackendUiAction[] | undefined;
    const rawCitations = (message.payload_json.citations as BackendCitation[] | undefined) ?? [];
    const rawErrors = (message.payload_json.errors as BackendError[] | undefined) ?? [];
    const mapped = rawActions ? rawActions.map(toUiAction) : undefined;

    return {
      id: message.id,
      role: message.role,
      text: message.message_text,
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

  // Second pass — fold consecutive assistant messages (retries) into
  // the preceding assistant message's alternatives array so the UI
  // renders them as a single bubble with arrow navigation.
  const merged: ChatMessage[] = [];
  for (const msg of flat) {
    const prev = merged[merged.length - 1];
    if (msg.role === "assistant" && prev?.role === "assistant") {
      // Build the alternatives list if not already started
      const existingAlts = prev.alternatives ?? [
        { text: prev.text, uiActions: prev.uiActions, citations: prev.citations,
          summary: prev.summary, follow_up: prev.follow_up, showSources: prev.showSources },
      ];
      const newAlt = {
        text: msg.text, uiActions: msg.uiActions, citations: msg.citations,
        summary: msg.summary, follow_up: msg.follow_up, showSources: msg.showSources,
      };
      merged[merged.length - 1] = {
        ...prev,
        alternatives: [...existingAlts, newAlt],
        currentAlternativeIndex: existingAlts.length, // show the newest
      };
    } else {
      if (msg.role === "assistant") {
        // Wrap in alternatives structure so the action bar renders correctly
        merged.push({
          ...msg,
          alternatives: [{
            text: msg.text, uiActions: msg.uiActions, citations: msg.citations,
            summary: msg.summary, follow_up: msg.follow_up, showSources: msg.showSources,
          }],
          currentAlternativeIndex: 0,
        });
      } else {
        merged.push(msg);
      }
    }
  }
  return merged;
}

export async function listSessionsApi(): Promise<ChatSession[]> {
  const response = await fetch(`${apiBase}/sessions`);
  if (!response.ok) {
    throw new Error("Failed to list sessions");
  }
  const payload = (await response.json()) as BackendSessionListResponse;
  return payload.items.map(mapSession);
}

export async function createSessionApi(sessionId: string, title: string): Promise<ChatSession> {
  const response = await fetch(`${apiBase}/sessions`, {
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
  const response = await fetch(`${apiBase}/sessions/${sessionId}/messages`);
  if (!response.ok) {
    throw new Error("Failed to load messages");
  }
  const payload = (await response.json()) as BackendSessionMessagesResponse;
  return mapSessionMessages(payload);
}

export async function deleteSessionApi(sessionId: string): Promise<void> {
  const response = await fetch(`${apiBase}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete session");
  }
}

export async function renameSessionApi(sessionId: string, title: string): Promise<void> {
  const response = await fetch(`${apiBase}/sessions/${sessionId}`, {
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
  modes: { research: boolean } = { research: false },
): Promise<ChatResponse> {
  const response = await fetch(`${apiBase}/chat`, {
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
  modes: { research: boolean },
  onDelta: (delta: string) => void,
  onStatus?: (phase: string, message: string) => void,
  isRetry = false,
): Promise<ChatResponse> {
  const response = await fetch(`${apiBase}/chat/stream`, {
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

export async function fetchPresentationApi(
  presentationId: string,
): Promise<BackendPresentation> {
  const response = await fetch(`${apiBase}/presentations/${presentationId}`);
  if (!response.ok) {
    throw new Error("Failed to load presentation");
  }
  return (await response.json()) as BackendPresentation;
}

export async function exportPresentationApi(
  presentationId: string,
  format: "pdf" | "pptx",
): Promise<BackendExportResponse> {
  const response = await fetch(`${apiBase}/presentations/${presentationId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "Failed to export presentation");
  }
  return (await response.json()) as BackendExportResponse;
}
