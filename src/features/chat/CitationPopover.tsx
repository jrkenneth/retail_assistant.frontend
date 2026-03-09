import { useState } from "react";
import type { Citation } from "./types";

type CitationPopoverProps = {
  citations: Citation[];
};

export function CitationPopover({ citations }: CitationPopoverProps) {
  const [index, setIndex] = useState(0);
  const current = citations[index];
  if (!current) return null;

  const domain = (() => {
    try { return new URL(current.uri ?? "").hostname.replace(/^www\./, ""); }
    catch { return current.label; }
  })();

  return (
    <div className="citation-popover">
      <div className="citation-popover-header">
        <span className="citation-popover-domain">{domain}</span>
        {citations.length > 1 && (
          <span className="citation-popover-counter">{index + 1}/{citations.length}</span>
        )}
      </div>

      <a
        className="citation-popover-title"
        href={current.uri}
        target="_blank"
        rel="noopener noreferrer"
      >
        {current.source}
      </a>

      {citations.length > 1 && (
        <div className="citation-popover-nav">
          <button
            className="citation-popover-arrow"
            onClick={(e) => { e.stopPropagation(); setIndex((i) => Math.max(0, i - 1)); }}
            disabled={index === 0}
            aria-label="Previous source"
          >
            ←
          </button>
          <button
            className="citation-popover-arrow"
            onClick={(e) => { e.stopPropagation(); setIndex((i) => Math.min(citations.length - 1, i + 1)); }}
            disabled={index === citations.length - 1}
            aria-label="Next source"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
