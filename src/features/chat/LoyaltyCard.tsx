import type { LoyaltyPayload } from "./types";

type LoyaltyCardProps = {
  payload: LoyaltyPayload;
};

export function LoyaltyCard({ payload }: LoyaltyCardProps) {
  return (
    <article className="retail-card loyalty-card">
      <div className="loyalty-balance">
        <p className="eyebrow">Loyalty Overview</p>
        <span>Current Balance</span>
        <strong>{payload.current_balance.toLocaleString()} pts</strong>
        {payload.tier ? <p className="loyalty-tier-chip">{payload.tier} Tier</p> : null}
      </div>
      <div className="loyalty-activity">
        <strong className="loyalty-activity-title">Recent Activity</strong>
        {payload.recent_transactions.map((item) => (
          <div key={`${item.date}-${item.description}`} className="loyalty-row">
            <div>
              <strong>{item.description}</strong>
              <p>{item.date} · {item.type}</p>
            </div>
            <span className={item.points >= 0 ? "loyalty-points loyalty-points--positive" : "loyalty-points"}>
              {item.points >= 0 ? "+" : ""}
              {item.points}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
