import type { OrderCardPayload } from "./types";

type OrderCardProps = {
  order: OrderCardPayload;
};

export function OrderCard({ order }: OrderCardProps) {
  return (
    <article className="retail-card order-card">
      <div className="order-card-hero">
        <div className="order-status-row">
          <span className={`status-chip status-chip--${order.status}`}>{order.status.toUpperCase()}</span>
          <span className="status-chip status-chip--muted">
            {order.estimated_delivery_date ? `Expected ${order.estimated_delivery_date}` : "Tracking active"}
          </span>
        </div>
        <div className="order-hero-box" aria-hidden="true">
          <div className="order-hero-box-lid" />
        </div>
      </div>

      <div className="order-card-body">
        <div className="order-card-header">
          <div>
            <p className="eyebrow">Delivery Summary</p>
            <h3>Order #{order.order_number}</h3>
          </div>
          <span className={`delivery-pill delivery-pill--${order.delivery_status}`}>
            {order.delivery_status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="order-card-grid">
          <div>
            <span>Order Date</span>
            <strong>{order.order_date}</strong>
          </div>
          <div>
            <span>Tracking Number</span>
            <strong>{order.tracking_number ?? "Not available"}</strong>
          </div>
          <div>
            <span>Refund Status</span>
            <strong>{order.refund_status ?? "Not applicable"}</strong>
          </div>
        </div>

        <div className="order-item-list">
          {order.items.map((item) => (
            <div key={`${item.name}-${item.quantity}`} className="order-item-row">
              <span>{item.name}</span>
              <span>
                {item.quantity} × ${item.unit_price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="order-card-actions">
          <button type="button" className="primary-btn retail-primary-btn" disabled={!order.can_initiate_return}>
            Initiate Return
          </button>
          <button type="button" className="ghost-btn retail-ghost-btn">Contact Support</button>
        </div>
      </div>
    </article>
  );
}
