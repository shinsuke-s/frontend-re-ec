"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/data";
import { formatCurrency } from "@/lib/data";

type Props = {
  products: Product[];
  title?: string;
};

type SortKey = "newest" | "price-asc" | "price-desc";
const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function ProductCarousel({ products, title = "商品一覧" }: Props) {
  const [sort, setSort] = useState<SortKey>("newest");

  const sortedProducts = useMemo(() => {
    const indexed = products.map((product, index) => ({ product, index }));
    if (sort === "price-asc") {
      indexed.sort((a, b) => a.product.price - b.product.price);
    } else if (sort === "price-desc") {
      indexed.sort((a, b) => b.product.price - a.product.price);
    } else {
      indexed.sort((a, b) => {
        const aId = String(a.product.id || "").toUpperCase();
        const bId = String(b.product.id || "").toUpperCase();
        if (ulidPattern.test(aId) && ulidPattern.test(bId)) {
          return bId.localeCompare(aId);
        }
        return a.index - b.index;
      });
    }
    return indexed.map((item) => item.product);
  }, [products, sort]);

  if (!products.length) return null;

  return (
    <section className="product-list">
      <div className="product-list-header">
        <div className="stack">
          <span className="eyebrow">Products</span>
          <h2>{title}</h2>
        </div>
        <div className="product-list-sort">
          <span className="muted">並び替え</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="newest">新着順</option>
            <option value="price-asc">価格が安い順</option>
            <option value="price-desc">価格が高い順</option>
          </select>
        </div>
      </div>

      <div className="product-list-grid">
        {sortedProducts.map((product, index) => (
          <div key={product.id} className="product-card product-card--list">
            <div className="product-media">
              <span className="product-flag">こちらは予約商品になります。</span>
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 320px"
                  priority={index === 0}
                />
              ) : null}
            </div>
            <div className="product-body">
              <h3>{product.name}</h3>
              <p className="muted">{product.description}</p>
            </div>
            <div className="product-meta-row">
              <span className="price">{formatCurrency(product.price)}</span>
              <Link
                className="btn secondary"
                href={`/products/${product.slug || product.id}`}
              >
                商品を見る
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
