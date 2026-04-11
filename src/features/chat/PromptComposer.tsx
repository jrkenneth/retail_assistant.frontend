import { useState } from "react";
import { PromptInput } from "./PromptInput";
import { SendButton } from "./SendButton";

type PromptComposerProps = {
  disabled?: boolean;
  researchMode: boolean;
  thinkingMode: boolean;
  onResearchToggle: () => void;
  onThinkingToggle: () => void;
  onSend: (prompt: string) => void;
};

export function PromptComposer({
  disabled,
  researchMode,
  thinkingMode,
  onResearchToggle,
  onThinkingToggle,
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
    <footer className="composer retail-composer">
      <div className="composer-input-wrapper">
        <PromptInput value={prompt} onChange={setPrompt} disabled={disabled} onSubmit={submit} />
        <SendButton onClick={submit} disabled={disabled || prompt.trim().length === 0} />
      </div>
      <div className="composer-mode-row">
        <button
          type="button"
          className={`mode-toggle${researchMode ? " mode-toggle--active" : ""}`}
          onClick={onResearchToggle}
          disabled={disabled}
          title="Search the web for up-to-date information"
        >
          Web Search
        </button>
        <button
          type="button"
          className={`mode-toggle${thinkingMode ? " mode-toggle--active" : ""}`}
          onClick={onThinkingToggle}
          disabled={disabled}
          title="Use extended reasoning for complex questions"
        >
          Deep Think
        </button>
      </div>
    </footer>
  );
}
