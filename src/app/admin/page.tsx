import Link from "next/link";
import { calculateOrderTotal, cart, formatCurrency, orders, products } from "@/lib/data";

export default function AdminPage() {
  const openOrders = orders.filter((order) => order.status === "processing" || order.status === "shipped" || order.status === "paid");
  const revenue = orders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);

  const quickLinks = [
    { title: "商品一覧", href: "/products", note: "商品登録・在庫管理の起点" },
  { title: "注文一覧", href: "/mypage?tab=orders", note: "配送状況と決済ステータスを確認" },
    { title: "配送先管理", href: "/addresses", note: "顧客の配送先データを管理" },
    { title: "決済情報管理", href: "/payments", note: "カード/口座のメンテナンス" },
    { title: "カート / 決済", href: "/checkout", note: "決済動線の確認" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Admin</span>
        <h1>管理ダッシュボード</h1>
        <p className="muted">商品・注文・決済のスタート地点。API層を追加してもルート構成はそのまま活用できます。</p>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-value">{products.length}</div>
          <div className="stat-label">商品</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{openOrders.length}</div>
          <div className="stat-label">未完了の注文</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{cart.length}</div>
          <div className="stat-label">カート中のSKU</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(revenue)}</div>
          <div className="stat-label">売上 (サンプル)</div>
        </div>
      </div>

      <div className="card-grid">
        {quickLinks.map((link) => (
          <div key={link.href} className="feature-card">
            <div className="panel-header">
              <h3>{link.title}</h3>
              <span className="tag">/admin</span>
            </div>
            <p className="muted">{link.note}</p>
            <div className="btn-row" style={{ marginTop: "10px" }}>
              <Link className="btn secondary" href={link.href}>
                開く
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
