import Link from "next/link";

type ThanksPageProps = {
  searchParams?: { order?: string };
};

export default function CheckoutThanksPage({ searchParams }: ThanksPageProps) {
  const orderNo = searchParams?.order || "EC-000000";

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Thank You</span>
        <h1>ご注文ありがとうございます。</h1>
        <p className="muted">
          ご注文内容は、注文履歴よりご確認ください。
        </p>
      </div>

      <div className="panel stack" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="muted">注文番号</span>
          <strong style={{ fontSize: 18 }}>{orderNo}</strong>
        </div>
        <div className="inline" style={{ gap: 12, flexWrap: "wrap" }}>
          <Link className="btn secondary" href="/mypage?tab=orders">
            注文履歴を見る
          </Link>
          <Link className="btn primary" href="/products">
            商品一覧へ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
