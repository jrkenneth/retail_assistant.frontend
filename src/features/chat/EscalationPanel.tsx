import { useEffect, useMemo, useState } from "react";
import type { EscalationPayload } from "./types";

type EscalationPanelProps = {
  payload: EscalationPayload;
  onCancelEscalation?: (prompt: string) => void;
};

function parseWaitMinutesFromSummary(summary: string): number | undefined {
  const match = summary.match(/estimated wait(?: time)?(?: is|:)?\s*(\d+)\s*minutes?/i);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

function parseQueuePositionFromSummary(summary: string): number | undefined {
  const directMatch = summary.match(/queue position(?: is|:)?\s*(\d+)/i);
  if (directMatch) {
    const value = Number(directMatch[1]);
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
  }

  const narrativeMatch = summary.match(/number\s*(\d+)\s*in the queue/i);
  if (!narrativeMatch) {
    return undefined;
  }
  const value = Number(narrativeMatch[1]);
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

export function EscalationPanel({ payload, onCancelEscalation }: EscalationPanelProps) {
  const caseSummary = payload.case_summary?.trim() ?? "";
  const summaryWaitMinutes = useMemo(() => parseWaitMinutesFromSummary(caseSummary), [caseSummary]);
  const summaryQueuePosition = useMemo(() => parseQueuePositionFromSummary(caseSummary), [caseSummary]);

  const initialWaitMinutes = useMemo(() => {
    const raw = payload.estimated_wait_minutes;
    const parsed = Number(raw);
    if (raw !== null && raw !== undefined && Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
    return summaryWaitMinutes ?? 0;
  }, [payload.estimated_wait_minutes, summaryWaitMinutes]);

  const initialQueuePosition = useMemo(() => {
    const raw = payload.queue_position;
    const parsed = Number(raw);
    if (raw !== null && raw !== undefined && Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
    return summaryQueuePosition ?? 0;
  }, [payload.queue_position, summaryQueuePosition]);

  const [remainingMinutes, setRemainingMinutes] = useState(initialWaitMinutes);

  useEffect(() => {
    setRemainingMinutes(initialWaitMinutes);
  }, [initialWaitMinutes]);

  useEffect(() => {
    if (remainingMinutes <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingMinutes((prev) => Math.max(0, prev - 1));
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [remainingMinutes]);

  const progressPercent = initialWaitMinutes > 0
    ? Math.max(0, Math.min(100, (remainingMinutes / initialWaitMinutes) * 100))
    : 0;

  const derivedQueuePosition = initialQueuePosition > 0 && initialWaitMinutes > 0
    ? Math.max(1, Math.ceil((remainingMinutes / initialWaitMinutes) * initialQueuePosition))
    : initialQueuePosition;

  const waitLabel = remainingMinutes > 0
    ? `~ ${remainingMinutes} Minute${remainingMinutes === 1 ? "" : "s"}`
    : "< 1 Minute";

  const waitNarrative = remainingMinutes > 0
    ? `${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`
    : "less than 1 minute";

  const syncedCaseSummary = useMemo(() => {
    const base = caseSummary || "Your case is with our support escalation team.";
    return base
      .replace(/estimated wait(?: time)?(?: is|:)?\s*\d+\s*minutes?/gi, `estimated wait time is ${waitNarrative}`)
      .replace(/queue position(?: is|:)?\s*\d+/gi, `queue position is ${derivedQueuePosition}`)
      .replace(/number\s*\d+\s*in the queue/gi, `number ${derivedQueuePosition} in the queue`);
  }, [caseSummary, waitNarrative, derivedQueuePosition]);

  const handleCancelEscalation = () => {
    const ticket = payload.ticket_number?.trim();
    const prompt = ticket
      ? `Cancel escalation ticket ${ticket}.`
      : "Cancel my current escalation.";
    onCancelEscalation?.(prompt);
  };

  return (
    <section className="escalation-shell">
      <div className="escalation-left retail-card">
        <div className="escalation-avatar">L</div>
        <h3>Connecting you to a specialist...</h3>
        <p>
          We&apos;re matching your case with the right Velora specialist so you won&apos;t have to repeat yourself.
        </p>

        <div className="escalation-wait-card">
          <div className="wait-row">
            <span>Estimated Wait Time</span>
            <strong>{waitLabel}</strong>
          </div>
          <div className="wait-bar">
            <div className="wait-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p>Queue position: {derivedQueuePosition}</p>
        </div>

        <div className="escalation-actions">
          <button type="button" className="ghost-btn retail-ghost-btn" onClick={handleCancelEscalation}>Cancel Escalation</button>
        </div>

        <div className="escalation-footnote">
          Lena is sharing the case summary automatically so the specialist can continue where the chat left off.
        </div>
      </div>

      <div className="escalation-right retail-card">
        <div className="escalation-summary-top">
          <h4>Case Summary</h4>
          <span>REF: #{payload.ticket_number}</span>
        </div>
        <div className="issue-panel">
          <div className="issue-thumb" />
          <div>
            <strong>Support Escalation in Progress</strong>
            <p>{syncedCaseSummary}</p>
          </div>
        </div>

        <div className="checklist-block">
          <p className="eyebrow">Steps Already Taken</p>
          {payload.actions_completed.map((item) => (
            <div key={item.label} className="checklist-item">
              <span className="checkmark">✓</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
