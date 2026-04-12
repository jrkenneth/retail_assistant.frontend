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
import type { ChatMessage, Citation, MessageAlternative, ProductCardPayload, QuickAction } from "./types";

type MessageBubbleProps = {
  message: ChatMessage;
  onTryAgain: () => void;
  onNavigate: (index: number) => void;
  onOpenAccessRequest: (suggestedResource?: string) => void;
  onViewAccessRequests: () => void;
  onQuickAction?: (prompt: string) => void;
  requestContext?: string;
};

type WebCitation = Citation & { uri: string };

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

function isWebCitation(citation: Citation | undefined): citation is WebCitation {
  if (!citation || typeof citation.uri !== "string") {
    return false;
  }
  if (!/^https?:\/\//i.test(citation.uri)) {
    return false;
  }
  const label = (citation.label ?? "").trim().toLowerCase();
  return label !== "policy";
}

/** Build react-markdown components map that intercepts `[N]` code spans as CitationBadges */
function buildComponents(getCitationByIndex: (index: number) => WebCitation | undefined): Components {
  return {
    code: ({ children, className }) => {
      // Only handle inline code (no className means no fenced block)
      if (!className) {
        const match = String(children).match(/^\[(\d+)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          const cite = getCitationByIndex(idx);
          return cite ? <CitationBadge citations={[cite]} /> : null;
        }
      }
      return <code className={className}>{children}</code>;
    },
  };
}

function sanitizeQuickActionPrompt(
  action: QuickAction,
  responseType: ChatMessage["responseType"],
  payload: unknown,
): string {
  if (responseType !== "product_card" || !payload || typeof payload !== "object") {
    return action.prompt;
  }

  const product = payload as Partial<ProductCardPayload>;
  const name = typeof product.name === "string" && product.name.trim() ? product.name.trim() : "this product";
  const sku = typeof product.sku === "string" && product.sku.trim() ? product.sku.trim() : "the listed SKU";
  const label = action.label.toLowerCase();
  const prompt = action.prompt.trim();
  const promptLooksWeak =
    prompt.length < 12 ||
    /check the product page|technical details\?/i.test(prompt);

  if (promptLooksWeak && label.includes("detailed") && label.includes("spec")) {
    return `Share the full technical specifications for ${name} (SKU ${sku}), including battery life, connectivity, dimensions, and compatibility.`;
  }

  if (promptLooksWeak && label.includes("compare")) {
    return `Compare ${name} (SKU ${sku}) with similar products and highlight key feature and price differences.`;
  }

  if (promptLooksWeak && label.includes("delivery")) {
    return `What are the delivery options and estimated shipping time for ${name} (SKU ${sku})?`;
  }

  return action.prompt;
}

function shouldRenderSummary(summary: string | undefined, responseType: ChatMessage["responseType"], messageText: string): boolean {
  if (!summary || !summary.trim()) {
    return false;
  }

  if (responseType !== "text") {
    return false;
  }

  const normalizedMessage = messageText.trim();
  const wordCount = normalizedMessage ? normalizedMessage.split(/\s+/).length : 0;
  const charCount = normalizedMessage.length;

  return wordCount >= 90 || charCount >= 600;
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
  const isEscalationView = !isRetrying && activeResponseType === "escalation" && Boolean(activePayload);
  // show_sources: undefined/true → show; false → suppress carousel, badges and Sources button
  const showSources       = isRetrying ? false : ((alt?.showSources ?? message.showSources) !== false);
  const webCitations      = activeCitations.filter(isWebCitation);
  const showWebSources    = showSources && webCitations.length > 0 && !isEscalationView;

  const showAccessDeniedCard = !isRetrying && shouldRenderAccessDeniedCard(activeText);
  const processedText  = showWebSources ? prepareCitationText(activeText) : activeText;
  const mdComponents   = buildComponents((index) => {
    const citation = activeCitations[index];
    return isWebCitation(citation) ? citation : undefined;
  });
  const normalizedQuickActions = activeQuickActions.map((action) => ({
    ...action,
    prompt: sanitizeQuickActionPrompt(action, activeResponseType, activePayload),
  }));
  const suppressBubbleBodyForRefusalCard =
    !isRetrying && activeResponseType === "refusal" && Boolean(activePayload);
  const hasBubbleBody =
    Boolean(activeText.trim()) &&
    !isEscalationView &&
    !suppressBubbleBodyForRefusalCard;
  const showSummary = shouldRenderSummary(activeSummary, activeResponseType, activeText);

  // Carousel: only citations actually referenced in the text, capped at 4.
  // Image-bearing cards are sorted first for a richer visual row.
  const CAROUSEL_MAX = 4;
  const carouselCitations = (() => {
    if (!showWebSources) return [];
    const indices = citedIndices(activeText);
    const cited = indices
      .map((i) => activeCitations[i])
      .filter(isWebCitation);
    // If the model embedded no markers, fall back to the first N citations
    const pool = cited.length > 0 ? cited : webCitations.slice(0, CAROUSEL_MAX);
    return [
      ...pool.filter((c) => !!c.image),
      ...pool.filter((c) => !c.image),
    ].slice(0, CAROUSEL_MAX);
  })();

  // Don't render anything while the initial placeholder is loading (empty, no alternatives yet)
  const isInitialPlaceholder = !isRetrying && activeText === "" && !message.alternatives;

  return (
    <div className={`message-row-shell message-row-shell--assistant${isEscalationView ? " message-row-shell--escalation" : ""}`}>
      {isEscalationView ? null : (
        <div className="message-avatar message-avatar--assistant" aria-hidden="true">
          L
        </div>
      )}
      <article className="message assistant">
        <header className="message-meta">
          <span>Lena</span>
          <time>{new Date(message.timestamp).toLocaleTimeString()}</time>
        </header>

        {isInitialPlaceholder ? (
          <div className="assistant-loading-card" aria-hidden="true">
            <div className="skeleton assistant-loading-line assistant-loading-line--lg" />
            <div className="skeleton assistant-loading-line" />
            <div className="skeleton assistant-loading-line assistant-loading-line--short" />
          </div>
        ) : (
          <>
            {carouselCitations.length > 0 && (
              <SourceCarousel citations={carouselCitations} />
            )}

            {hasBubbleBody ? (
              <div className="message-md">
                <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {processedText}
                </Markdown>
              </div>
            ) : null}

            {showSummary && (
              <div className="message-summary">
                <strong className="summary-heading">In short:</strong>
                <div className="summary-body">
                  <Markdown remarkPlugins={[remarkGfm]}>{activeSummary}</Markdown>
                </div>
              </div>
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
              <EscalationPanel payload={activePayload as any} onCancelEscalation={onQuickAction} />
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

            {normalizedQuickActions.length > 0 ? (
              <div className="quick-action-row">
                {normalizedQuickActions.map((action) => (
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

            {activeFollowUp && (
              <>
                <hr className="message-divider" />
                <p className="message-followup">{activeFollowUp}</p>
              </>
            )}

            {isEscalationView ? null : (
              <MessageActionBar
                messageText={activeText}
                citations={webCitations}
                showSources={showWebSources}
                alternativeCount={activeAltCount}
                currentIndex={altIndex}
                retryCount={retryCount}
                isRetrying={isRetrying}
                onTryAgain={onTryAgain}
                onNavigate={onNavigate}
                onToggleSources={() => setSourcesPanelOpen((v) => !v)}
              />
            )}

            {showWebSources && !isEscalationView && (
              <SourcesPanel
                citations={webCitations}
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
