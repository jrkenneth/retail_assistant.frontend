import { useState } from "react";
import type { ProductCardPayload } from "./types";

type ProductCardProps = {
  product: ProductCardPayload;
};

export function ProductCard({ product }: ProductCardProps) {
  const [imageHidden, setImageHidden] = useState(false);
  const specs = Object.entries(product.specifications ?? {}).filter(([label, value]) => {
    const normalizedLabel = String(label).trim();
    const normalizedValue = String(value ?? "").trim();
    return normalizedLabel.length > 0 && normalizedValue.length > 0;
  });
  const reviewLabel = typeof product.review_count === "number"
    ? `${product.review_count.toLocaleString()} reviews`
    : null;
  const ratingLabel = typeof product.rating === "number" ? product.rating.toFixed(1) : null;
  const imageSrc =
    typeof product.image_url === "string" && product.image_url.trim().length > 0
      ? product.image_url
      : undefined;
  const productPageHref = `/catalog/${encodeURIComponent(product.sku)}`;

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
        {imageSrc && !imageHidden ? (
          <img
            src={imageSrc}
            alt={product.name}
            className="product-image"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
              setImageHidden(true);
            }}
          />
        ) : null}
        {!imageSrc || imageHidden ? (
          <div className="product-image-placeholder" aria-hidden="true" />
        ) : null}
      </div>

      <div className="product-card-body">
        <p className="eyebrow">Product Spotlight</p>
        <h3>{product.name}</h3>
        <p className="product-sku">SKU {product.sku}</p>
        {ratingLabel !== null && (
          <div className="product-rating-line">
            <span className="product-stars">★★★★★</span>
            <span>
              {ratingLabel} / 5
              {reviewLabel !== null ? ` · ${reviewLabel}` : null}
            </span>
          </div>
        )}

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
            {specs.length > 0 ? specs.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            )) : (
              <div>
                <span>Specs status</span>
                <strong>No technical specifications are available for this item yet.</strong>
              </div>
            )}
          </div>
        </details>

        <div className="product-card-actions">
          <a
            href={productPageHref}
            target="_blank"
            rel="noreferrer"
            className="primary-btn retail-primary-btn product-page-cta"
          >
            View Product Page
          </a>
        </div>
      </div>
    </article>
  );
}
