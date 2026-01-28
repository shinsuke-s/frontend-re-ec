"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "登録に失敗しました");
      }
      localStorage.setItem("userName", email);
      setMessage("登録しました。マイページへ移動します。");
      setTimeout(() => {
        router.push("/mypage");
      }, 800);
    } catch (e: any) {
      setError(e.message || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const disabled = !email || !password || loading;

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Sign up</span>
        <h1>新規登録</h1>
        <p className="muted">メールアドレスとパスワードを設定してください。</p>
      </div>
      <div className="panel" style={{ maxWidth: "520px" }}>
        <div className="stack">
          <label className="stack">
            <span className="muted">メールアドレス</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@example.com" />
          </label>
          <label className="stack">
            <span className="muted">パスワード</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
          </label>
          {error && <div className="pill" style={{ color: "#c43c47", borderColor: "#f6c5cb", background: "#fff0f2" }}>{error}</div>}
          {message && <div className="pill" style={{ color: "#0c8c5d", borderColor: "#c9eed8", background: "#e8f8ef" }}>{message}</div>}
          <div className="btn-row">
            <button className="btn primary" type="button" onClick={handleSubmit} disabled={disabled}>
              {loading ? "登録中..." : "登録する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
