import { useState } from "react";
import { PromptInput } from "./PromptInput";
import { SendButton } from "./SendButton";

type PromptComposerProps = {
  disabled?: boolean;
  researchMode: boolean;
  thinkingMode: boolean;
  onToggleResearch: () => void;
  onToggleThinking: () => void;
  onSend: (prompt: string) => void;
};

export function PromptComposer({
  disabled,
  researchMode,
  thinkingMode,
  onToggleResearch,
  onToggleThinking,
  onSend,
}: PromptComposerProps) {
  const [prompt, setPrompt] = useState("");

  const submit = () => {
    const trimmed = prompt.trim();
    if (!trimmed || disabled) {
      return;
    }
    onSend(trimmed);
    setPrompt("");
  };

  return (
    <footer className="composer">
      <div className="composer-input-wrapper">
        <PromptInput value={prompt} onChange={setPrompt} disabled={disabled} onSubmit={submit} />
        <SendButton onClick={submit} disabled={disabled || prompt.trim().length === 0} />
      </div>
      <div className="composer-modes">
        <button
          type="button"
          className={`mode-toggle-btn${researchMode ? " active" : ""}`}
          onClick={onToggleResearch}
        >
          Research Mode
        </button>
        <button
          type="button"
          className={`mode-toggle-btn${thinkingMode ? " active" : ""}`}
          onClick={onToggleThinking}
        >
          Thinking Mode
        </button>
      </div>
    </footer>
  );
}
