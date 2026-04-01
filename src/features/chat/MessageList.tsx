import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatMessage } from "./types";

type MessageListProps = {
  messages: ChatMessage[];
  isTyping: boolean;
  statusMessage?: string;
  onTryAgain: (messageId: string) => void;
  onNavigate: (messageId: string, index: number) => void;
  onOpenAccessRequest: (suggestedResource?: string) => void;
  onViewAccessRequests: () => void;
};

export function MessageList({
  messages,
  isTyping,
  statusMessage,
  onTryAgain,
  onNavigate,
  onOpenAccessRequest,
  onViewAccessRequests,
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

      {messages.map((message, index) => {
        const requestContext = [...messages]
          .slice(0, index)
          .reverse()
          .find((candidate) => candidate.role === "user")?.text;

        return (
          <div key={message.id} className="message-row">
            <MessageBubble
              message={message}
              onTryAgain={() => onTryAgain(message.id)}
              onNavigate={(messageIndex) => onNavigate(message.id, messageIndex)}
              onOpenAccessRequest={onOpenAccessRequest}
              onViewAccessRequests={onViewAccessRequests}
              requestContext={requestContext}
            />
          </div>
        );
      })}

      {isTyping ? <TypingIndicator message={statusMessage} /> : null}
      <div ref={bottomRef} />
    </section>
  );
}
