import { useEffect, useRef, useState } from "react";
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
  setSessionClosedApi,
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

type SessionMenuPosition = {
  top: number;
  left: number;
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
  const [openSessionMenuId, setOpenSessionMenuId] = useState<string | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [sessionMenuPosition, setSessionMenuPosition] = useState<SessionMenuPosition | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const sessionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeSessionId) {
      setResearchMode(loadResearchMode(activeSessionId));
      setThinkingMode(loadThinkingMode(activeSessionId));
      saveActiveSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(event.target as Node)) {
        setOpenSessionMenuId(null);
        setSessionMenuPosition(null);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

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
          const validId = existing.find((session) => session.id === savedId)?.id ?? existing[0].id;
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
          closedAt: null,
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
  const activeSessionIsClosed = Boolean(activeSession?.closedAt);

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
    setOpenSessionMenuId(null);
    setSessionMenuPosition(null);
    setSessions((prev) => {
      const remaining = prev.filter((session) => session.id !== sessionId);
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
      prev.map((session) => (session.id === sessionId ? { ...session, name: newName } : session)),
    );
  };

  const closeSession = async (sessionId: string) => {
    try {
      const updated = await setSessionClosedApi(sessionId, true);
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, closedAt: updated.closedAt ?? new Date().toISOString() }
            : session,
        ),
      );
    } catch {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, closedAt: new Date().toISOString() } : session,
        ),
      );
    } finally {
      setOpenSessionMenuId(null);
      setSessionMenuPosition(null);
    }
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
        closedAt: null,
        messages: [],
      };
      setSessions((prev) => [localSession, ...prev]);
      setActiveSessionId(localSession.id);
    }
  };

  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const openRenameModal = (session: ChatSession) => {
    setRenamingSessionId(session.id);
    setRenameDraft(session.name);
    setOpenSessionMenuId(null);
    setSessionMenuPosition(null);
  };

  const toggleSessionMenu = (sessionId: string, button: HTMLButtonElement) => {
    if (openSessionMenuId === sessionId) {
      setOpenSessionMenuId(null);
      setSessionMenuPosition(null);
      return;
    }

    const rect = button.getBoundingClientRect();
    const menuWidth = 164;
    const menuHeight = 124;
    const viewportPadding = 12;
    const top = Math.min(
      window.innerHeight - menuHeight - viewportPadding,
      Math.max(viewportPadding, rect.top),
    );
    const left = Math.min(
      window.innerWidth - menuWidth - viewportPadding,
      Math.max(viewportPadding, rect.right - menuWidth),
    );

    setOpenSessionMenuId(sessionId);
    setSessionMenuPosition({ top, left });
  };

  const submitRename = async () => {
    if (!renamingSessionId) {
      return;
    }
    const nextTitle = renameDraft.trim();
    if (!nextTitle) {
      return;
    }
    await renameSession(renamingSessionId, nextTitle);
    setRenamingSessionId(null);
    setRenameDraft("");
  };

  const navigateAlternative = (messageId: string, index: number) => {
    updateActiveSession((session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.id === messageId
          ? { ...message, currentAlternativeIndex: index }
          : message,
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
    if (!activeSession || activeSession.closedAt) return;

    const sessionId = activeSession.id;
    const messages = activeSession.messages;
    const targetIndex = messages.findIndex((message) => message.id === messageId);
    if (targetIndex <= 0) return;
    const targetMessage = messages[targetIndex];
    const userMessage = messages[targetIndex - 1];
    if (!userMessage || userMessage.role !== "user") return;

    const currentRetries = (targetMessage.alternatives?.length ?? 1) - 1;
    if (currentRetries >= MAX_RETRIES) return;

    const prompt = userMessage.text;

    updateActiveSession((session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.id === messageId ? { ...message, streamingText: "" } : message,
      ),
    }));

    setIsTyping(true);
    try {
      const response = await sendChatPromptStreamApi(
        sessionId,
        prompt,
        { research: researchMode, thinking: thinkingMode },
        (delta) => {
          updateActiveSession((session) => ({
            ...session,
            messages: session.messages.map((message) =>
              message.id === messageId
                ? { ...message, streamingText: (message.streamingText ?? "") + delta }
                : message,
            ),
          }));
        },
        (_phase, status) => setStatusMessage(status),
        true,
      );

      const newAlternative = createMessageAlternative(response);

      updateActiveSession((session) => ({
        ...session,
        messages: session.messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                streamingText: undefined,
                alternatives: [...(message.alternatives ?? []), newAlternative],
                currentAlternativeIndex: (message.alternatives?.length ?? 0),
              }
            : message,
        ),
      }));
    } catch {
      updateActiveSession((session) => ({
        ...session,
        messages: session.messages.map((message) =>
          message.id === messageId ? { ...message, streamingText: undefined } : message,
        ),
      }));
    } finally {
      setIsTyping(false);
      setStatusMessage("");
    }
  };

  const sendPrompt = async (prompt: string) => {
    if (!activeSession || activeSession.closedAt) {
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
          <a href="/catalog" className="retail-topbar-nav-link">Catalog</a>
          <a href="/my-orders" className="retail-topbar-nav-link">My Orders</a>
        </nav>
        <div className="retail-topbar-user" ref={accountMenuRef}>
          <div className={`status-pill status-pill--${backendStatus}`}>{backendStatus}</div>
          <button
            type="button"
            className="avatar-chip"
            onClick={() => setIsAccountMenuOpen((value) => !value)}
            aria-label="Account"
            aria-expanded={isAccountMenuOpen}
          >
            {user.full_name.slice(0, 1).toUpperCase()}
          </button>
          {isAccountMenuOpen ? (
            <div className="account-menu">
              <div className="account-menu-header">
                <strong>{user.full_name}</strong>
                <span>{user.customer_number}</span>
              </div>
              <button
                type="button"
                className="account-menu-item"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  void onLogout();
                }}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <section className="retail-chat-shell">
        <aside className="retail-session-sidebar">
          <div className="retail-session-sidebar-header">
            <div>
              <span className="eyebrow">Sessions</span>
              <h2>Chats</h2>
            </div>
            <button type="button" className="btn btn-primary retail-new-chat-btn" onClick={() => { void createSession(); }}>
              New chat
            </button>
          </div>
          <ul className="retail-session-list">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isMenuOpen = openSessionMenuId === session.id;
              return (
                <li key={session.id} className="session-item">
                  <button
                    type="button"
                    className={`session-btn ${isActive ? "active" : ""} ${session.closedAt ? "session-btn--closed" : ""}`}
                    onClick={() => selectSession(session.id)}
                  >
                    <span className="session-name">{session.name}</span>
                    {session.closedAt ? <span className="session-badge">Closed</span> : null}
                  </button>
                  <div className="session-menu-wrapper">
                    <button
                      type="button"
                      className={`session-menu-btn ${isMenuOpen ? "session-menu-btn--open" : ""}`}
                      onClick={(event) => toggleSessionMenu(session.id, event.currentTarget)}
                      aria-label={`Manage ${session.name}`}
                    >
                      ⋯
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="retail-chat-main">
          {accessRequestNotice ? (
            <div className="chat-notice toast toast-success">{accessRequestNotice}</div>
          ) : null}
          <div className="retail-session-frame">
            <div className="retail-session-heading">
              <div>
                <span className="eyebrow">Customer Support</span>
                <h1>{activeSession?.name ?? "Velora Assistant"}</h1>
                {activeSessionIsClosed ? <span className="closed-chat-pill">Closed session</span> : null}
              </div>
              <p>
                {activeSessionIsClosed
                  ? "This chat is closed and remains visible for reference only."
                  : "Track orders, returns, products, promotions, and support cases with Lena."}
              </p>
            </div>
            {activeSessionIsClosed ? (
              <div className="chat-notice closed-chat-notice">
                This session has been closed. You can still review it here, but Lena will not send new messages in this chat.
              </div>
            ) : null}
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
                  onQuickAction={(prompt) => {
                    if (!activeSessionIsClosed) {
                      void sendPrompt(prompt);
                    }
                  }}
                />
                <PromptComposer
                  onSend={sendPrompt}
                  disabled={isTyping || activeSessionIsClosed}
                  researchMode={researchMode}
                  thinkingMode={thinkingMode}
                  onResearchToggle={() => {
                    const next = !researchMode;
                    setResearchMode(next);
                    saveResearchMode(activeSessionId, next);
                  }}
                  onThinkingToggle={() => {
                    const next = !thinkingMode;
                    setThinkingMode(next);
                    saveThinkingMode(activeSessionId, next);
                  }}
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

      {renamingSessionId ? (
        <div className="rename-modal-backdrop" role="presentation" onClick={() => setRenamingSessionId(null)}>
          <div className="rename-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2 className="rename-modal-title">Rename chat session</h2>
            <input
              className="rename-modal-input"
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              placeholder="Enter session title"
              autoFocus
            />
            <div className="rename-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setRenamingSessionId(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => { void submitRename(); }}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {openSessionMenuId && sessionMenuPosition ? (
        <div
          ref={sessionMenuRef}
          className="session-context-menu session-context-menu--floating"
          style={{ top: `${sessionMenuPosition.top}px`, left: `${sessionMenuPosition.left}px` }}
        >
          <button
            type="button"
            className="session-context-item"
            onClick={() => {
              const session = sessions.find((entry) => entry.id === openSessionMenuId);
              if (session) {
                openRenameModal(session);
              }
            }}
          >
            Rename
          </button>
          {!sessions.find((entry) => entry.id === openSessionMenuId)?.closedAt ? (
            <button
              type="button"
              className="session-context-item"
              onClick={() => { void closeSession(openSessionMenuId); }}
            >
              Close chat
            </button>
          ) : null}
          <button
            type="button"
            className="session-context-item session-context-item--danger"
            onClick={() => { void deleteSession(openSessionMenuId); }}
          >
            Delete
          </button>
        </div>
      ) : null}

      <AccessRequestModal
        isOpen={isAccessRequestModalOpen}
        suggestedResource={suggestedAccessResource}
        onClose={() => setIsAccessRequestModalOpen(false)}
        onSubmit={submitAccessRequest}
      />
    </main>
  );
}
