export default function ShippingPage() {
  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Shipping</span>
        <h1>送料・配送料について</h1>
      </div>
      <div className="panel stack">
        <p className="muted">本ページはダミーの記載です。内容は後日差し替えてください。</p>
        <div className="stack">
          <div>全国一律: ¥0（キャンペーン中）</div>
          <div>通常配送: 2〜5営業日</div>
          <div>予約商品: 商品ページの発送時期に準拠</div>
          <div>配送会社: ヤマト運輸 / 佐川急便 ほか</div>
        </div>
      </div>
    </div>
  );
}
