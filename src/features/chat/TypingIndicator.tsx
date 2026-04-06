export function TypingIndicator({ message }: { message?: string }) {
  return (
    <div className="typing-state retail-typing-state" role="status" aria-label="Lena is typing">
      <span>{message ?? "Lena is typing"}</span>
      <span className="typing-dots">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
