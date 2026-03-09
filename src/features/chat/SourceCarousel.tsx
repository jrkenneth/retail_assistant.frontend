import { useState } from "react";
import type { Citation } from "./types";

type SourceCarouselProps = {
  citations: Citation[];
};

function getDomain(uri?: string): string {
  try { return new URL(uri ?? "").hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

/** Placeholder visual for cards without an image — shows the domain's first letter */
function DomainPlaceholder({ citation }: { citation: Citation }) {
  const domain = getDomain(citation.uri) || citation.label;
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
  if (citations.length === 0) return null;

  return (
    <div className="source-carousel">
      {citations.map((c, i) => (
        <a
          key={i}
          className="source-card"
          href={c.uri}
          target="_blank"
          rel="noopener noreferrer"
        >
          {c.image ? <ImageWithFallback citation={c} /> : <DomainPlaceholder citation={c} />}
          <div className="source-card-body">
            <span className="source-card-domain">{getDomain(c.uri) || c.label}</span>
            <span className="source-card-title">{c.source}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
