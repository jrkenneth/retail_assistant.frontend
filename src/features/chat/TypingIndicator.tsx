export function TypingIndicator({ message }: { message?: string }) {
  return (
    <div className="typing-state" role="status" aria-label="Copilot is processing">
      {message ?? "Copilot is processing…"}
    </div>
  );
}
