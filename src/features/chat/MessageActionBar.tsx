import { useState } from "react";
import type { Citation } from "./types";

const MAX_RETRIES = 3;

type MessageActionBarProps = {
  messageText: string;
  citations: Citation[];
  showSources: boolean;
  alternativeCount: number;
  currentIndex: number;
  retryCount: number;
  isRetrying: boolean;
  onTryAgain: () => void;
  onNavigate: (index: number) => void;
  onToggleSources: () => void;
};

export function MessageActionBar({
  messageText,
  citations,
  showSources,
  alternativeCount,
  currentIndex,
  retryCount,
  isRetrying,
  onTryAgain,
  onNavigate,
  onToggleSources,
}: MessageActionBarProps) {
  const [copied, setCopied] = useState(false);
  const retryExhausted = retryCount >= MAX_RETRIES;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — fail silently
    }
  };

  return (
    <div className="message-action-bar">
      {/* During a retry only show the Retrying… indicator — no other controls */}
      {isRetrying ? (
        <button className="action-bar-btn" disabled aria-label="Retrying">
          Retrying…
        </button>
      ) : (
        <>
          {/* Copy */}
          <button
            className="action-bar-btn"
            onClick={() => { void handleCopy(); }}
            title="Copy response"
            aria-label="Copy response"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>

          {/* Try again — dull + tooltip when exhausted */}
          {retryExhausted ? (
            <button
              className="action-bar-btn action-bar-btn--exhausted"
              disabled
              data-tooltip="Retry limit reached. Enter a new message to continue."
              aria-label="Retry limit reached"
            >
              ↺ Try again
            </button>
          ) : (
            <button
              className="action-bar-btn"
              onClick={onTryAgain}
              title="Try again"
              aria-label="Try again"
            >
              ↺ Try again
            </button>
          )}

          {/* Alternative navigation — shown only when multiple alternatives exist */}
          {alternativeCount > 1 && (
            <span className="action-bar-nav">
              <button
                className="action-bar-arrow"
                onClick={() => onNavigate(currentIndex - 1)}
                disabled={currentIndex === 0}
                aria-label="Previous alternative"
              >
                ←
              </button>
              <span className="action-bar-counter">{currentIndex + 1}/{alternativeCount}</span>
              <button
                className="action-bar-arrow"
                onClick={() => onNavigate(currentIndex + 1)}
                disabled={currentIndex === alternativeCount - 1}
                aria-label="Next alternative"
              >
                →
              </button>
            </span>
          )}

          {/* Sources — only when LLM elected to show sources and citations exist */}
          {showSources && citations.length > 0 && (
            <button
              className="action-bar-btn action-bar-sources"
              onClick={onToggleSources}
              title="View sources"
              aria-label="View sources"
            >
              Sources ({citations.length})
            </button>
          )}
        </>
      )}
    </div>
  );
}
