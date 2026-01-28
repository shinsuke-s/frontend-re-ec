import Link from "next/link";

const footerLinks = [
  { label: "特定商取引法に基づく表記", href: "/law" },
  { label: "送料・配送料について", href: "/shipping" },
  { label: "お支払い方法について", href: "/payment" },
  { label: "よくある質問", href: "/faq" },
  { label: "お問い合わせ", href: "/contact" },
  { label: "プライバシーポリシー", href: "/privacy" },
  { label: "運営会社", href: "/company" },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-heading">
          <span className="footer-title">REショッピング</span>
        </div>
        <div className="footer-links">
          {footerLinks.map((item) => (
            <Link key={item.label} className="footer-link" href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="footer-copy">©proptech japan 2026</div>
      </div>
    </footer>
  );
}
