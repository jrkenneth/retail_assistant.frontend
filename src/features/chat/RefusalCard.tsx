import type { RefusalPayload } from "./types";

type RefusalCardProps = {
  payload: RefusalPayload;
};

export function RefusalCard({ payload }: RefusalCardProps) {
  const isLowConfidence = payload?.reason_code === "low_confidence";
  const policyTitle = payload?.policy_title?.trim() || "Policy Restriction";
  const reason = payload?.reason?.trim() || (isLowConfidence
    ? "Lena needs a quick verification before giving a definitive answer."
    : "I couldn't approve that request based on current policy constraints.");
  const policyBullets = Array.isArray(payload?.policy_bullets)
    ? payload.policy_bullets.filter((bullet): bullet is string => typeof bullet === "string" && bullet.trim().length > 0)
    : [];
  const eyebrow = isLowConfidence ? "Verification Required" : "Policy Decision";
  const statusLine = isLowConfidence ? "Status: Needs review" : "Status: Request Declined";
  const boxTitle = isLowConfidence ? "Why this needs a check" : "Decision Basis";

  return (
    <article className="retail-card refusal-card">
      <div className="refusal-head">
        {!isLowConfidence ? <div className="refusal-icon">i</div> : null}
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{policyTitle}</h3>
          <p className="refusal-status-line">{statusLine}</p>
        </div>
      </div>

      <p className="refusal-explainer">{reason}</p>

      <div className="policy-bullet-box">
        <strong className="policy-box-title">{boxTitle}</strong>
        {(policyBullets.length > 0 ? policyBullets : ["Please review the relevant policy details or ask Lena for clarification."]).map((bullet) => (
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
    </article>
  );
}
