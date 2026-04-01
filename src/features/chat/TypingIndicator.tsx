export function TypingIndicator({ message }: { message?: string }) {
  return (
    <div className="typing-state" role="status" aria-label="Lena is processing">
      {message ?? "Lena is processing..."}
    </div>
  );
}
