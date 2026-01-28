"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type InvoiceItem = {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type AddressBlock = {
  name: string;
  postal_code: string;
  prefecture: string;
  city: string;
  town: string;
  street: string;
  building: string;
  room: string;
  phone: string;
  email: string;
};

type InvoiceData = {
  id: string;
  status: string;
  status_label: string;
  total: number;
  created_at: string;
  issued_at: string;
  due_at: string;
  shipping: AddressBlock;
  billing: AddressBlock;
  items: InvoiceItem[];
};

const fmtYen = (v: number) => `¥${Number(v || 0).toLocaleString("ja-JP")}`;
const formatJst = (value: string) =>
  new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

const addressLine = (addr: AddressBlock) =>
  [addr.prefecture, addr.city, addr.town, addr.street, addr.building, addr.room]
    .filter(Boolean)
    .join("");

export default function ReceiptPreviewPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ? String(params.id) : "";
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!orderId) {
        setError("注文IDが指定されていません。");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${orderId}/invoice?format=json`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message || "領収書の取得に失敗しました。");
        setInvoice(data.invoice);
      } catch (e: any) {
        setError(e.message || "読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  const handleDownload = async () => {
    if (!orderId) return;
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/invoice`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "PDFの生成に失敗しました。");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `order-${orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "PDFの生成に失敗しました。");
    } finally {
      setDownloading(false);
    }
  };

  const subtotal = useMemo(
    () => invoice?.items.reduce((sum, it) => sum + it.subtotal, 0) ?? 0,
    [invoice],
  );
  const tax = useMemo(() => Math.round(subtotal * 0.1), [subtotal]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  return (
    <div
      className="page"
      style={{
        fontFamily:
          "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif",
      }}
    >
      <div className="page-header">
        <span className="eyebrow">Receipt</span>
        <h1>領収書プレビュー</h1>
      </div>

      <div className="btn-row">
        <Link className="btn secondary" href="/mypage?tab=orders">
          注文履歴に戻る
        </Link>
        <button
          className="btn primary"
          onClick={handleDownload}
          disabled={downloading || !invoice}
        >
          {downloading ? "ダウンロード中..." : "PDFをダウンロード"}
        </button>
      </div>

      {loading && <div className="panel muted">読み込み中...</div>}
      {error && <div className="pill error">{error}</div>}

      {!loading && !error && invoice && (
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            background: "#fff",
            padding: 24,
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24 }}>領収書</h2>
            <img
              src="/favicon.png"
              alt="logo"
              style={{ width: 70, height: 70, objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              columnGap: 8,
              rowGap: 4,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <div>注文番号:</div>
            <div>{invoice.id}</div>
            <div>発行日:</div>
            <div>{formatJst(invoice.issued_at)}</div>
            <div>注文日:</div>
            <div>{formatJst(invoice.created_at)}</div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
              fontSize: 12,
              marginBottom: 28,
              lineHeight: 1.6,
            }}
          >
            <div style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>発行者</div>
              <div>PropTech Japan株式会社（PropTech Japan Co., Ltd.）</div>
              <div>〒106-0044</div>
              <div>東京都</div>
              <div>東京都港区</div>
              <div>東京都港区東麻布1丁目12</div>
              <div>東麻布ビル5 ACN6階</div>
              <div>Tel: 03-5704-9555</div>
            </div>
            <div style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>請求先</div>
              <div>{invoice.billing.name || "未登録"}</div>
              <div>〒{invoice.billing.postal_code || ""}</div>
              <div>{addressLine(invoice.billing) || "住所未登録"}</div>
              {invoice.billing.phone && <div>Tel: {invoice.billing.phone}</div>}
              {invoice.billing.email && (
                <div>Mail: {invoice.billing.email}</div>
              )}
            </div>
            <div style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>お届け先</div>
              <div>{invoice.shipping.name || "未登録"}</div>
              <div>〒{invoice.shipping.postal_code || ""}</div>
              <div>{addressLine(invoice.shipping) || "住所未登録"}</div>
              {invoice.shipping.phone && (
                <div>Tel: {invoice.shipping.phone}</div>
              )}
              {invoice.shipping.email && (
                <div>Mail: {invoice.shipping.email}</div>
              )}
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              marginBottom: 12,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: "52%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  商品
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  数量
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  単価
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  金額
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={`${item.name}-${idx}`}>
                  <td
                    style={{
                      padding: "10px 4px",
                      verticalAlign: "top",
                      borderBottom: "1px solid var(--border)",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.name}
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "10px 4px",
                      borderBottom: "1px solid var(--border)",
                      verticalAlign: "top",
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "10px 4px",
                      borderBottom: "1px solid var(--border)",
                      verticalAlign: "top",
                    }}
                  >
                    {fmtYen(item.price)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "10px 4px",
                      borderBottom: "1px solid var(--border)",
                      verticalAlign: "top",
                    }}
                  >
                    {fmtYen(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              maxWidth: 260,
              marginLeft: "auto",
              rowGap: 6,
              fontSize: 12,
            }}
          >
            <div>小計:</div>
            <div style={{ textAlign: "right" }}>{fmtYen(subtotal)}</div>
            <div>消費税(10%):</div>
            <div style={{ textAlign: "right" }}>{fmtYen(tax)}</div>
            <div style={{ fontWeight: 700 }}>合計:</div>
            <div style={{ textAlign: "right", fontWeight: 700 }}>
              {fmtYen(total)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
