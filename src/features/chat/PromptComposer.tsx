import { useState } from "react";
import { PromptInput } from "./PromptInput";
import { SendButton } from "./SendButton";

type PromptComposerProps = {
  disabled?: boolean;
  onSend: (prompt: string) => void;
};

export function PromptComposer({
  disabled,
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
    </footer>
  );
}
