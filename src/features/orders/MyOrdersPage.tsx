import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../config";
import { getAuthToken, type AuthenticatedUser } from "../auth/authApi";

type OrderItem = {
  sku: string;
  name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  delivery_status: string;
  tracking_number: string | null;
  total_amount: string;
  shipping_address: string;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  created_at: string;
};

type Return = {
  id: string;
  return_number: string;
  status: "requested" | "approved" | "rejected" | "completed";
  reason: string;
  refund_amount: string | null;
  refund_status: "pending" | "processed" | "not_applicable";
  requested_at: string;
  resolved_at: string | null;
  customer_number: string;
  order_number: string;
};

type MyOrdersPageProps = {
  user: AuthenticatedUser;
  onLogout: () => Promise<void>;
};

const STATUS_COLOURS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

const DELIVERY_COLOURS: Record<string, string> = {
  processing: "#6b7280",
  in_transit: "#3b82f6",
  out_for_delivery: "#8b5cf6",
  delivered: "#10b981",
  failed: "#ef4444",
};

const RETURN_STATUS_COLOURS: Record<string, string> = {
  requested: "#f59e0b",
  approved: "#3b82f6",
  rejected: "#ef4444",
  completed: "#10b981",
};

const REFUND_STATUS_COLOURS: Record<string, string> = {
  pending: "#f59e0b",
  processed: "#10b981",
  not_applicable: "#6b7280",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function fetchOrders(): Promise<Order[]> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/my-orders?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_failed");
  const body = await res.json() as { data?: Order[] };
  return body.data ?? [];
}

async function fetchReturns(): Promise<Return[]> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/my-returns?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_failed");
  const body = await res.json() as { data?: Return[] };
  return body.data ?? [];
}

export function MyOrdersPage({ user, onLogout }: MyOrdersPageProps) {
  const [tab, setTab] = useState<"orders" | "returns">("orders");

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersStatus, setOrdersStatus] = useState<"loading" | "ready" | "error">("loading");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, OrderItem[]>>({});

  // Returns state
  const [returns, setReturns] = useState<Return[]>([]);
  const [returnsStatus, setReturnsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const returnsFetchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchOrders()
      .then((data) => { if (!cancelled) { setOrders(data); setOrdersStatus("ready"); } })
      .catch(() => { if (!cancelled) setOrdersStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (tab !== "returns" || returnsFetchedRef.current) return;
    returnsFetchedRef.current = true;
    setReturnsStatus("loading");
    fetchReturns()
      .then((data) => { setReturns(data); setReturnsStatus("ready"); })
      .catch(() => setReturnsStatus("error"));
  }, [tab]);

  const toggleRow = async (order: Order) => {
    if (expanded === order.id) {
      setExpanded(null);
      return;
    }
    setExpanded(order.id);
    if (itemsCache[order.id]) return;

    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/my-orders/${order.order_number}/items`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const body = await res.json() as { data?: OrderItem[] };
        setItemsCache((prev) => ({ ...prev, [order.id]: body.data ?? [] }));
      }
    } catch {
      // Items stay empty — the detail row handles it gracefully
    }
  };

  return (
    <main className="viewer-page">
      <header className="app-header">
        <div className="app-header-left">
          <div className="retail-logo-box" style={{ marginRight: 12 }}>V</div>
          <div className="app-header-copy">
            <h1>My Orders</h1>
            <p>{user.full_name} · {user.customer_number}</p>
          </div>
        </div>
        <div className="app-header-actions">
          <a className="secondary-link app-header-link" href="/catalog">Catalog</a>
          <a className="secondary-link app-header-link" href="/">Back to Chat</a>
          <button type="button" className="secondary-link app-header-link" onClick={() => void onLogout()}>
            Logout
          </button>
        </div>
      </header>

      <div className="dev-page-body">
        {/* Tab switcher */}
        <div className="orders-tab-row">
          <button
            type="button"
            className={`orders-tab${tab === "orders" ? " orders-tab--active" : ""}`}
            onClick={() => setTab("orders")}
          >
            Orders
            {ordersStatus === "ready" && (
              <span className="orders-tab-count">{orders.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`orders-tab${tab === "returns" ? " orders-tab--active" : ""}`}
            onClick={() => setTab("returns")}
          >
            Returns
            {returnsStatus === "ready" && (
              <span className="orders-tab-count">{returns.length}</span>
            )}
          </button>
        </div>

        {/* ── Orders tab ── */}
        {tab === "orders" && (
          <>
            {ordersStatus === "loading" && <p className="dev-state-msg">Loading orders...</p>}
            {ordersStatus === "error" && (
              <p className="dev-state-msg dev-state-msg--error">
                Could not load orders. Make sure the Velora backend is running.
              </p>
            )}
            {ordersStatus === "ready" && orders.length === 0 && (
              <p className="dev-state-msg">No orders found for your account.</p>
            )}
            {ordersStatus === "ready" && orders.length > 0 && (
              <div className="orders-table-wrap">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Delivery</th>
                      <th>Tracking</th>
                      <th>Est. Delivery</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <>
                        <tr
                          key={order.id}
                          className={`orders-row${expanded === order.id ? " orders-row--expanded" : ""}`}
                          onClick={() => { void toggleRow(order); }}
                        >
                          <td className="orders-number">{order.order_number}</td>
                          <td>{formatDate(order.created_at)}</td>
                          <td>
                            <span
                              className="orders-badge"
                              style={{ background: STATUS_COLOURS[order.status] ?? "#6b7280" }}
                            >
                              {order.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td>
                            <span
                              className="orders-badge"
                              style={{ background: DELIVERY_COLOURS[order.delivery_status] ?? "#6b7280" }}
                            >
                              {order.delivery_status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="orders-tracking">{order.tracking_number ?? "—"}</td>
                          <td>{formatDate(order.estimated_delivery_date)}</td>
                          <td style={{ textAlign: "right" }}>
                            <strong>${Number(order.total_amount).toFixed(2)}</strong>
                          </td>
                          <td className="orders-expand-col">
                            <span className={`orders-expand-icon${expanded === order.id ? " orders-expand-icon--open" : ""}`}>›</span>
                          </td>
                        </tr>
                        {expanded === order.id && (
                          <tr key={`${order.id}-detail`} className="orders-detail-row">
                            <td colSpan={8}>
                              <div className="orders-detail-inner">
                                <div className="orders-detail-meta">
                                  <span><strong>Ship to:</strong> {order.shipping_address}</span>
                                  {order.actual_delivery_date && (
                                    <span><strong>Delivered:</strong> {formatDate(order.actual_delivery_date)}</span>
                                  )}
                                </div>
                                {(itemsCache[order.id] ?? []).length > 0 ? (
                                  <table className="orders-items-table">
                                    <thead>
                                      <tr>
                                        <th>SKU</th>
                                        <th>Product</th>
                                        <th style={{ textAlign: "center" }}>Qty</th>
                                        <th style={{ textAlign: "right" }}>Unit Price</th>
                                        <th style={{ textAlign: "right" }}>Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(itemsCache[order.id] ?? []).map((item) => (
                                        <tr key={item.sku}>
                                          <td className="orders-tracking">{item.sku}</td>
                                          <td>{item.name}</td>
                                          <td style={{ textAlign: "center" }}>{item.quantity}</td>
                                          <td style={{ textAlign: "right" }}>${Number(item.unit_price).toFixed(2)}</td>
                                          <td style={{ textAlign: "right" }}>${Number(item.subtotal).toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="dev-state-msg" style={{ margin: 0 }}>No item details available.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Returns tab ── */}
        {tab === "returns" && (
          <>
            {returnsStatus === "loading" && <p className="dev-state-msg">Loading returns...</p>}
            {returnsStatus === "error" && (
              <p className="dev-state-msg dev-state-msg--error">
                Could not load returns. Make sure the Velora backend is running.
              </p>
            )}
            {returnsStatus === "ready" && returns.length === 0 && (
              <p className="dev-state-msg">No return requests found for your account.</p>
            )}
            {returnsStatus === "ready" && returns.length > 0 && (
              <div className="orders-table-wrap">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Return #</th>
                      <th>Order #</th>
                      <th>Requested</th>
                      <th>Status</th>
                      <th>Refund Status</th>
                      <th style={{ textAlign: "right" }}>Refund Amount</th>
                      <th>Resolved</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((ret) => (
                      <tr key={ret.id} className="orders-row">
                        <td className="orders-number">{ret.return_number}</td>
                        <td className="orders-tracking">{ret.order_number}</td>
                        <td>{formatDate(ret.requested_at)}</td>
                        <td>
                          <span
                            className="orders-badge"
                            style={{ background: RETURN_STATUS_COLOURS[ret.status] ?? "#6b7280" }}
                          >
                            {ret.status}
                          </span>
                        </td>
                        <td>
                          <span
                            className="orders-badge"
                            style={{ background: REFUND_STATUS_COLOURS[ret.refund_status] ?? "#6b7280" }}
                          >
                            {ret.refund_status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {ret.refund_amount !== null
                            ? <strong>${Number(ret.refund_amount).toFixed(2)}</strong>
                            : "—"}
                        </td>
                        <td>{formatDate(ret.resolved_at)}</td>
                        <td className="returns-reason">{ret.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
