export default function PaymentPage() {
  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Payment</span>
        <h1>お支払い方法について</h1>
      </div>
      <div className="panel stack">
        <p className="muted">本ページはダミーの記載です。内容は後日差し替えてください。</p>
        <div className="stack">
          <div>クレジットカード: VISA / Master / JCB ほか</div>
          <div>コンビニ払い: ローソン / ファミマ / セブン ほか</div>
          <div>決済タイミング: 注文確定時</div>
          <div>領収書: 注文履歴よりダウンロード可能</div>
        </div>
      </div>
    </div>
  );
}
