"use client";

import Link from "next/link";
import { useState } from "react";
import { addGuestCartItem } from "@/lib/guestCart";

type Props = {
  productId: string | number;
  label?: string;
  quantity?: number;
  showQuantityControls?: boolean;
  onQuantityChange?: (val: number) => void;
  hasStock?: boolean;
  guestItem?: {
    name: string;
    price: number;
    slug: string;
    image?: string;
    groupId?: string;
    variantLabel?: string;
  };
};

export function AddToCartButton({
  productId,
  label = "\u30ab\u30fc\u30c8\u306b\u8ffd\u52a0",
  quantity,
  showQuantityControls,
  onQuantityChange,
  hasStock,
  guestItem,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error" | "guest">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [localQty, setLocalQty] = useState(quantity ?? 1);
  const [showModal, setShowModal] = useState(false);
  const qty = quantity ?? localQty;
  const outOfStock = hasStock === false;
  const buttonLabel = outOfStock ? "\u5728\u5eab\u306a\u3057" : label;

  const handleAdd = async () => {
    if (outOfStock) return;
    setLoading(true);
    setStatus("idle");
    setMessage(null);
    try {
      const rawId = String(productId).trim();
      const isNumeric = /^\d+$/.test(rawId);
      const endpoint = isNumeric ? "/api/cart" : "/api/external-cart";
      const payload = isNumeric
        ? { productId: Number(rawId), quantity: qty }
        : { productId: rawId };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (typeof data?.message === "string" && data.message.includes("Auth token is not set")) {
        if (guestItem) {
          addGuestCartItem({
            productId: rawId,
            name: guestItem.name,
            price: guestItem.price,
            quantity: qty,
            slug: guestItem.slug,
            image: guestItem.image,
            groupId: guestItem.groupId,
            variantLabel: guestItem.variantLabel,
          });
          setStatus("ok");
          setShowModal(true);
          return;
        }
      }
      if (res.status === 401) {
        if (guestItem) {
          addGuestCartItem({
            productId: rawId,
            name: guestItem.name,
            price: guestItem.price,
            quantity: qty,
            slug: guestItem.slug,
            image: guestItem.image,
            groupId: guestItem.groupId,
            variantLabel: guestItem.variantLabel,
          });
          setStatus("ok");
          setShowModal(true);
          return;
        }
        setStatus("guest");
        setMessage("\u30ed\u30b0\u30a4\u30f3\u3057\u3066\u304f\u3060\u3055\u3044");
        return;
      }
      if (!res.ok) {
        throw new Error(data?.message || "\u30ab\u30fc\u30c8\u8ffd\u52a0\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
      }
      if (!isNumeric && qty > 1) {
        try {
          const cartRes = await fetch("/api/external-cart", { cache: "no-store" });
          const cartData = await cartRes.json().catch(() => ({}));
          const items = Array.isArray(cartData?.items) ? cartData.items : [];
          const matches = items.filter(
            (item: any) => String(item?.productId) === rawId
          );
          const target = matches[matches.length - 1];
          if (target?.orderItemId) {
            await fetch("/api/external-cart", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_item_id: target.orderItemId,
                quantity: qty,
              }),
            });
          }
        } catch {
          // ignore quantity sync failure
        }
      }
      setStatus("ok");
      setShowModal(true);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "\u30ab\u30fc\u30c8\u8ffd\u52a0\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
    } finally {
      setLoading(false);
    }
  };

  const applyQty = (val: number) => {
    const next = Math.max(1, Math.floor(val || 1));
    onQuantityChange ? onQuantityChange(next) : setLocalQty(next);
  };

  return (
    <>
      <div className="stack" style={{ gap: "6px" }}>
        {showQuantityControls && (
          <div className="inline" style={{ gap: 8, alignItems: "center" }}>
            <button className="btn" type="button" disabled={loading} onClick={() => applyQty(qty - 1)}>
              -
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => applyQty(Number(e.target.value))}
              style={{ width: 72 }}
            />
            <button className="btn" type="button" disabled={loading} onClick={() => applyQty(qty + 1)}>
              +
            </button>
          </div>
        )}
        <button
          className="btn primary"
          type="button"
          onClick={handleAdd}
          disabled={loading || outOfStock}
          aria-disabled={loading || outOfStock}
        >
          {loading ? "\u8ffd\u52a0\u4e2d..." : buttonLabel}
        </button>
        {message && (
          <span className="muted" style={{ fontSize: "13px" }}>
            {message}
          </span>
        )}
        {status === "guest" && (
          <span className="muted" style={{ fontSize: "12px", color: "#c43c47" }}>
            {"\u30ed\u30b0\u30a4\u30f3\u5f8c\u306b\u5229\u7528\u3067\u304d\u307e\u3059"}
          </span>
        )}
      </div>

      {showModal && status === "ok" && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-modal__header">
              <div className="cart-modal__title">
                {"\u30ab\u30fc\u30c8\u306b\u8ffd\u52a0\u3057\u307e\u3057\u305f\u3002"}
              </div>
              <button
                className="cart-modal__close"
                type="button"
                onClick={() => setShowModal(false)}
                aria-label={"\u9589\u3058\u308b"}
              >
                &#215;
              </button>
            </div>
            <div className="cart-modal__body">
              <div className="cart-modal__actions">
                <button
                  className="btn secondary cart-modal__secondary"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  {"\u304a\u8cb7\u3044\u7269\u3092\u7d9a\u3051\u308b"}
                </button>
                <Link
                  className="btn primary cart-modal__primary"
                  href="/cart"
                  onClick={() => setShowModal(false)}
                >
                  {"\u30ab\u30fc\u30c8\u3092\u898b\u308b"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
