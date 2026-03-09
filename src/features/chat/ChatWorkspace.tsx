import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { MessageList } from "./MessageList";
import { PromptComposer } from "./PromptComposer";
import { SessionList } from "./SessionList";
import {
  createSessionApi,
  fetchSessionMessagesApi,
  deleteSessionApi,
  renameSessionApi,
  listSessionsApi,
  sendChatPromptStreamApi,
} from "./chatApi";
import type { ChatMessage, ChatSession, MessageAlternative } from "./types";

const mkId = () => Math.random().toString(36).slice(2, 10);

const RESEARCH_MODE_KEY = (sessionId: string) => `research_mode_${sessionId}`;
const ACTIVE_SESSION_KEY = "active_session_id";

function loadActiveSessionId(): string {
  try { return localStorage.getItem(ACTIVE_SESSION_KEY) ?? ""; }
  catch { return ""; }
}

function saveActiveSessionId(id: string): void {
  try { localStorage.setItem(ACTIVE_SESSION_KEY, id); }
  catch { /* ignore */ }
}

function loadResearchMode(sessionId: string): boolean {
  try {
    return localStorage.getItem(RESEARCH_MODE_KEY(sessionId)) === "true";
  } catch {
    return false;
  }
}

function saveResearchMode(sessionId: string, value: boolean): void {
  try {
    localStorage.setItem(RESEARCH_MODE_KEY(sessionId), String(value));
  } catch {
    // Ignore storage errors (private browsing, quota, etc.)
  }
}

function clearResearchMode(sessionId: string): void {
  try {
    localStorage.removeItem(RESEARCH_MODE_KEY(sessionId));
  } catch {
    // Ignore.
  }
}

type HealthStatus = "loading" | "ok" | "error";

export function ChatWorkspace() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [backendStatus, setBackendStatus] = useState<HealthStatus>("loading");
  const [researchMode, setResearchMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sync research mode from localStorage whenever the active session changes.
  useEffect(() => {
    if (activeSessionId) {
      setResearchMode(loadResearchMode(activeSessionId));
      saveActiveSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  const toggleResearch = () => {
    if (!activeSessionId) return;
    const next = !researchMode;
    setResearchMode(next);
    saveResearchMode(activeSessionId, next);
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
        }
      } catch {
        // Leave sessions empty; the user will see the no-session placeholder.
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

  const MAX_RETRIES = 3;

  const tryAgain = async (messageId: string) => {
    if (!activeSession) return;

    // Snapshot session ID immediately — avoids stale closure if active session changes mid-flight
    const sessionId = activeSession.id;

    // Find the user message immediately before the target assistant message
    const msgs = activeSession.messages;
    const targetIndex = msgs.findIndex((m) => m.id === messageId);
    if (targetIndex <= 0) return;
    const targetMsg = msgs[targetIndex];
    const userMsg = msgs[targetIndex - 1];
    if (!userMsg || userMsg.role !== "user") return;

    // Enforce retry cap: alternatives starts at 1 (original), so retry count = length - 1
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
        { research: researchMode },
        (delta) => {
          // Stream each token live into streamingText
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

      const newAlt: MessageAlternative = {
        text: response.message_text,
        uiActions: response.ui_actions,
        citations: response.citations,
        summary: response.summary,
        follow_up: response.follow_up,
        showSources: response.showSources,
      };

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
      // Retry failed — restore previous display by clearing streamingText
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

    updateActiveSession((session) => ({
      ...session,
      updatedAt: userMessage.timestamp,
      messages: [...session.messages, userMessage],
    }));

    const assistantId = `msg-${mkId()}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      timestamp: new Date().toISOString(),
    };

    updateActiveSession((session) => ({
      ...session,
      messages: [...session.messages, assistantPlaceholder],
    }));

    setIsTyping(true);
    try {
      const response = await sendChatPromptStreamApi(
        activeSession.id,
        prompt,
        { research: researchMode },
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

      const firstAlt: MessageAlternative = {
        text: response.message_text,
        uiActions: response.ui_actions,
        citations: response.citations,
        summary: response.summary,
        follow_up: response.follow_up,
        showSources: response.showSources,
      };

      updateActiveSession((session) => ({
        ...session,
        updatedAt: new Date().toISOString(),
        messages: session.messages.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                text: response.message_text,
                uiActions: response.ui_actions,
                citations: response.citations,
                summary: response.summary,
                follow_up: response.follow_up,
                showSources: response.showSources,
                toolTrace: response.tool_trace,
                errors: response.errors,
                alternatives: [firstAlt],
                currentAlternativeIndex: 0,
              }
            : message,
        ),
      }));
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
//Rogers Copilot
  return (
    <main className="chat-app">
      <header className="app-header">
        <div className="app-header-left">
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            ☰
          </button>
          <h1>Chat Workspace</h1>
        </div>
        <div className="status-pill" data-status={backendStatus}>
          API: {backendStatus}
        </div>
      </header>

      <section className={`chat-layout${sidebarOpen ? "" : " chat-layout--sidebar-closed"}`}>
        <SessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onCreateSession={() => { void createSession(); }}
          onSelectSession={setActiveSessionId}
          onDeleteSession={(id) => { void deleteSession(id); }}
          onRenameSession={(id, name) => { void renameSession(id, name); }}
        />

        <div className="chat-main">
          {activeSession ? (
            <>
              <MessageList
                messages={activeMessages}
                isTyping={isTyping}
                statusMessage={statusMessage}
                onTryAgain={(id) => { void tryAgain(id); }}
                onNavigate={navigateAlternative}
              />
              <PromptComposer
                onSend={sendPrompt}
                disabled={isTyping}
                researchMode={researchMode}
                onToggleResearch={toggleResearch}
              />
            </>
          ) : (
            <div className="no-session-placeholder">
              <p>No chat session selected. Create a new session to get started.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
