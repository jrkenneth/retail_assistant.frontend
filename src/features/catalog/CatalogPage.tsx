import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import { getAuthToken, type AuthenticatedUser } from "../auth/authApi";

type Product = {
  id: string;
  sku: string;
  name: string;
  category_name: string;
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
};

type CatalogPageProps = {
  user: AuthenticatedUser;
  onLogout: () => Promise<void>;
};

const AVAILABILITY_LABELS: Record<string, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

async function fetchCatalog(search: string): Promise<Product[]> {
  const token = getAuthToken();
  const params = new URLSearchParams({ limit: "100" });
  if (search.trim()) params.set("query", search.trim());
  const res = await fetch(`${API_BASE_URL}/catalog?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch_failed");
  const body = await res.json() as { data?: Product[] };
  return body.data ?? [];
}

export function CatalogPage({ user, onLogout }: CatalogPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchCatalog(query)
      .then((data) => { if (!cancelled) { setProducts(data); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [query]);

  return (
    <div className="catalog-page">
      <header className="catalog-page-header">
        <div className="catalog-page-header-left">
          <div className="retail-logo-box">V</div>
          <div>
            <strong>Product Catalog</strong>
            <span>{status === "ready" ? `${products.length} products` : "Loading..."} · {user.full_name}</span>
          </div>
        </div>
        <div className="catalog-page-header-search">
          <input
            className="catalog-search-input"
            type="text"
            placeholder="Search name, SKU, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setQuery(search); }}
          />
          <button type="button" className="btn btn-primary" onClick={() => setQuery(search)}>
            Search
          </button>
          {query && (
            <button type="button" className="btn btn-secondary" onClick={() => { setSearch(""); setQuery(""); }}>
              Clear
            </button>
          )}
        </div>
        <nav className="catalog-page-header-nav">
          <a href="/my-orders" className="retail-topbar-nav-link">My Orders</a>
          <a href="/" className="retail-topbar-nav-link">Back to Chat</a>
          <button type="button" className="retail-topbar-nav-link" onClick={() => void onLogout()}>Logout</button>
        </nav>
      </header>

      <div className="catalog-page-body">
        {status === "loading" && <p className="dev-state-msg">Loading catalog...</p>}
        {status === "error" && (
          <p className="dev-state-msg dev-state-msg--error">
            Could not load catalog. Make sure the Velora backend is running.
          </p>
        )}
        {status === "ready" && products.length === 0 && (
          <p className="dev-state-msg">No products match your search.</p>
        )}
        {status === "ready" && products.length > 0 && (
          <div className="catalog-grid">
            {products.map((product) => (
              <a key={product.id} href={`/catalog/${product.sku}`} className="catalog-card catalog-card--link">
                <div className="catalog-card-img">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} loading="lazy" />
                  ) : (
                    <div className="catalog-card-img-placeholder" />
                  )}
                  <span className={`catalog-status-chip catalog-status-chip--${product.availability_status}`}>
                    {AVAILABILITY_LABELS[product.availability_status] ?? product.availability_status}
                  </span>
                  {product.is_promotion_eligible && (
                    <span className="catalog-promo-chip">Promo</span>
                  )}
                </div>
                <div className="catalog-card-body">
                  <p className="catalog-card-category">{product.category_name}</p>
                  <h3 className="catalog-card-name">{product.name}</h3>
                  <p className="catalog-card-sku">SKU: {product.sku}</p>
                  <div className="catalog-card-price">
                    <strong>${Number(product.price).toFixed(2)}</strong>
                    {product.original_price && (
                      <span className="catalog-card-original-price">
                        ${Number(product.original_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="catalog-card-meta">
                    <span>Stock: {product.stock_quantity}</span>
                    <span>Warranty: {product.warranty_duration}</span>
                    <span>Returns: {product.return_window_days}d</span>
                    {product.rating !== null && (
                      <span>★ {Number(product.rating).toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
