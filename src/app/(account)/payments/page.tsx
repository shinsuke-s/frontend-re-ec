import Link from "next/link";
import { paymentMethods } from "@/lib/data";

export default function PaymentsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Payments</span>
        <h1>決済情報管理</h1>
        <p className="muted">カードや口座の登録・更新のUIベース。実際の保存は後でセキュアなAPIに接続します。</p>
      </div>

      <div className="card-grid">
        {paymentMethods.map((method) => (
          <div key={method.id} className="feature-card">
            <div className="panel-header">
              <h3>
                {method.brand} {method.last4}
              </h3>
              {method.default && <span className="status-pill paid">デフォルト</span>}
            </div>
            <div className="stack">
              <span className="muted">名義: {method.holder}</span>
              {method.exp && <span className="muted">有効期限: {method.exp}</span>}
              <span className="tag">{method.type === "card" ? "カード" : "口座"}</span>
              {method.note && <span className="muted">{method.note}</span>}
            </div>
            <div className="btn-row" style={{ marginTop: "10px" }}>
              <Link href="/checkout" className="btn secondary">
                この支払い方法を使う
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
