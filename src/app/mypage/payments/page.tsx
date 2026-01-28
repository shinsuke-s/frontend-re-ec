"use client";

import Link from "next/link";

type PaymentRecord = {
  id: number;
  nickname?: string | null;
  brand?: string | null;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
};

const dummyPayments: PaymentRecord[] = [
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

export default function PaymentsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Payments</span>
        <h1>支払い情報の管理</h1>
        <p className="muted">現在は固定のダミー情報を表示しています。</p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>登録済みの支払い方法</h2>
          <span className="tag">{dummyPayments.length} 件</span>
        </div>
        <div className="stack" style={{ gap: "12px" }}>
          {dummyPayments.map((pm) => (
            <div
              key={pm.id}
              className="card"
              style={{ padding: "12px", display: "flex", gap: "12px", alignItems: "flex-start" }}
            >
              <div className="stack" style={{ gap: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <strong>{pm.nickname || pm.brand || "カード"}</strong>
                  {pm.is_default ? (
                    <span
                      className="pill"
                      style={{
                        background: "#e8f8ef",
                        borderColor: "#c9eed8",
                        color: "#0c8c5d",
                      }}
                    >
                      デフォルト
                    </span>
                  ) : null}
                </div>
                <div className="muted">{pm.brand || "ブランド未設定"} •••• {pm.last4}</div>
                <div className="muted">
                  有効期限: {String(pm.exp_month).padStart(2, "0")}/{pm.exp_year}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "16px" }}>
        <Link className="btn secondary" href="/mypage">
          マイページに戻る
        </Link>
      </div>
    </div>
  );
}
