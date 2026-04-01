import type { Citation } from "./types";
import { getDomainLabel } from "../../utils/urlHelpers";

type SourcesPanelProps = {
  citations: Citation[];
  isOpen: boolean;
  onClose: () => void;
};

export function SourcesPanel({ citations, isOpen, onClose }: SourcesPanelProps) {
  if (citations.length === 0) return null;

  return (
    <>
      {/* Backdrop — click anywhere outside the panel to close */}
      <div
        className={`sources-panel-backdrop${isOpen ? "" : " sources-panel-backdrop--hidden"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sources-panel${isOpen ? "" : " sources-panel--closed"}`}>
        <div className="sources-panel-header">
          <h2 className="sources-panel-title">Sources ({citations.length})</h2>
          <button className="sources-panel-close" onClick={onClose} aria-label="Close sources panel">
            ✕
          </button>
        </div>

        <ul className="sources-panel-list">
          {citations.map((c, i) => {
            const domain = getDomainLabel(c.uri, c.label);
            return (
              <li key={i} className="sources-panel-item">
                <a
                  className="sources-panel-link"
                  href={c.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="sources-panel-domain">{domain}</span>
                  <span className="sources-panel-source">{c.source}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
