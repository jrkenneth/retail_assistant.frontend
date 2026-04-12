import { useState } from "react";
import type { Citation } from "./types";
import { getDomainLabel } from "../../utils/urlHelpers";

type SourceCarouselProps = {
  citations: Citation[];
};

function isLinkableCitation(citation: Citation): citation is Citation & { uri: string } {
  return typeof citation.uri === "string" && /^https?:\/\//i.test(citation.uri);
}

/** Placeholder visual for cards without an image — shows the domain's first letter */
function DomainPlaceholder({ citation }: { citation: Citation }) {
  const domain = getDomainLabel(citation.uri, citation.label);
  const letter = domain[0]?.toUpperCase() ?? "?";
  return (
    <div className="source-card-image source-card-image--placeholder source-card-placeholder-icon">
      <span className="source-card-placeholder-letter">{letter}</span>
    </div>
  );
}

/** Image card with graceful error fallback to the letter placeholder */
function ImageWithFallback({ citation }: { citation: Citation }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <DomainPlaceholder citation={citation} />;
  return (
    <img
      className="source-card-image"
      src={citation.image!}
      alt={citation.source}
      onError={() => setFailed(true)}
    />
  );
}

export function SourceCarousel({ citations }: SourceCarouselProps) {
  const linkableCitations = citations.filter(isLinkableCitation);
  if (linkableCitations.length === 0) return null;

  return (
    <div className="source-carousel">
      {linkableCitations.map((c, i) => (
        <a
          key={i}
          className="source-card"
          href={c.uri}
          target="_blank"
          rel="noopener noreferrer"
        >
          {c.image ? <ImageWithFallback citation={c} /> : <DomainPlaceholder citation={c} />}
          <div className="source-card-body">
            <span className="source-card-domain">{getDomainLabel(c.uri, c.label)}</span>
            <span className="source-card-title">{c.source}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
