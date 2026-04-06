import type { ProductCardPayload } from "./types";

type ProductCardProps = {
  product: ProductCardPayload;
};

export function ProductCard({ product }: ProductCardProps) {
  const specs = Object.entries(product.specifications ?? {});
  const reviewLabel = typeof product.review_count === "number"
    ? `${product.review_count.toLocaleString()} reviews`
    : "2.4k reviews";
  const ratingLabel = typeof product.rating === "number" ? product.rating.toFixed(1) : "4.8";

  return (
    <article className="retail-card product-card">
      <div className="product-card-media">
        <div className="product-card-badges">
          <span className={`status-chip status-chip--${product.availability_status}`}>
            {product.availability_status.replace(/_/g, " ")}
          </span>
          {product.is_promotion_eligible ? (
            <span className="status-chip status-chip--promo">Promotion Eligible</span>
          ) : null}
        </div>
        <div className="product-image-placeholder" aria-hidden="true">
          <div className="product-image-shape">
            <div className="product-image-highlight" />
          </div>
        </div>
      </div>

      <div className="product-card-body">
        <p className="eyebrow">Product Spotlight</p>
        <h3>{product.name}</h3>
        <p className="product-sku">SKU {product.sku}</p>
        <div className="product-rating-line">
          <span className="product-stars">★★★★★</span>
          <span>
            {ratingLabel} / 5
            {` · ${reviewLabel}`}
          </span>
        </div>

        <div className="product-price-line">
          <strong>${product.price.toFixed(2)}</strong>
          {typeof product.original_price === "number" ? (
            <span className="product-price-original">${product.original_price.toFixed(2)}</span>
          ) : null}
        </div>

        <div className="product-meta-list">
          <div>
            <strong>{product.warranty_duration}</strong>
            <span>Manufacturer Warranty</span>
          </div>
          <div>
            <strong>{product.return_window_days}-Day</strong>
            <span>Easy Returns</span>
          </div>
        </div>

        <details className="product-specs" open>
          <summary>Technical Specs</summary>
          <div className="product-spec-grid">
            {specs.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </details>

        <div className="product-card-actions">
          <button type="button" className="primary-btn retail-primary-btn">Add to Cart</button>
          <button type="button" className="ghost-btn retail-ghost-btn">Compare with Similar</button>
        </div>

        <div className="product-tip-banner">
          Pro Tip: Ask Lena about compatible accessories, delivery windows, or bundle savings for this item.
        </div>
      </div>
    </article>
  );
}
