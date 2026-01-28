const faqs = [
  {
    q: "配送はどれくらいで届きますか？",
    a: "通常2〜4営業日で出荷します。出荷後は注文履歴のトラッキング番号で確認できます。",
  },
  {
    q: "支払い方法は何が使えますか？",
    a: "クレジットカード、口座振替に対応予定です。現在はカード決済を優先しています。",
  },
  {
    q: "返品・交換はできますか？",
    a: "未使用品に限り到着後7日以内で承ります。マイページの問い合わせからご連絡ください。",
  },
];

export default function FAQPage() {
  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">FAQ</span>
        <h1>よくある質問</h1>
        <p className="muted">よくあるお問い合わせをまとめました。</p>
      </div>
      <div className="list">
        {faqs.map((faq) => (
          <div key={faq.q} className="panel">
            <h3>{faq.q}</h3>
            <p className="muted" style={{ marginTop: "6px" }}>
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
