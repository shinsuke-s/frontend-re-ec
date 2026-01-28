"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/data";

type Account = { name?: string; email?: string; login_id?: string } | null;
type Address = {
  id: string;
  first_name?: string;
  last_name?: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  town?: string;
  street?: string;
  building?: string;
  room?: string;
  phone?: string;
  email?: string;
  is_default?: boolean;
  type?: string;
};
type Payment = {
  id: number;
  nickname?: string;
  brand?: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default?: boolean;
};
type OrderItem = {
  orderItemId?: string;
  productId?: string;
  name?: string;
  variantLabel?: string;
  price?: number;
  quantity?: number;
  image?: string;
};

type Order = {
  id: string;
  status: string;
  statusLabel?: string;
  total: number;
  points?: number;
  created_at: string;
  items?: OrderItem[];
  payment?: {
    method?: string;
    last5?: string;
  };
  shipping?: {
    name?: string;
    name_kana?: string;
    postal_code?: string;
    prefecture?: string;
    city?: string;
    town?: string;
    street?: string;
    building?: string;
    room?: string;
    phone?: string;
    email?: string;
  };
  billing?: {
    name?: string;
    name_kana?: string;
    postal_code?: string;
    prefecture?: string;
    city?: string;
    town?: string;
    street?: string;
    building?: string;
    room?: string;
    phone?: string;
    email?: string;
  };
  trackingNumber?: string;
};

type Tab = "account" | "addresses" | "billing" | "payments" | "orders";

const tabLabels: Record<Tab, string> = {
  account: "アカウント",
  addresses: "配送先管理",
  billing: "請求先管理",
  payments: "支払い情報管理",
  orders: "注文履歴",
};

const dummyPayments: Payment[] = [
  {
    id: 1,
    nickname: "メインカード",
    brand: "VISA",
    last4: "9017",
    exp_month: 12,
    exp_year: 2028,
    is_default: true,
  },
];

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

export default function MyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [tabInitialized, setTabInitialized] = useState(false);
  const [account, setAccount] = useState<Account>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [billingAddresses, setBillingAddresses] = useState<Address[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingDefaultAddr, setUpdatingDefaultAddr] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [accRes, addrRes, billRes, ordRes] = await Promise.all([
          fetch("/api/account", { cache: "no-store" }),
          fetch("/api/addresses", { cache: "no-store" }),
          fetch("/api/addresses?type=bill", { cache: "no-store" }),
          fetch("/api/orders", { cache: "no-store" }),
        ]);

        if ([accRes, addrRes, billRes, ordRes].some((r) => r.status === 401)) {
          setError("マイページにはログインが必要です");
          return;
        }

        const accData = await safeJson(accRes);
        const addrData = await safeJson(addrRes);
        const billData = await safeJson(billRes);
        const ordData = await safeJson(ordRes);

        const errMessages: string[] = [];
        if (!accRes.ok) errMessages.push(accData?.message || "アカウント情報の取得に失敗しました");
        if (!addrRes.ok) errMessages.push(addrData?.message || "配送先の取得に失敗しました");
        if (!billRes.ok) errMessages.push(billData?.message || "請求先の取得に失敗しました");
        if (!ordRes.ok) errMessages.push(ordData?.message || "注文履歴の取得に失敗しました");
        if (errMessages.length) setError(errMessages.join(" / "));

        if (accRes.ok) setAccount(accData.account || null);
        if (addrRes.ok) setAddresses(addrData.items || addrData.addresses || []);
        if (billRes.ok) setBillingAddresses(billData.items || billData.addresses || []);
        setPayments(dummyPayments);
        if (ordRes.ok) setOrders(ordData.items || []);
      } catch (e: any) {
        setError(e.message || "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (tabInitialized) return;
    const tab = searchParams.get("tab");
    if (
      tab &&
      (["account", "addresses", "billing", "payments", "orders"] as Tab[]).includes(
        tab as Tab
      )
    ) {
      setActiveTab(tab as Tab);
    }
    setTabInitialized(true);
  }, [searchParams, tabInitialized]);

  const sortedAddresses = useMemo(
    () => [...addresses].sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default))),
    [addresses]
  );
  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [orders]
  );

  const handleLogout = async () => {
    if (!confirm("本当にログアウトしますか？")) return;
    setLoggingOut(true);
    setError(null);
    try {
      await fetch("/api/logout", { method: "POST" });
      setAccount(null);
      router.push("/");
    } catch (e: any) {
      setError(e.message || "ログアウトに失敗しました");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Account</span>
        <h1>マイページ</h1>
        <p className="muted">アカウント・配送先・支払い情報・注文履歴をまとめて確認できます。</p>
      </div>

      {error && <div className="pill error">{error}</div>}

      <div className="mypage-layout">
        <aside className="sidebar">
          {(["account", "addresses", "billing", "payments", "orders"] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`sidebar-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
            </button>
          ))}
          <button
            className="sidebar-tab sidebar-logout"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </aside>

        <div className="content-stack">
          {loading && <div className="panel muted">読み込み中...</div>}

          {!loading && activeTab === "account" && (
            <div className="panel">
              <div className="panel-header">
                <h2>アカウント情報（閲覧のみ）</h2>
              </div>
              <div className="stack">
                <div className="muted">ユーザー名</div>
                <div className="pill">{account?.name || "未設定"}</div>
                <div className="muted">メールアドレス</div>
                <div className="pill">{account?.email || "未設定"}</div>
                <div className="muted">ログインID</div>
                <div className="pill">{account?.login_id || "未設定"}</div>
                <div className="muted">REポイント</div>
                <div className="pill">1300</div>
              </div>
            </div>
          )}

          {!loading && activeTab === "addresses" && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>登録済みの配送先</h2>
                  <p className="panel-subtitle">デフォルト配送先をラジオボタンで切り替えできます。</p>
                </div>
                <Link className="btn secondary" href="/mypage/addresses">
                  配送先を編集
                </Link>
              </div>

              {sortedAddresses.length === 0 ? (
                <div className="muted">
                  配送先が登録されていません。<Link href="/mypage/addresses">配送先を追加</Link>
                </div>
              ) : (
                <div className="stack" style={{ gap: 12 }}>
                  {sortedAddresses.map((addr) => (
                    <label key={addr.id} className="card address-card">
                      <input
                        type="radio"
                        name="defaultAddress"
                        checked={Boolean(addr.is_default)}
                        onChange={async () => {
                          if (addr.is_default) return;
                          setUpdatingDefaultAddr(addr.id);
                          setError(null);
                          try {
                            const res = await fetch("/api/addresses", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: addr.id, is_default: true }),
                            });
                            const data = await safeJson(res);
                            if (!res.ok) throw new Error(data?.message || "更新に失敗しました");
                            setAddresses(data.items || data.addresses || []);
                          } catch (e: any) {
                            setError(e.message || "更新に失敗しました");
                          } finally {
                            setUpdatingDefaultAddr(null);
                          }
                        }}
                        disabled={updatingDefaultAddr === addr.id}
                      />
                      <div className="stack" style={{ gap: 4 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <strong>{(addr.last_name || "") + (addr.first_name || "") || "名前未設定"}</strong>
                          {addr.is_default ? <span className="pill status-pill">デフォルト</span> : null}
                        </div>
                        <div className="muted">〒{addr.postal_code || "未設定"}</div>
                        <div>
                          {[addr.prefecture, addr.city, addr.town, addr.street, addr.building, addr.room].filter(Boolean).join("") || "住所未設定"}
                        </div>
                        {(addr.phone || addr.email) && (
                          <div className="muted">
                            {addr.phone && <>電話: {addr.phone} </>}
                            {addr.email && <>メール: {addr.email}</>}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === "billing" && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>登録済みの請求先</h2>
                  <p className="panel-subtitle">請求先住所を確認・追加できます。</p>
                </div>
                <Link className="btn secondary" href="/mypage/addresses">
                  請求先を編集
                </Link>
              </div>

              {billingAddresses.length === 0 ? (
                <div className="muted">
                  請求先が登録されていません。<Link href="/mypage/addresses">請求先を追加</Link>
                </div>
              ) : (
                <div className="stack" style={{ gap: 12 }}>
                  {billingAddresses.map((addr) => (
                    <div key={addr.id} className="card address-card">
                      <div className="stack" style={{ gap: 4 }}>
                        <strong>{(addr.last_name || "") + (addr.first_name || "") || "名前未設定"}</strong>
                        <div className="muted">〒{addr.postal_code || "未設定"}</div>
                        <div>
                          {[addr.prefecture, addr.city, addr.town, addr.street, addr.building, addr.room]
                            .filter(Boolean)
                            .join("") || "住所未設定"}
                        </div>
                        {(addr.phone || addr.email) && (
                          <div className="muted">
                            {addr.phone && <>TEL: {addr.phone} </>}
                            {addr.email && <>Mail: {addr.email}</>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === "payments" && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>支払い情報</h2>
                  <p className="panel-subtitle">登録済みのカード情報を確認できます。</p>
                </div>
                <Link className="btn secondary" href="/mypage/payments">
                  支払い情報を編集
                </Link>
              </div>

              {payments.length === 0 ? (
                <div className="muted">
                  支払い情報が登録されていません。<Link href="/mypage/payments">追加する</Link>
                </div>
              ) : (
                <div className="stack" style={{ gap: 10 }}>
                  {[...payments].sort((a, b) => Number(b.is_default) - Number(a.is_default)).map((pay) => (
                    <div key={pay.id} className="card payment-card">
                      <div className="inline" style={{ justifyContent: "space-between", width: "100%" }}>
                        <div className="stack" style={{ gap: 4 }}>
                          <strong>{pay.nickname || pay.brand || "カード"}</strong>
                          <span className="muted">
                            {pay.brand || "ブランド未設定"} / **** **** **** {pay.last4} / {pay.exp_month}/{pay.exp_year}
                          </span>
                        </div>
                        {pay.is_default && <span className="pill status-pill">デフォルト</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === "orders" && (
            <div className="panel">
              <div className="panel-header">
                <h2>注文履歴</h2>
              </div>
              {sortedOrders.length === 0 ? (
                <div className="muted">注文履歴がありません。</div>
              ) : (
                <div className="list">
                  {sortedOrders.map((order) => (
                    <div key={order.id} className="panel" style={{ padding: 14 }}>
                      <div className="panel-header">
                        <div className="stack">
                          <strong>注文番号: {order.id}</strong>
                          <span className="muted">
                            注文日時:{" "}
                            {new Date(order.created_at).toLocaleString("ja-JP", {
                              timeZone: "Asia/Tokyo",
                            })}
                          </span>
                        </div>
                        <div className="inline" style={{ gap: 8, alignItems: "center" }}>
                          <span className="tag">
                            {order.statusLabel || order.status || "未決済"}
                          </span>
                          <span className="price">{formatCurrency(order.total)}</span>
                          <Link className="btn tertiary" href={`/orders/${order.id}/invoice`}>
                            領収書
                          </Link>
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="stack" style={{ gap: 10 }}>
                          {order.items.map((item) => (
                            <div
                              key={item.orderItemId || item.productId}
                              className="inline"
                              style={{ gap: 12, alignItems: "center" }}
                            >
                              <div
                                style={{
                                  position: "relative",
                                  width: 64,
                                  height: 64,
                                  borderRadius: 8,
                                  overflow: "hidden",
                                  border: "1px solid var(--border)",
                                  background: "#f4f7fb",
                                }}
                              >
                                {item.image ? (
                                  <Image
                                    src={item.image}
                                    alt={item.name || ""}
                                    fill
                                    sizes="64px"
                                  />
                                ) : null}
                              </div>
                              <div className="stack">
                                <Link href={`/products/${item.productId}`}>
                                  <strong>{item.name || "-"}</strong>
                                </Link>
                                {item.variantLabel && (
                                  <span className="muted" style={{ fontSize: 12 }}>
                                    {item.variantLabel}
                                  </span>
                                )}
                                <div className="muted" style={{ fontSize: 12 }}>
                                  {formatCurrency(Number(item.price || 0))} / 数量: {item.quantity || 0}
                                </div>
                              </div>
                              <div style={{ marginLeft: "auto" }}>
                                {formatCurrency(
                                  Number(item.price || 0) * Number(item.quantity || 0)
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="panel" style={{ marginTop: 12, padding: 12 }}>
                        <div className="stack" style={{ gap: 6 }}>
                          <div className="inline" style={{ justifyContent: "space-between" }}>
                            <span>注文金額</span>
                            <strong>{formatCurrency(order.total)}</strong>
                          </div>
                          <div className="inline" style={{ justifyContent: "space-between" }}>
                            <span>送料</span>
                            <span>{formatCurrency(0)}</span>
                          </div>
                          {typeof order.points === "number" && (
                            <div className="inline" style={{ justifyContent: "space-between" }}>
                              <span>付与予定REポイント</span>
                              <strong>{order.points}pt</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid" style={{ gap: 12, marginTop: 12 }}>
                        {order.shipping && (
                          <div className="panel" style={{ padding: 12 }}>
                            <h3 style={{ margin: 0, fontSize: 14, marginBottom: 6 }}>
                              お届け先情報
                            </h3>
                            <div className="stack" style={{ gap: 4 }}>
                              <div>
                                <strong>{order.shipping.name || "未設定"}</strong>
                                {order.shipping.name_kana && (
                                  <span className="muted" style={{ marginLeft: 8 }}>
                                    {order.shipping.name_kana}
                                  </span>
                                )}
                              </div>
                              <div className="muted">〒{order.shipping.postal_code || "未設定"}</div>
                              <div>
                                {[order.shipping.prefecture, order.shipping.city, order.shipping.town, order.shipping.street, order.shipping.building, order.shipping.room]
                                  .filter(Boolean)
                                  .join("") || "住所未設定"}
                              </div>
                              {(order.shipping.phone || order.shipping.email) && (
                                <div className="muted">
                                  {order.shipping.phone && <>TEL: {order.shipping.phone} </>}
                                  {order.shipping.email && <>Mail: {order.shipping.email}</>}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {order.billing && (
                          <div className="panel" style={{ padding: 12 }}>
                            <h3 style={{ margin: 0, fontSize: 14, marginBottom: 6 }}>
                              請求先情報
                            </h3>
                            <div className="stack" style={{ gap: 4 }}>
                              <div>
                                <strong>{order.billing.name || "未設定"}</strong>
                                {order.billing.name_kana && (
                                  <span className="muted" style={{ marginLeft: 8 }}>
                                    {order.billing.name_kana}
                                  </span>
                                )}
                              </div>
                              <div className="muted">〒{order.billing.postal_code || "未設定"}</div>
                              <div>
                                {[order.billing.prefecture, order.billing.city, order.billing.town, order.billing.street, order.billing.building, order.billing.room]
                                  .filter(Boolean)
                                  .join("") || "住所未設定"}
                              </div>
                              {(order.billing.phone || order.billing.email) && (
                                <div className="muted">
                                  {order.billing.phone && <>TEL: {order.billing.phone} </>}
                                  {order.billing.email && <>Mail: {order.billing.email}</>}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="panel" style={{ marginTop: 12, padding: 12 }}>
                        <div className="stack" style={{ gap: 6 }}>
                          <div className="inline" style={{ justifyContent: "space-between" }}>
                            <span>お支払い方法</span>
                            <span>
                              {order.payment?.method || "クレジットカード"}
                              {order.payment?.last5
                                ? ` (${order.payment.last5})`
                                : ""}
                            </span>
                          </div>
                          {order.trackingNumber && (
                            <div className="inline" style={{ justifyContent: "space-between" }}>
                              <span>追跡番号</span>
                              <strong>{order.trackingNumber}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
