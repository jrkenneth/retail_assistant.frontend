import { useEffect, useRef } from "react";

type PromptInputProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
};

export function PromptInput({ value, disabled, onChange, onSubmit }: PromptInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Resize on every value change: reset to auto first so shrinking works,
  // then grow to fit content. CSS max-height caps how tall it goes.
  // Scrollbar only appears once content exceeds the cap.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.max(44, el.scrollHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = next >= 200 ? "auto" : "hidden";
  }, [value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Ask about products, orders, returns, or promotions..."
      rows={1}
      disabled={disabled}
    />
  );
}
