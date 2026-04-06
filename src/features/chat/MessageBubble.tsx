import { useState } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AccessDeniedCard } from "./AccessDeniedCard";
import { ActionRenderer } from "./ActionRenderer";
import { CitationBadge } from "./CitationBadge";
import { EscalationPanel } from "./EscalationPanel";
import { LoyaltyCard } from "./LoyaltyCard";
import { MessageActionBar } from "./MessageActionBar";
import { OrderCard } from "./OrderCard";
import { ProductCard } from "./ProductCard";
import { RefusalCard } from "./RefusalCard";
import { SourceCarousel } from "./SourceCarousel";
import { SourcesPanel } from "./SourcesPanel";
import type { ChatMessage, Citation, MessageAlternative } from "./types";

type MessageBubbleProps = {
  message: ChatMessage;
  onTryAgain: () => void;
  onNavigate: (index: number) => void;
  onOpenAccessRequest: (suggestedResource?: string) => void;
  onViewAccessRequests: () => void;
  onQuickAction?: (prompt: string) => void;
  requestContext?: string;
};

function shouldRenderAccessDeniedCard(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("access request") ||
    normalized.includes("access denied") ||
    normalized.includes("do not have access") ||
    normalized.includes("don't have access")
  );
}

/** Replace [cite:N] markers with inline-code spans that react-markdown can intercept */
function prepareCitationText(text: string): string {
  return text.replace(/\[cite:(\d+)\]/g, (_, n) => `\`[${n}]\``);
}

/**
 * Extract citation indices that actually appear in the text, in order of first appearance.
 */
function citedIndices(text: string): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  for (const [, n] of text.matchAll(/\[cite:(\d+)\]/g)) {
    const idx = parseInt(n, 10);
    if (!seen.has(idx)) { seen.add(idx); order.push(idx); }
  }
  return order;
}

/** Build react-markdown components map that intercepts `[N]` code spans as CitationBadges */
function buildComponents(citations: Citation[]): Components {
  return {
    code: ({ children, className }) => {
      // Only handle inline code (no className means no fenced block)
      if (!className) {
        const match = String(children).match(/^\[(\d+)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          const cite = citations[idx];
          return cite ? <CitationBadge citations={[cite]} /> : null;
        }
      }
      return <code className={className}>{children}</code>;
    },
  };
}

export function MessageBubble({
  message,
  onTryAgain,
  onNavigate,
  onOpenAccessRequest,
  onViewAccessRequests,
  onQuickAction,
  requestContext,
}: MessageBubbleProps) {
  const [sourcesPanelOpen, setSourcesPanelOpen] = useState(false);

  if (message.role === "user") {
    return (
      <div className="message-row-shell message-row-shell--user">
        <article className="message user">
          <header className="message-meta">
            <span>You</span>
            <time>{new Date(message.timestamp).toLocaleTimeString()}</time>
          </header>
          <p>{message.text}</p>
        </article>
        <div className="message-avatar message-avatar--user" aria-hidden="true">
          You
        </div>
      </div>
    );
  }

  const isRetrying = message.streamingText !== undefined;

  // Resolve current alternative (if any)
  const altIndex = message.currentAlternativeIndex ?? 0;
  const alt: MessageAlternative | undefined = message.alternatives?.[altIndex];

  const activeText        = isRetrying ? message.streamingText! : (alt?.text      ?? message.text);
  const activeResponseType = isRetrying ? "text" : (alt?.responseType ?? message.responseType ?? "text");
  const activePayload      = isRetrying ? undefined : (alt?.payload ?? message.payload);
  const activeCitations   = isRetrying ? [] : (alt?.citations ?? message.citations ?? []);
  const activePolicyCitations = isRetrying ? [] : (alt?.policyCitations ?? message.policyCitations ?? []);
  const activeQuickActions = isRetrying ? [] : (alt?.quickActions ?? message.quickActions ?? []);
  const activeUiActions   = isRetrying ? [] : (alt?.uiActions ?? message.uiActions ?? []);
  const activeSummary     = isRetrying ? undefined : (alt?.summary   ?? message.summary);
  const activeFollowUp    = isRetrying ? undefined : (alt?.follow_up ?? message.follow_up);
  const activeAltCount    = message.alternatives?.length ?? 1;
  const retryCount        = activeAltCount - 1;
  // show_sources: undefined/true → show; false → suppress carousel, badges and Sources button
  const showSources       = isRetrying ? false : ((alt?.showSources ?? message.showSources) !== false);

  const showAccessDeniedCard = !isRetrying && shouldRenderAccessDeniedCard(activeText);
  const processedText  = showSources ? prepareCitationText(activeText) : activeText;
  const mdComponents   = buildComponents(activeCitations);

  // Carousel: only citations actually referenced in the text, capped at 4.
  // Image-bearing cards are sorted first for a richer visual row.
  const CAROUSEL_MAX = 4;
  const carouselCitations = (() => {
    if (!showSources || activeCitations.length === 0) return [];
    const indices = citedIndices(activeText);
    const cited = indices.map((i) => activeCitations[i]).filter(Boolean);
    // If the model embedded no markers, fall back to the first N citations
    const pool = cited.length > 0 ? cited : activeCitations.slice(0, CAROUSEL_MAX);
    return [
      ...pool.filter((c) => !!c.image),
      ...pool.filter((c) => !c.image),
    ].slice(0, CAROUSEL_MAX);
  })();

  // Don't render anything while the initial placeholder is loading (empty, no alternatives yet)
  const isInitialPlaceholder = !isRetrying && activeText === "" && !message.alternatives;

  return (
    <div className="message-row-shell message-row-shell--assistant">
      <div className="message-avatar message-avatar--assistant" aria-hidden="true">
        L
      </div>
      <article className="message assistant">
        <header className="message-meta">
          <span>Lena</span>
          <time>{new Date(message.timestamp).toLocaleTimeString()}</time>
        </header>

        {isInitialPlaceholder ? null : (
          <>
            {carouselCitations.length > 0 && (
              <SourceCarousel citations={carouselCitations} />
            )}

            <div className="message-md">
              <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {processedText}
              </Markdown>
            </div>

            {activeSummary && (
              <div className="message-summary">
                <strong className="summary-heading">In short:</strong>
                <div className="summary-body">
                  <Markdown remarkPlugins={[remarkGfm]}>{activeSummary}</Markdown>
                </div>
              </div>
            )}

            {activeFollowUp && (
              <>
                <hr className="message-divider" />
                <p className="message-followup">{activeFollowUp}</p>
              </>
            )}

            {activeUiActions.length > 0 && (
              <ActionRenderer actions={activeUiActions} />
            )}

            {showAccessDeniedCard ? (
              <AccessDeniedCard
                suggestedResource={requestContext ?? activeText}
                onOpenAccessRequest={onOpenAccessRequest}
                onViewAccessRequests={onViewAccessRequests}
              />
            ) : null}

            {!isRetrying && activeResponseType === "product_card" && activePayload ? (
              <ProductCard product={activePayload as any} />
            ) : null}

            {!isRetrying && activeResponseType === "order_card" && activePayload ? (
              <OrderCard order={activePayload as any} />
            ) : null}

            {!isRetrying && activeResponseType === "escalation" && activePayload ? (
              <EscalationPanel payload={activePayload as any} />
            ) : null}

            {!isRetrying && activeResponseType === "refusal" && activePayload ? (
              <RefusalCard payload={activePayload as any} />
            ) : null}

            {!isRetrying && activeResponseType === "loyalty_card" && activePayload ? (
              <LoyaltyCard payload={activePayload as any} />
            ) : null}

            {activePolicyCitations.length > 0 ? (
              <div className="policy-citation-stack">
                {activePolicyCitations.map((citation) => (
                  <div key={`${citation.policy_title}-${citation.excerpt}`} className="policy-citation-card">
                    <strong>{citation.policy_title}</strong>
                    <p>{citation.excerpt}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {activeQuickActions.length > 0 ? (
              <div className="quick-action-row">
                {activeQuickActions.map((action) => (
                  <button
                    key={`${action.label}-${action.prompt}`}
                    type="button"
                    className="quick-pill"
                    onClick={() => onQuickAction?.(action.prompt)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}

            <MessageActionBar
              messageText={activeText}
              citations={activeCitations}
              showSources={showSources}
              alternativeCount={activeAltCount}
              currentIndex={altIndex}
              retryCount={retryCount}
              isRetrying={isRetrying}
              onTryAgain={onTryAgain}
              onNavigate={onNavigate}
              onToggleSources={() => setSourcesPanelOpen((v) => !v)}
            />

            {showSources && activeCitations.length > 0 && (
              <SourcesPanel
                citations={activeCitations}
                isOpen={sourcesPanelOpen}
                onClose={() => setSourcesPanelOpen(false)}
              />
            )}
          </>
        )}
      </article>
    </div>
  );
}
