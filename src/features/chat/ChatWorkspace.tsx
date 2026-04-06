import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { AccessRequestModal } from "../access-requests/AccessRequestModal";
import { createAccessRequestApi } from "../access-requests/accessRequestsApi";
import type { AuthenticatedUser } from "../auth/authApi";
import { MessageList } from "./MessageList";
import { PromptComposer } from "./PromptComposer";
import {
  createSessionApi,
  fetchSessionMessagesApi,
  deleteSessionApi,
  renameSessionApi,
  listSessionsApi,
  sendChatPromptStreamApi,
} from "./chatApi";
import type { ChatMessage, ChatSession } from "./types";
import { getStorageItem, removeStorageItem, setStorageItem } from "../../utils/storage";
import { createAssistantMessageFields, createMessageAlternative } from "./messageTransforms";

const mkId = () => Math.random().toString(36).slice(2, 10);

const RESEARCH_MODE_KEY = (sessionId: string) => `research_mode_${sessionId}`;
const THINKING_MODE_KEY = (sessionId: string) => `thinking_mode_${sessionId}`;
const ACTIVE_SESSION_KEY = "active_session_id";

function loadActiveSessionId(): string {
  return getStorageItem(ACTIVE_SESSION_KEY) ?? "";
}

function saveActiveSessionId(id: string): void {
  setStorageItem(ACTIVE_SESSION_KEY, id);
}

function loadResearchMode(sessionId: string): boolean {
  return getStorageItem(RESEARCH_MODE_KEY(sessionId)) === "true";
}

function saveResearchMode(sessionId: string, value: boolean): void {
  setStorageItem(RESEARCH_MODE_KEY(sessionId), String(value));
}

function clearResearchMode(sessionId: string): void {
  removeStorageItem(RESEARCH_MODE_KEY(sessionId));
}

function loadThinkingMode(sessionId: string): boolean {
  const value = getStorageItem(THINKING_MODE_KEY(sessionId));
  return value === null ? true : value === "true";
}

function saveThinkingMode(sessionId: string, value: boolean): void {
  setStorageItem(THINKING_MODE_KEY(sessionId), String(value));
}

function clearThinkingMode(sessionId: string): void {
  removeStorageItem(THINKING_MODE_KEY(sessionId));
}

type HealthStatus = "loading" | "ok" | "error";

type ChatWorkspaceProps = {
  user: AuthenticatedUser;
  onLogout: () => Promise<void>;
};

export function ChatWorkspace({ user, onLogout }: ChatWorkspaceProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [backendStatus, setBackendStatus] = useState<HealthStatus>("loading");
  const [researchMode, setResearchMode] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(true);
  const [isAccessRequestModalOpen, setIsAccessRequestModalOpen] = useState(false);
  const [suggestedAccessResource, setSuggestedAccessResource] = useState("");
  const [accessRequestNotice, setAccessRequestNotice] = useState("");

  // Sync per-session modes from localStorage whenever the active session changes.
  useEffect(() => {
    if (activeSessionId) {
      setResearchMode(loadResearchMode(activeSessionId));
      setThinkingMode(loadThinkingMode(activeSessionId));
      saveActiveSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  const toggleResearch = () => {
    if (!activeSessionId) return;
    const next = !researchMode;
    setResearchMode(next);
    saveResearchMode(activeSessionId, next);
  };

  const toggleThinking = () => {
    if (!activeSessionId) return;
    const next = !thinkingMode;
    setThinkingMode(next);
    saveThinkingMode(activeSessionId, next);
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("health failed");
        }
        setBackendStatus("ok");
      })
      .catch(() => setBackendStatus("error"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const existing = await listSessionsApi();
        if (cancelled) {
          return;
        }
        if (existing.length > 0) {
          setSessions(existing);
          const savedId = loadActiveSessionId();
          const validId = existing.find((s) => s.id === savedId)?.id ?? existing[0].id;
          setActiveSessionId(validId);
        } else {
          const created = await createSessionApi(`session-${mkId()}`, "New Chat");
          if (!cancelled) {
            setSessions([created]);
            setActiveSessionId(created.id);
          }
        }
      } catch {
        const localSession: ChatSession = {
          id: `session-${mkId()}`,
          name: "New Chat",
          role: "agent",
          updatedAt: new Date().toISOString(),
          messages: [],
        };
        if (!cancelled) {
          setSessions([localSession]);
          setActiveSessionId(localSession.id);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      if (!activeSessionId || activeSessionId === "local-fallback-session") {
        return;
      }
      try {
        const messages = await fetchSessionMessagesApi(activeSessionId);
        if (cancelled) {
          return;
        }
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  messages,
                }
              : session,
          ),
        );
      } catch {
        // Keep current session state if message loading fails.
      }
    };

    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeSessionId]);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const activeMessages = activeSession?.messages ?? [];

  const updateActiveSession = (updater: (session: ChatSession) => ChatSession) => {
    setSessions((prev) =>
      prev.map((session) => (session.id === activeSessionId ? updater(session) : session)),
    );
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await deleteSessionApi(sessionId);
    } catch {
      // Continue with local removal even if backend call fails.
    }
    clearResearchMode(sessionId);
    clearThinkingMode(sessionId);
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0]?.id ?? "");
      }
      return remaining;
    });
  };

  const renameSession = async (sessionId: string, newName: string) => {
    try {
      await renameSessionApi(sessionId, newName);
    } catch {
      // Still update locally on failure.
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, name: newName } : s)),
    );
  };

  const createSession = async () => {
    const id = `session-${mkId()}`;
    try {
      const created = await createSessionApi(id, `New Chat ${sessions.length + 1}`);
      setSessions((prev) => [created, ...prev]);
      setActiveSessionId(created.id);
    } catch {
      const localSession: ChatSession = {
        id,
        name: `Local Chat ${sessions.length + 1}`,
        role: "agent",
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      setSessions((prev) => [localSession, ...prev]);
      setActiveSessionId(localSession.id);
    }
  };

  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const navigateAlternative = (messageId: string, index: number) => {
    updateActiveSession((session) => ({
      ...session,
      messages: session.messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, currentAlternativeIndex: index }
          : msg,
      ),
    }));
  };

  const openAccessRequestModal = (suggestedResource?: string) => {
    setSuggestedAccessResource(suggestedResource ?? "");
    setIsAccessRequestModalOpen(true);
  };

  const viewAccessRequests = () => {
    window.location.href = "/access-requests";
  };

  const submitAccessRequest = async (resourceRequested: string, justification: string) => {
    const created = await createAccessRequestApi(resourceRequested, justification);
    setAccessRequestNotice(`Access request ${created.reference_number} submitted for review.`);
  };

  const MAX_RETRIES = 3;

  const tryAgain = async (messageId: string) => {
    if (!activeSession) return;

    // Snapshot session ID immediately so we do not capture a stale active session mid-flight.
    const sessionId = activeSession.id;

    // Find the user message immediately before the target assistant message
    const msgs = activeSession.messages;
    const targetIndex = msgs.findIndex((m) => m.id === messageId);
    if (targetIndex <= 0) return;
    const targetMsg = msgs[targetIndex];
    const userMsg = msgs[targetIndex - 1];
    if (!userMsg || userMsg.role !== "user") return;

    // alternatives starts at 1 (the original answer), so retry count is length - 1.
    const currentRetries = (targetMsg.alternatives?.length ?? 1) - 1;
    if (currentRetries >= MAX_RETRIES) return;

    const prompt = userMsg.text;

    // Clear the current display and start streaming into streamingText
    updateActiveSession((session) => ({
      ...session,
      messages: session.messages.map((msg) =>
        msg.id === messageId ? { ...msg, streamingText: "" } : msg,
      ),
    }));

    setIsTyping(true);
    try {
      const response = await sendChatPromptStreamApi(
        sessionId,
        prompt,
        { research: researchMode, thinking: thinkingMode },
        (delta) => {
          // Stream each token live into streamingText.
          updateActiveSession((session) => ({
            ...session,
            messages: session.messages.map((msg) =>
              msg.id === messageId
                ? { ...msg, streamingText: (msg.streamingText ?? "") + delta }
                : msg,
            ),
          }));
        },
        (_phase, status) => setStatusMessage(status),
        true, // is_retry — skip user-turn persistence, strip prior answer from history
      );

      const newAlt = createMessageAlternative(response);

      // Commit the final response as a new alternative and clear streaming state
      updateActiveSession((session) => ({
        ...session,
        messages: session.messages.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                streamingText: undefined,
                alternatives: [...(msg.alternatives ?? []), newAlt],
                currentAlternativeIndex: (msg.alternatives?.length ?? 0),
              }
            : msg,
        ),
      }));
    } catch {
      // Retry failed, so restore the previous display by clearing streamingText.
      updateActiveSession((session) => ({
        ...session,
        messages: session.messages.map((msg) =>
          msg.id === messageId ? { ...msg, streamingText: undefined } : msg,
        ),
      }));
    } finally {
      setIsTyping(false);
      setStatusMessage("");
    }
  };

  const sendPrompt = async (prompt: string) => {
    if (!activeSession) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg-${mkId()}`,
      role: "user",
      text: prompt,
      timestamp: new Date().toISOString(),
    };

    const assistantId = `msg-${mkId()}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      timestamp: new Date().toISOString(),
    };

    updateActiveSession((session) => ({
      ...session,
      updatedAt: userMessage.timestamp,
      messages: [...session.messages, userMessage, assistantPlaceholder],
    }));

    setIsTyping(true);
    try {
      const response = await sendChatPromptStreamApi(
        activeSession.id,
        prompt,
        { research: researchMode, thinking: thinkingMode },
        (delta) => {
          updateActiveSession((session) => ({
            ...session,
            messages: session.messages.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    text: `${message.text}${delta}`,
                  }
                : message,
            ),
          }));
        },
        (_phase, message) => {
          setStatusMessage(message);
        },
      );

      const assistantFields = createAssistantMessageFields(response);
      const firstAlt = createMessageAlternative(response);

      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== activeSession.id) return session;
          const updatedName = response.session_title ?? session.name;
          return {
            ...session,
            name: updatedName,
            updatedAt: new Date().toISOString(),
            messages: session.messages.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    ...assistantFields,
                    toolTrace: response.tool_trace,
                    errors: response.errors,
                    alternatives: [firstAlt],
                    currentAlternativeIndex: 0,
                  }
                : message,
            ),
          };
        }),
      );
    } catch {
      updateActiveSession((session) => ({
        ...session,
        updatedAt: new Date().toISOString(),
        messages: session.messages.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                text: "I couldn't complete your request due to a backend error.",
                errors: ["request_failed"],
              }
            : message,
        ),
      }));
    } finally {
      setIsTyping(false);
      setStatusMessage("");
    }
  };

  const starterMessages: ChatMessage[] = activeMessages.length > 0
    ? activeMessages
    : [
        {
          id: "starter-greeting",
          role: "assistant",
          text: "Hello! I'm Lena, your Retail Assistant. How can I help you today?",
          responseType: "text",
          quickActions: [
            { label: "Track my order", prompt: "Track my order" },
            { label: "Return an item", prompt: "Return an item" },
            { label: "Check product availability", prompt: "Check product availability" },
            { label: "View promotions", prompt: "View promotions" },
          ],
          timestamp: new Date().toISOString(),
        },
      ];

  return (
    <main className="chat-app retail-chat-app">
      <header className="retail-topbar">
        <div className="retail-topbar-brand">
          <div className="retail-logo-box">V</div>
          <div>
            <strong>Velora</strong>
            <p><span className="online-dot" /> Lena is online</p>
          </div>
        </div>
        <nav className="retail-topbar-nav">
          <a href="#orders">Orders</a>
          <a href="#returns">Returns</a>
          <a href="#support">Support</a>
        </nav>
        <div className="retail-topbar-user">
          <div className={`status-pill status-pill--${backendStatus}`}>{backendStatus}</div>
          <button type="button" className="avatar-chip" onClick={() => { void onLogout(); }} aria-label="Account">
            {user.full_name.slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>

      <section className="retail-chat-shell">
        <div className="retail-chat-main">
          {accessRequestNotice ? (
            <div className="chat-notice toast toast-success">{accessRequestNotice}</div>
          ) : null}
          <div className="retail-session-frame">
            <div className="retail-session-heading">
              <div>
                <span className="eyebrow">Customer Support</span>
                <h1>Velora Assistant</h1>
              </div>
              <p>Track orders, returns, products, promotions, and support cases with Lena.</p>
            </div>
          {activeSession ? (
            <>
              <MessageList
                messages={starterMessages}
                isTyping={isTyping}
                statusMessage={statusMessage}
                onTryAgain={(id) => { void tryAgain(id); }}
                onNavigate={navigateAlternative}
                onOpenAccessRequest={openAccessRequestModal}
                onViewAccessRequests={viewAccessRequests}
                onQuickAction={(prompt) => { void sendPrompt(prompt); }}
              />
              <PromptComposer
                onSend={sendPrompt}
                disabled={isTyping}
              />
            </>
          ) : (
            <div className="no-session-placeholder retail-empty-state">
              <p>Preparing Lena...</p>
            </div>
          )}
          </div>
        </div>
      </section>
      <AccessRequestModal
        isOpen={isAccessRequestModalOpen}
        suggestedResource={suggestedAccessResource}
        onClose={() => setIsAccessRequestModalOpen(false)}
        onSubmit={submitAccessRequest}
      />
    </main>
  );
}
