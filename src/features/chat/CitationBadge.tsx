import { useState } from "react";
import type { Citation } from "./types";
import { CitationPopover } from "./CitationPopover";
import { getDomainLabel } from "../../utils/urlHelpers";

type CitationBadgeProps = {
  citations: Citation[];
};

export function CitationBadge({ citations }: CitationBadgeProps) {
  const [hovered, setHovered] = useState(false);
  if (citations.length === 0) return null;

  const first = citations[0];
  const extra = citations.length - 1;
  const domain = getDomainLabel(first.uri, first.label);

  // Single source — click opens URL directly
  if (citations.length === 1) {
    return (
      <a
        className="citation-badge"
        href={first.uri}
        target="_blank"
        rel="noopener noreferrer"
        title={first.source}
      >
        {domain}
      </a>
    );
  }

  // Multiple sources — hover shows paginated popover
  return (
    <span
      className="citation-badge citation-badge--multi"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {domain}{extra > 0 && ` +${extra}`}
      {hovered && (
        <span className="citation-badge-popover-anchor">
          <CitationPopover citations={citations} />
        </span>
      )}
    </span>
  );
}
