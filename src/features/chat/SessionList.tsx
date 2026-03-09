import { useEffect, useRef, useState } from "react";
import type { ChatSession } from "./types";

type SessionListProps = {
  sessions: ChatSession[];
  activeSessionId: string;
  onCreateSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newName: string) => void;
};

export function SessionList({
  sessions,
  activeSessionId,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
}: SessionListProps) {
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [renameModal, setRenameModal] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!contextMenuId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenuId]);

  // Auto-focus rename input when modal opens
  useEffect(() => {
    if (renameModal) {
      const timer = setTimeout(() => renameInputRef.current?.focus(), 30);
      return () => clearTimeout(timer);
    }
  }, [renameModal]);

  const openRename = (session: ChatSession) => {
    setContextMenuId(null);
    setRenameModal({ id: session.id, name: session.name });
    setRenameValue(session.name);
  };

  const submitRename = () => {
    if (!renameModal) return;
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== renameModal.name) {
      onRenameSession(renameModal.id, trimmed);
    }
    setRenameModal(null);
  };

  return (
    <aside className="session-sidebar">
      <div className="sidebar-header">
        <h2>Sessions</h2>
        <button type="button" className="secondary-btn" onClick={onCreateSession}>
          New Chat
        </button>
      </div>

      <ul>
        {sessions.map((session) => (
          <li key={session.id} className="session-item">
            <button
              type="button"
              className={session.id === activeSessionId ? "session-btn active" : "session-btn"}
              onClick={() => onSelectSession(session.id)}
            >
              <span className="session-name">{session.name}</span>
            </button>

            <div
              className="session-menu-wrapper"
              ref={contextMenuId === session.id ? menuRef : undefined}
            >
              <button
                type="button"
                className={`session-menu-btn${contextMenuId === session.id ? " session-menu-btn--open" : ""}`}
                aria-label="Session options"
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenuId(contextMenuId === session.id ? null : session.id);
                }}
              >
                &#8942;
              </button>

              {contextMenuId === session.id && (
                <div className="session-context-menu">
                  <button
                    type="button"
                    className="session-context-item"
                    onClick={() => openRename(session)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="session-context-item session-context-item--danger"
                    onClick={() => {
                      setContextMenuId(null);
                      onDeleteSession(session.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Rename modal */}
      {renameModal && (
        <div
          className="rename-modal-backdrop"
          onClick={() => setRenameModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Rename chat"
        >
          <div className="rename-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="rename-modal-title">Rename Chat</h3>
            <input
              ref={renameInputRef}
              className="rename-modal-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") setRenameModal(null);
              }}
              maxLength={120}
              placeholder="Session name"
            />
            <div className="rename-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setRenameModal(null)}
              >
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={submitRename}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
