"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/data";
import {
  clearGuestCart,
  getGuestCartItems,
  removeGuestCartItem,
  setGuestCartItems,
  updateGuestCartItem,
} from "@/lib/guestCart";

type CartItem = {
  orderItemId?: string;
  productId: string;
  quantity: number;
  name: string;
  price: number;
  slug: string;
  category?: string;
  image?: string | null;
  variantLabel?: string;
};

type CartResponse = {
  status: string;
  items?: CartItem[];
  message?: string;
  source?: "external" | "local";
  total?: number;
};

export default function CartPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [source, setSource] = useState<"external" | "local" | "guest">("local");
  const [totalOverride, setTotalOverride] = useState<number | null>(null);

  const loadCart = async () => {
    try {
      const res = await fetch("/api/external-cart", { cache: "no-store" });
      const data: CartResponse = await res.json();
      if (!res.ok) {
        if (
          res.status === 401 ||
          (typeof data?.message === "string" && data.message.includes("Auth token is not set")) ||
          data?.status === "guest"
        ) {
          const guestItems = getGuestCartItems();
          setItems(guestItems);
          setSource("guest");
          setTotalOverride(null);
          void hydrateGuestVariants(guestItems);
          return;
        }
        setError(data.message || "カートの取得に失敗しました");
        return;
      }
      setItems(data.items || []);
      setSource(data.source || "local");
      setTotalOverride(typeof data.total === "number" ? data.total : null);
    } catch (e: any) {
      setError(e.message || "カートの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const hydrateGuestVariants = async (guestItems: CartItem[]) => {
    const missing = guestItems.filter((item) => !item.variantLabel);
    if (missing.length === 0) return;
    try {
      const entries = await Promise.all(
        missing.map(async (item) => {
          const res = await fetch(
            `/api/external-product?id=${encodeURIComponent(item.productId)}`,
            { cache: "no-store" }
          );
          const data = await res.json().catch(() => ({}));
          return {
            productId: item.productId,
            variantLabel: data?.variantLabel || "",
          };
        })
      );
      const labelMap = new Map(
        entries
          .filter((e) => e.variantLabel)
          .map((e) => [e.productId, e.variantLabel])
      );
      if (labelMap.size === 0) return;
      const next = guestItems.map((item) => ({
        ...item,
        variantLabel: labelMap.get(item.productId) || item.variantLabel,
      }));
      setGuestCartItems(next);
      setItems(next);
    } catch {
      // ignore
    }
  };

  const total = useMemo(() => {
    if (totalOverride !== null) return totalOverride;
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items, totalOverride]);
  const rewardPoints = useMemo(() => Math.floor(total * 0.01), [total]);

  const handleRemove = async (productId: string, orderItemId?: string) => {
    setError(null);
    const removingKey = orderItemId || productId;
    setRemovingId(removingKey);
    try {
      if (source === "external") {
        const resolvedOrderItemId =
          orderItemId || items.find((item) => item.productId === productId)?.orderItemId;
        if (!resolvedOrderItemId)
          throw new Error("削除対象の識別子が見つかりません");
        const res = await fetch("/api/external-cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_item_id: resolvedOrderItemId,
            quantity: 0,
          }),
        });
        const data: CartResponse = await res.json();
        if (!res.ok) throw new Error(data.message || "削除に失敗しました");
        await loadCart();
      } else if (source === "guest") {
        const nextItems = removeGuestCartItem(productId);
        setItems(nextItems);
      } else {
        const numericId = Number(productId);
        const res = await fetch("/api/cart", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: Number.isNaN(numericId) ? productId : numericId,
          }),
        });
        const data: CartResponse = await res.json();
        if (!res.ok) throw new Error(data.message || "削除に失敗しました");
        setItems(data.items || []);
      }
    } catch (e: any) {
      setError(e.message || "削除に失敗しました");
    } finally {
      setRemovingId(null);
    }
  };

  const handleChangeQuantity = async (
    productId: string,
    nextQty: number,
    orderItemId?: string,
  ) => {
    setError(null);
    const updatingKey = orderItemId || productId;
    setUpdatingId(updatingKey);
    try {
      if (source === "external") {
        const resolvedOrderItemId =
          orderItemId || items.find((item) => item.productId === productId)?.orderItemId;
        if (!resolvedOrderItemId)
          throw new Error("更新対象の識別子が見つかりません");
        const res = await fetch("/api/external-cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_item_id: resolvedOrderItemId,
            quantity: nextQty,
          }),
        });
        const data: CartResponse = await res.json();
        if (!res.ok) throw new Error(data.message || "更新に失敗しました");
        await loadCart();
      } else if (source === "guest") {
        const nextItems = updateGuestCartItem(productId, nextQty);
        setItems(nextItems);
      } else {
        const numericId = Number(productId);
        const res = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: Number.isNaN(numericId) ? productId : numericId,
            quantity: nextQty,
          }),
        });
        const data: CartResponse = await res.json();
        if (!res.ok) throw new Error(data.message || "更新に失敗しました");
        setItems(data.items || []);
      }
    } catch (e: any) {
      setError(e.message || "更新に失敗しました");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCart = async () => {
    setError(null);
    setClearing(true);
    try {
      if (source === "external") {
        const res = await fetch("/api/external-cart", { method: "DELETE" });
        const data: CartResponse = await res.json();
        if (!res.ok) throw new Error(data.message || "カートの削除に失敗しました");
        setItems([]);
        setTotalOverride(0);
      } else if (source === "guest") {
        clearGuestCart();
        setItems([]);
        setTotalOverride(0);
      }
    } catch (e: any) {
      setError(e.message || "カートの削除に失敗しました");
    } finally {
      setClearing(false);
    }
  };

  const handleShareItem = async (item: CartItem) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/products/${item.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Cart</span>
        <h1>カート</h1>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          {loading && <p className="muted">読み込み中...</p>}
          {error && (
            <p className="muted" style={{ color: "#c43c47" }}>
              {error}
            </p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="muted">カートは空です。</p>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="panel">
              <table className="data-table cart-table">
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>単価</th>
                    <th>数量</th>
                    <th>小計</th>
                    <th>シェア</th>
                    <th>削除</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId}>
                      <td>
                        <div className="inline">
                          <div
                            style={{
                              position: "relative",
                              width: "64px",
                              height: "64px",
                              overflow: "hidden",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                              background: "#f4f7fb",
                            }}
                          >
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="64px"
                              />
                            ) : null}
                          </div>
                          <div className="stack">
                            <Link href={`/products/${item.slug}`}>
                              <span className="cart-item-name">
                                {item.name}
                              </span>
                              <span className="cart-item-reserve">
                                {"\u4e88\u7d04\u5546\u54c1"}
                              </span>
                            </Link>
                            {item.variantLabel && (
                              <span className="cart-item-variant">
                                {item.variantLabel}
                              </span>
                            )}
                            {item.category && (
                              <span className="muted small">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>
                        <div className="cart-qty">
                          <button
                            className="cart-qty__btn is-minus"
                            type="button"
                            disabled={
                              updatingId === (item.orderItemId || item.productId) ||
                              removingId === (item.orderItemId || item.productId) ||
                              (source === "external" && !item.orderItemId)
                            }
                            onClick={() =>
                              item.quantity <= 1
                                ? handleRemove(item.productId, item.orderItemId)
                                : handleChangeQuantity(
                                    item.productId,
                                    Number(item.quantity) - 1,
                                    item.orderItemId,
                                  )
                            }
                          >
                            -
                          </button>
                          <span className="cart-qty__input" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            className="cart-qty__btn"
                            type="button"
                            disabled={
                              updatingId === (item.orderItemId || item.productId) ||
                              removingId === (item.orderItemId || item.productId) ||
                              (source === "external" && !item.orderItemId)
                            }
                            onClick={() =>
                              handleChangeQuantity(
                                item.productId,
                                Number(item.quantity) + 1,
                                item.orderItemId,
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>{formatCurrency(item.price * item.quantity)}</td>
                      <td>
                        <button
                          className="cart-share-button"
                          type="button"
                          onClick={() => handleShareItem(item)}
                          aria-label={`シェア: ${item.name}`}
                        >
                          <img src="/images/share.svg" alt="" aria-hidden="true" />
                          シェア
                        </button>
                      </td>
                      <td>
                        <button
                          className="btn"
                          type="button"
                          disabled={
                            removingId === (item.orderItemId || item.productId) ||
                            (source === "external" && !item.orderItemId)
                          }
                          onClick={() =>
                            handleRemove(item.productId, item.orderItemId)
                          }
                        >
                          {removingId === item.productId ? "削除中..." : "削除"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(source === "external" || source === "guest") &&
                items.length > 1 && (
                <div className="cart-clear-row">
                  <button
                    className="cart-clear-button"
                    type="button"
                    onClick={handleClearCart}
                    disabled={clearing}
                  >
                    {clearing ? "カートを空にしています..." : "カートを空にする"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="checkout-sidebar">
          <div className="panel stack" style={{ gap: 12 }}>
            <h3>注文を確定する</h3>
            <div className="stack" style={{ gap: 6 }}>
              <div
                className="inline"
                style={{ justifyContent: "space-between" }}
              >
                <span>商品の小計</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <div
                className="inline"
                style={{ justifyContent: "space-between" }}
              >
                <span>配送料・手数料</span>
                <span>{formatCurrency(0)}</span>
              </div>
            </div>
            <div
              className="inline"
              style={{ justifyContent: "space-between", fontSize: 18 }}
            >
              <strong>ご請求額</strong>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <div
              className="inline"
              style={{ justifyContent: "space-between", fontSize: 14 }}
            >
              <span>付与予定REポイント</span>
              <strong>{rewardPoints}pt</strong>
            </div>
            <Link
              className="btn primary"
              href="/checkout"
              style={{ width: "100%" }}
            >
              注文手続きへ
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
