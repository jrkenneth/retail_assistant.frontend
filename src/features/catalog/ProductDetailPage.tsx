import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { getAuthToken, type AuthenticatedUser } from "../auth/authApi";

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category_name: string;
  category_slug: string;
  price: string;
  original_price: string | null;
  stock_quantity: number;
  availability_status: "in_stock" | "low_stock" | "out_of_stock";
  warranty_duration: string;
  return_window_days: number;
  is_promotion_eligible: boolean;
  image_url: string | null;
  rating: string | null;
  review_count: number | null;
  specifications: Record<string, string>;
  created_at: string;
  updated_at: string;
};

type ProductDetailPageProps = {
  user: AuthenticatedUser;
  onLogout: () => Promise<void>;
};

const AVAILABILITY_LABELS: Record<string, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

const AVAILABILITY_COLOURS: Record<string, string> = {
  in_stock: "#10b981",
  low_stock: "#f59e0b",
  out_of_stock: "#ef4444",
};

function getSku(): string {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] ?? "";
}

async function fetchProduct(sku: string): Promise<Product> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/catalog/${encodeURIComponent(sku)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_failed");
  const body = await res.json() as { data?: Product } | Product;
  // Velora returns { data: product } for single item
  if ("data" in body && body.data) return body.data;
  return body as Product;
}

export function ProductDetailPage({ user, onLogout }: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const sku = getSku();

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchProduct(sku)
      .then((data) => { if (!cancelled) { setProduct(data); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [sku]);

  return (
    <div className="catalog-page">
      <header className="catalog-page-header">
        <div className="catalog-page-header-left">
          <div className="retail-logo-box">V</div>
          <div>
            <strong>{status === "ready" && product ? product.name : "Product Detail"}</strong>
            <span>{user.full_name}</span>
          </div>
        </div>
        <nav className="catalog-page-header-nav">
          <a href="/catalog" className="retail-topbar-nav-link">← Back to Catalog</a>
          <a href="/my-orders" className="retail-topbar-nav-link">My Orders</a>
          <a href="/" className="retail-topbar-nav-link">Back to Chat</a>
          <button type="button" className="retail-topbar-nav-link" onClick={() => void onLogout()}>Logout</button>
        </nav>
      </header>

      <div className="catalog-page-body">
        {status === "loading" && <p className="dev-state-msg">Loading product...</p>}
        {status === "error" && (
          <p className="dev-state-msg dev-state-msg--error">
            Could not load product. Make sure the Velora backend is running.
          </p>
        )}
        {status === "ready" && product && (
          <div className="product-detail">
            <div className="product-detail-hero">
              <div className="product-detail-img">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} />
                ) : (
                  <div className="product-detail-img-placeholder" />
                )}
              </div>
              <div className="product-detail-summary">
                <p className="product-detail-category">{product.category_name}</p>
                <h1 className="product-detail-name">{product.name}</h1>
                <p className="product-detail-sku">SKU: {product.sku}</p>

                <div className="product-detail-price">
                  <strong>${Number(product.price).toFixed(2)}</strong>
                  {product.original_price && (
                    <span className="product-detail-original-price">
                      ${Number(product.original_price).toFixed(2)}
                    </span>
                  )}
                  {product.is_promotion_eligible && (
                    <span className="product-detail-promo-chip">Promo</span>
                  )}
                </div>

                {product.rating !== null && (
                  <div className="product-detail-rating">
                    <span className="product-detail-stars">★</span>
                    <span>
                      {Number(product.rating).toFixed(1)} / 5
                      {product.review_count !== null && ` · ${product.review_count.toLocaleString()} reviews`}
                    </span>
                  </div>
                )}

                <div className="product-detail-availability">
                  <span
                    className="product-detail-status-chip"
                    style={{ background: AVAILABILITY_COLOURS[product.availability_status] ?? "#6b7280" }}
                  >
                    {AVAILABILITY_LABELS[product.availability_status] ?? product.availability_status}
                  </span>
                  <span className="product-detail-stock">
                    {product.stock_quantity} unit{product.stock_quantity !== 1 ? "s" : ""} in stock
                  </span>
                </div>

                <p className="product-detail-description">{product.description}</p>

                <div className="product-detail-meta-grid">
                  <div className="product-detail-meta-item">
                    <span className="product-detail-meta-label">Warranty</span>
                    <span className="product-detail-meta-value">{product.warranty_duration}</span>
                  </div>
                  <div className="product-detail-meta-item">
                    <span className="product-detail-meta-label">Return Window</span>
                    <span className="product-detail-meta-value">{product.return_window_days} days</span>
                  </div>
                  <div className="product-detail-meta-item">
                    <span className="product-detail-meta-label">Category</span>
                    <span className="product-detail-meta-value">{product.category_name}</span>
                  </div>
                  <div className="product-detail-meta-item">
                    <span className="product-detail-meta-label">Promotion Eligible</span>
                    <span className="product-detail-meta-value">{product.is_promotion_eligible ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>
            </div>

            {Object.keys(product.specifications).length > 0 && (
              <div className="product-detail-specs">
                <h2 className="product-detail-specs-title">Specifications</h2>
                <table className="product-detail-specs-table">
                  <tbody>
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <tr key={key}>
                        <td className="product-detail-specs-key">{key}</td>
                        <td className="product-detail-specs-val">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
