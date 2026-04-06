import type { RefusalPayload } from "./types";

type RefusalCardProps = {
  payload: RefusalPayload;
};

export function RefusalCard({ payload }: RefusalCardProps) {
  return (
    <article className="retail-card refusal-card">
      <div className="refusal-head">
        <div className="refusal-icon">i</div>
        <div>
          <p className="eyebrow">Policy Update</p>
          <h3>{payload.policy_title}</h3>
          <p className="refusal-status-line">Status: Request Declined</p>
        </div>
      </div>

      <p className="refusal-explainer">{payload.reason}</p>

      <div className="policy-bullet-box">
        <strong className="policy-box-title">Return Window Policy</strong>
        {payload.policy_bullets.map((bullet) => (
          <div key={bullet} className="policy-bullet-row">
            <span>•</span>
            <p>{bullet}</p>
          </div>
        ))}
      </div>

      {payload.order_context ? (
        <div className="refusal-context-card">
          <div className="issue-thumb issue-thumb--small" />
          <div>
            <strong>{payload.order_context.product_name}</strong>
            <p>Order #{payload.order_context.order_number}</p>
            <p>Delivered {payload.order_context.delivered_date}</p>
          </div>
        </div>
      ) : null}

      <a className="catalog-link" href="#policy">View Full Refund Policy</a>

      <div className="refusal-assistance">
        <h4>Need further assistance?</h4>
        <p>
          If you believe there has been an error or your situation needs a closer review, Lena can connect you to support.
        </p>
      </div>

      <div className="refusal-footer-actions">
        <button type="button" className="primary-btn retail-primary-btn">Escalate to Support</button>
        <button type="button" className="ghost-btn retail-ghost-btn">Ask Lena Something Else</button>
      </div>

      <div className="refusal-links">
        <span>Shipping Policies</span>
        <span>Payment Methods</span>
        <span>Warranty Info</span>
      </div>
    </article>
  );
}
