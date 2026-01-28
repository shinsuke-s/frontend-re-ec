"use client";

import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/data";
import type { ProductRecord } from "@/lib/productRepo";

type Props = {
  items: ProductRecord[];
  title: string;
  variationLabel: string;
  viewLabel: string;
};

const getStockStatus = (item: ProductRecord) => {
  const isReserved = item.type === "per_order";
  const hasStockFlag =
    typeof item.has_stock === "boolean" ? item.has_stock : true;
  const stockCount =
    Number.isFinite(item.stock) && item.stock > 0 ? item.stock : null;
  if (isReserved) return "\u4e88\u7d04\u53d7\u4ed8\u4e2d";
  if (!hasStockFlag) return "\u5728\u5eab\u306a\u3057";
  if (stockCount !== null && stockCount <= 5)
    return "\u6b8b\u308a\u308f\u305a\u304b";
  return "\u5728\u5eab\u3042\u308a";
};

const getVariantLabel = (item: ProductRecord) =>
  [item.dimension1, item.dimension2].filter(Boolean).join(" / ");

export function RelatedProducts({
  items,
  title,
  variationLabel,
  viewLabel,
}: Props) {
  if (!items.length) return null;

  const useLoop = items.length >= 3;

  const renderCard = (item: ProductRecord) => {
    const variant = getVariantLabel(item);
    return (
      <div className="related-slide">
        <div className="product-card">
          <div className="product-media">
            <Link href={`/products/${item.slug}`}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  minHeight: "160px",
                }}
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 240px"
                  />
                ) : null}
              </div>
            </Link>
          </div>
          <h3>{item.name}</h3>
          {variant && (
            <div className="muted" style={{ fontSize: 13 }}>
              {variationLabel}: {variant}
            </div>
          )}
          <div className="meta">
            <span className="price">{formatCurrency(item.price)}</span>
            <span className="tag">{getStockStatus(item)}</span>
          </div>
          <div className="btn-row">
            <Link
              className="btn secondary"
              href={`/products/${item.slug}`}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {viewLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="panel related-products">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      {useLoop ? (
        <div className="related-marquee" aria-label="関連商品スライダー">
          <div className="related-marquee__track">
            {[...items, ...items].map((item, idx) => (
              <div key={`${item.id}-${idx}`}>{renderCard(item)}</div>
            ))}
          </div>
        </div>
      ) : (
        <div className="related-list">
          {items.map((item) => (
            <div key={item.id}>{renderCard(item)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
