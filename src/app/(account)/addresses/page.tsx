import Link from "next/link";
import { addresses } from "@/lib/data";

export default function AddressesPage() {
  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Addresses</span>
        <h1>配送先管理</h1>
        <p className="muted">複数の配送先を保持し、出荷指示に使うベースデータをここで管理します。</p>
      </div>

      <div className="card-grid">
        {addresses.map((address) => (
          <div key={address.id} className="feature-card">
            <div className="panel-header">
              <h3>{address.label}</h3>
              <span className="tag">{address.id}</span>
            </div>
            <div className="stack">
              <strong>{address.recipient}</strong>
              <span className="muted">
                {address.line1}
                {address.line2 ? ` ${address.line2}` : ""}
              </span>
              <span className="muted">
                {address.city} {address.zip}
              </span>
              <span className="muted">TEL: {address.phone}</span>
            </div>
            <div className="btn-row" style={{ marginTop: "10px" }}>
              <Link href="/checkout" className="btn secondary">
                この住所で配送
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
