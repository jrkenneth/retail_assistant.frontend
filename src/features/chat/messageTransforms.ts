import type { ChatMessage, ChatResponse, MessageAlternative } from "./types";

type AssistantMessageFields = Pick<
  ChatMessage,
  | "text"
  | "responseType"
  | "confidenceScore"
  | "payload"
  | "policyCitations"
  | "quickActions"
  | "uiActions"
  | "citations"
  | "summary"
  | "follow_up"
  | "showSources"
>;

export function createAssistantMessageFields(response: ChatResponse): AssistantMessageFields {
  return {
    text: response.message_text,
    responseType: response.response_type,
    confidenceScore: response.confidence_score,
    payload: response.payload,
    policyCitations: response.policy_citations,
    quickActions: response.quick_actions,
    uiActions: response.ui_actions,
    citations: response.citations,
    summary: response.summary,
    follow_up: response.follow_up,
    showSources: response.showSources,
  };
}

export function createMessageAlternative(response: ChatResponse): MessageAlternative {
  return createAssistantMessageFields(response);
}

export function createAlternativeFromMessage(
  message: Pick<
    ChatMessage,
    | "text"
    | "responseType"
    | "confidenceScore"
    | "payload"
    | "policyCitations"
    | "quickActions"
    | "uiActions"
    | "citations"
    | "summary"
    | "follow_up"
    | "showSources"
  >,
): MessageAlternative {
  return {
    text: message.text,
    responseType: message.responseType,
    confidenceScore: message.confidenceScore,
    payload: message.payload,
    policyCitations: message.policyCitations,
    quickActions: message.quickActions,
    uiActions: message.uiActions,
    citations: message.citations,
    summary: message.summary,
    follow_up: message.follow_up,
    showSources: message.showSources,
  };
}

export function mergeAssistantAlternatives(messages: ChatMessage[]): ChatMessage[] {
  const merged: ChatMessage[] = [];

  for (const message of messages) {
    const previous = merged[merged.length - 1];
    if (message.role === "assistant" && previous?.role === "assistant") {
      const existingAlternatives = previous.alternatives ?? [createAlternativeFromMessage(previous)];
      merged[merged.length - 1] = {
        ...previous,
        alternatives: [...existingAlternatives, createAlternativeFromMessage(message)],
        currentAlternativeIndex: existingAlternatives.length,
      };
      continue;
    }

    merged.push(
      message.role === "assistant"
        ? {
            ...message,
            alternatives: [createAlternativeFromMessage(message)],
            currentAlternativeIndex: 0,
          }
        : message,
    );
  }

  return merged;
}
