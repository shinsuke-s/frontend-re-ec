"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
const headerMenu = [
  { href: "/mypage", label: "マイページ", requiresLogin: true },
  { href: "/mypage?tab=orders", label: "注文履歴", requiresLogin: true },
  { href: "/cart", label: "カート" },
  { href: "/faq", label: "よくある質問" },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupMode, setSignupMode] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const loadSession = async () => {
    try {
      const res = await fetch("/api/session", { cache: "no-store" });
      const data = await res.json();
      if (data?.status === "ok" && data.user?.name) {
        setUserName(data.user.name as string);
      } else {
        setUserName(null);
      }
    } catch (e) {
      setUserName(null);
    }
  };

  useEffect(() => {
    loadSession();
  }, [pathname]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const refresh = async () => {
      try {
        await fetch("/api/auth/refresh", { method: "POST", cache: "no-store" });
      } catch {
        // ignore refresh errors; user can re-login if needed
      }
    };

    refresh();
    timer = setInterval(refresh, 10 * 60 * 1000);

    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (!document.hidden) refresh();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const handleMyPageClick = () => {
    if (!userName) {
      setShowModal(true);
      setSignupMode(false);
      return;
    }
    router.push("/mypage");
  };

  const handleMenuClick = (href: string, requiresLogin?: boolean) => {
    if (requiresLogin && !userName) {
      setShowModal(true);
      setSignupMode(false);
      return;
    }
    router.push(href);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "ログインに失敗しました");
      setUserName(data.user?.name || loginId);
      setShowModal(false);
      setSignupMode(false);
      setPassword("");
      setLoginId("");
    } catch (err: any) {
      setError(err.message || "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) return;
    setSignupLoading(true);
    setSignupError(null);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupEmail, password: signupPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "登録に失敗しました");
      setUserName(data.user?.name || signupEmail);
      setShowModal(false);
      setSignupMode(false);
      setSignupEmail("");
      setSignupPassword("");
    } catch (err: any) {
      setSignupError(err.message || "登録に失敗しました");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <Link href="/">REショッピング</Link>
          </div>
          <form className="search-bar" action="/products" method="get">
            <input
              type="search"
              name="q"
              placeholder="商品を検索"
              defaultValue={pathname === "/products" ? "" : undefined}
            />
            <button type="submit">検索</button>
          </form>
          <nav className="header-menu">
            {headerMenu.map((item) => (
              <button
                key={item.href}
                className="menu-link"
                type="button"
                onClick={() => handleMenuClick(item.href, item.requiresLogin)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <nav className="primary-nav icon-nav">
            <Link className="icon-button" href="/cart">
              <span className="icon-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <path
                    d="M4 6h2l2.2 9.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L21 8H7.3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="10" cy="19" r="1.6" />
                  <circle cx="17" cy="19" r="1.6" />
                </svg>
              </span>
            </Link>
            <button
              className="icon-button"
              type="button"
              onClick={handleMyPageClick}
            >
              <span className="icon-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M4.5 19.5c1.9-3.6 5-5.4 7.5-5.4s5.6 1.8 7.5 5.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
          </nav>
        </div>
      </header>

      {showModal && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowModal(false);
            setSignupMode(false);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{signupMode ? "新規登録" : "ログイン"}</h3>
            {signupMode ? (
              <form className="stack" onSubmit={handleSignup}>
                <label className="stack">
                  <span className="muted">メールアドレス</span>
                  <input
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="example@example.com"
                  />
                </label>
                <label className="stack">
                  <span className="muted">パスワード</span>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="********"
                  />
                </label>
                {signupError && (
                  <div
                    className="pill"
                    style={{
                      color: "#c43c47",
                      borderColor: "#f6c5cb",
                      background: "#fff0f2",
                    }}
                  >
                    {signupError}
                  </div>
                )}
                <div className="btn-row">
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={!signupEmail || !signupPassword || signupLoading}
                  >
                    {signupLoading ? "登録中..." : "登録する"}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setSignupMode(false)}
                  >
                    ログインはこちら
                  </button>
                </div>
              </form>
            ) : (
              <form className="stack" onSubmit={handleSubmit}>
                <label className="stack">
                  <span className="muted">メールアドレス</span>
                  <input
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="example@example.com"
                  />
                </label>
                <label className="stack">
                  <span className="muted">パスワード</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                  />
                </label>
                {error && (
                  <div
                    className="pill"
                    style={{
                      color: "#c43c47",
                      borderColor: "#f6c5cb",
                      background: "#fff0f2",
                    }}
                  >
                    {error}
                  </div>
                )}
                <div className="btn-row">
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={!loginId || !password || loading}
                  >
                    {loading ? "認証中..." : "ログイン"}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setSignupMode(true)}
                  >
                    新規登録
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
