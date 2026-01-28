"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ProductRecord } from "@/lib/productRepo";
import { AddToCartButton } from "@/components/AddToCartButton";

type Props = {
  variants: ProductRecord[];
  currentSlug: string;
};

export function VariantSelector({ variants, currentSlug }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentSlug);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelected(currentSlug);
    setQuantity(1);
  }, [currentSlug]);

  const currentVariant =
    variants.find((v) => v.slug === selected) ?? variants[0];

  const getLabel = (item: ProductRecord) =>
    [item.dimension1, item.dimension2].filter(Boolean).join(" / ") || item.name;

  const handleQuantity = (next: number) => {
    const normalized = Math.max(1, Math.floor(next || 1));
    setQuantity(normalized);
  };

  if (variants.length <= 1 && currentVariant) {
    return (
      <div className="stack" style={{ gap: 12 }}>
        <div className="inline" style={{ alignItems: "center", gap: 10 }}>
          <span className="muted">数量</span>
          <div className="cart-qty">
            <button
              className="cart-qty__btn is-minus"
              type="button"
              onClick={() => handleQuantity(quantity - 1)}
            >
              -
            </button>
            <span className="cart-qty__input" aria-live="polite">
              {quantity}
            </span>
            <button
              className="cart-qty__btn"
              type="button"
              onClick={() => handleQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
        </div>
        <AddToCartButton
          productId={currentVariant.id}
          label={"\u30ab\u30fc\u30c8\u306b\u8ffd\u52a0"}
          quantity={quantity}
          hasStock={currentVariant.has_stock}
          guestItem={{
            name: currentVariant.name,
            price: currentVariant.price,
            slug: currentVariant.slug,
            image: currentVariant.image,
            groupId: currentVariant.groupId,
            variantLabel: getLabel(currentVariant),
          }}
        />
      </div>
    );
  }

  const handleChange = (slug: string) => {
    setSelected(slug);
    if (slug !== currentSlug) {
      router.push(`/products/${slug}`);
    }
  };

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="panel variant-panel">
        <label className="variant-panel__control">
          <select
            className="variant-panel__select"
            value={selected}
            onChange={(e) => handleChange(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.slug} value={v.slug}>
                {getLabel(v)}
              </option>
            ))}
          </select>
        </label>
        <p className="variant-panel__note">
          {"\u672c\u5546\u54c1\u306f1\u3064\u306e\u30b0\u30eb\u30fc\u30d7\u306b\u3064\u304d1\u70b9\u306e\u307f\u8cfc\u5165\u53ef\u80fd\u3067\u3059\u3002"}
        </p>
      </div>

      <div className="inline" style={{ alignItems: "center", gap: 10 }}>
        <span className="muted">数量</span>
        <div className="cart-qty">
          <button
            className="cart-qty__btn is-minus"
            type="button"
            onClick={() => handleQuantity(quantity - 1)}
          >
            -
          </button>
          <span className="cart-qty__input" aria-live="polite">
            {quantity}
          </span>
          <button
            className="cart-qty__btn"
            type="button"
            onClick={() => handleQuantity(quantity + 1)}
          >
            +
          </button>
        </div>
      </div>

      {currentVariant && (
        <AddToCartButton
          productId={currentVariant.id}
          quantity={quantity}
          hasStock={currentVariant.has_stock}
          guestItem={{
            name: currentVariant.name,
            price: currentVariant.price,
            slug: currentVariant.slug,
            image: currentVariant.image,
            groupId: currentVariant.groupId,
            variantLabel: getLabel(currentVariant),
          }}
        />
      )}
    </div>
  );
}
