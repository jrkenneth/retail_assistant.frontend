import type { EscalationPayload } from "./types";

type EscalationPanelProps = {
  payload: EscalationPayload;
};

export function EscalationPanel({ payload }: EscalationPanelProps) {
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
            <strong>~ {payload.estimated_wait_minutes} Minutes</strong>
          </div>
          <div className="wait-bar">
            <div className="wait-bar-fill" style={{ width: "58%" }} />
          </div>
          <p>Queue position: {payload.queue_position}</p>
        </div>

        <div className="escalation-actions">
          <button type="button" className="primary-btn retail-primary-btn">Notify me when ready</button>
          <button type="button" className="ghost-btn retail-ghost-btn">Cancel Escalation</button>
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
            <p>{payload.case_summary}</p>
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

        <div className="escalation-utility-actions">
          <button type="button" className="ghost-btn retail-ghost-btn">Email Updates</button>
          <button type="button" className="ghost-btn retail-ghost-btn">Add Photos</button>
          <button type="button" className="ghost-btn retail-ghost-btn">Request Callback</button>
        </div>
      </div>
    </section>
  );
}
