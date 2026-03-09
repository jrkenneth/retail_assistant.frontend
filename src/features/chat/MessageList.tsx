import { useEffect, useRef } from "react";
import { ActionRenderer } from "./ActionRenderer";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatMessage } from "./types";

type MessageListProps = {
  messages: ChatMessage[];
  isTyping: boolean;
  statusMessage?: string;
  onTryAgain: (messageId: string) => void;
  onNavigate: (messageId: string, index: number) => void;
};

export function MessageList({
  messages,
  isTyping,
  statusMessage,
  onTryAgain,
  onNavigate,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages, isTyping]);

  return (
    <section className="messages-panel">
      {messages.length === 0 ? (
        <div className="empty-state">Start by entering a prompt in the composer below.</div>
      ) : null}

      {messages.map((message) => (
        <div key={message.id} className="message-row">
          <MessageBubble
            message={message}
            onTryAgain={() => onTryAgain(message.id)}
            onNavigate={(index) => onNavigate(message.id, index)}
          />
          {/* UI action buttons rendered outside the bubble */}
          {message.uiActions?.length ? (
            <ActionRenderer actions={message.uiActions} />
          ) : null}
        </div>
      ))}

      {isTyping ? <TypingIndicator message={statusMessage} /> : null}
      <div ref={bottomRef} />
    </section>
  );
}
