"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export type AddressForm = {
  id?: string;
  first_name: string;
  last_name: string;
  first_name_kana: string;
  last_name_kana: string;
  gender?: string;
  date_of_birth?: string;
  postal_code: string;
  prefecture: string;
  city: string;
  town: string;
  street: string;
  building?: string;
  room?: string;
  phone?: string;
  email?: string;
  is_default?: boolean;
  billing_same?: boolean;
};

type AddressRecord = AddressForm & { id: string; is_default: boolean };

type ResponsePayload = {
  status: string;
  items?: AddressRecord[];
  message?: string;
  id?: string;
};

type ZipResponse = {
  status: string;
  prefecture?: string;
  city?: string;
  town?: string;
  message?: string;
};

const emptyForm: AddressForm = {
  first_name: "",
  last_name: "",
  first_name_kana: "",
  last_name_kana: "",
  gender: "MALE",
  date_of_birth: "",
  postal_code: "",
  prefecture: "",
  city: "",
  town: "",
  street: "",
  building: "",
  room: "",
  phone: "",
  email: "",
  is_default: false,
};

const parseDateParts = (value?: string) => {
  const base = value ? String(value).slice(0, 10) : "";
  const match = base.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return {
    year: match ? match[1] : "",
    month: match ? match[2] : "",
    day: match ? match[3] : "",
  };
};

const buildDate = (parts: { year: string; month: string; day: string }) => {
  if (!parts.year || !parts.month || !parts.day) return "";
  const mm = parts.month.padStart(2, "0");
  const dd = parts.day.padStart(2, "0");
  return `${parts.year}-${mm}-${dd}`;
};

const monthOptions = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
const dayOptions = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);

export default function AddressesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AddressRecord[]>([]);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [dob, setDob] = useState(() => parseDateParts(emptyForm.date_of_birth));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);
  const dobYears = useMemo(() => {
    const current = new Date().getFullYear();
    const years: string[] = [];
    for (let year = current; year >= 1900; year -= 1) {
      years.push(String(year));
    }
    return years;
  }, []);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/addresses", { cache: "no-store" });
      const data: ResponsePayload = await res.json();
      if (res.status === 401) {
        setError("ログインが必要です");
        return;
      }
      if (!res.ok) {
        setError(data.message || "取得に失敗しました");
        return;
      }
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message || "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    const isValid =
      form.last_name &&
      form.first_name &&
      form.last_name_kana &&
      form.first_name_kana &&
      form.gender &&
      form.date_of_birth &&
      form.postal_code &&
      form.prefecture &&
      form.city &&
      form.town &&
      form.street &&
      form.phone &&
      form.email;
    if (!isValid) {
      setError("必須項目を入力してください");
      return;
    }
    try {
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch("/api/addresses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: ResponsePayload = await res.json();
      if (!res.ok) throw new Error(data?.message || "保存に失敗しました");
      setMessage("保存しました");
      setForm(emptyForm);
      setDob(parseDateParts(emptyForm.date_of_birth));
      setItems(data.items || items);
    } catch (e: any) {
      setError(e.message || "保存に失敗しました");
    }
  };

  const handleEdit = (addr: AddressRecord) => {
    setForm({ ...addr });
    setDob(parseDateParts(addr.date_of_birth));
    setMessage(null);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    try {
      const res = await fetch("/api/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data: ResponsePayload = await res.json();
      if (!res.ok) throw new Error(data?.message || "削除に失敗しました");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message || "削除に失敗しました");
    }
  };

  const updateForm = (patch: Partial<AddressForm>) => {
    setForm({ ...form, ...patch });
  };

  const updateDob = (patch: Partial<typeof dob>) => {
    setDob((prev) => {
      const next = { ...prev, ...patch };
      setForm((prevForm) => ({
        ...prevForm,
        date_of_birth: buildDate(next),
      }));
      return next;
    });
  };

  const handleLookupZip = async () => {
    const zip = (form.postal_code || "").replace(/\D/g, "");
    if (zip.length !== 7) {
      setError("郵便番号はハイフンなし7桁で入力してください");
      return;
    }
    setError(null);
    setZipLoading(true);
    try {
      const res = await fetch(`/api/postcode?zip=${zip}`, { cache: "no-store" });
      const data: ZipResponse = await res.json();
      if (!res.ok) throw new Error(data?.message || "住所検索に失敗しました");
      updateForm({ prefecture: data.prefecture || form.prefecture, city: data.city || form.city, town: data.town || form.town });
      setMessage("郵便番号から住所を反映しました");
    } catch (e: any) {
      setError(e.message || "住所検索に失敗しました");
    } finally {
      setZipLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Addresses</span>
        <h1>配送先管理</h1>
        <p className="muted">複数の配送先と請求先情報を保存し、注文時に選択できます。</p>
      </div>

      {error && <div className="pill" style={{ color: "#c43c47", borderColor: "#f6c5cb", background: "#fff0f2" }}>{error}</div>}
      {message && <div className="pill" style={{ color: "#0c8c5d", borderColor: "#c9eed8", background: "#e8f8ef" }}>{message}</div>}

      <div className="panel">
        <div className="panel-header">
          <h2>{isEditing ? "配送先を更新" : "配送先を追加"}</h2>
        </div>
        <div className="stack billing-section" style={{ gap: 10 }}>
          <div className="billing-grid" style={{ alignItems: "start" }}>
            <div className="stack">
              <label className="stack">
                <span className="muted">
                  姓<span className="required">*</span>
                </span>
                <input value={form.last_name} onChange={(e) => updateForm({ last_name: e.target.value })} />
              </label>
              <label className="stack">
                <span className="muted">
                  名<span className="required">*</span>
                </span>
                <input value={form.first_name} onChange={(e) => updateForm({ first_name: e.target.value })} />
              </label>
              <label className="stack">
                <span className="muted">
                  セイ<span className="required">*</span>
                </span>
                <input value={form.last_name_kana} onChange={(e) => updateForm({ last_name_kana: e.target.value })} />
              </label>
              <label className="stack">
                <span className="muted">
                  メイ<span className="required">*</span>
                </span>
                <input value={form.first_name_kana} onChange={(e) => updateForm({ first_name_kana: e.target.value })} />
              </label>
              <label className="stack">
                <span className="muted">
                  性別<span className="required">*</span>
                </span>
                <select value={form.gender} onChange={(e) => updateForm({ gender: e.target.value })}>
                  <option value="MALE">男性</option>
                  <option value="FEMALE">女性</option>
                </select>
              </label>
              <label className="stack">
                <span className="muted">
                  生年月日<span className="required">*</span>
                </span>
                <div className="dob-inputs">
                  <select
                    value={dob.year}
                    onChange={(e) => updateDob({ year: e.target.value })}
                    aria-label="生年月日（年）"
                  >
                    <option value="">----</option>
                    {dobYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <span className="muted">年</span>
                  <select
                    value={dob.month}
                    onChange={(e) => updateDob({ month: e.target.value })}
                    aria-label="生年月日（月）"
                  >
                    <option value="">--</option>
                    {monthOptions.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <span className="muted">月</span>
                  <select
                    value={dob.day}
                    onChange={(e) => updateDob({ day: e.target.value })}
                    aria-label="生年月日（日）"
                  >
                    <option value="">--</option>
                    {dayOptions.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <span className="muted">日</span>
                </div>
              </label>
              <label className="stack">
                <span className="muted">
                  電話番号<span className="required">*</span>
                </span>
                <input value={form.phone} onChange={(e) => updateForm({ phone: e.target.value })} />
              </label>
            </div>

            <div className="stack">
              <label className="stack">
                <span className="muted">
                  郵便番号（7桁・ハイフンなし）<span className="required">*</span>
                </span>
                <div className="inline billing-zip-row" style={{ gap: "8px" }}>
                  <input value={form.postal_code} onChange={(e) => updateForm({ postal_code: e.target.value })} placeholder="1600022" />
                  <button className="btn secondary" type="button" onClick={handleLookupZip} disabled={zipLoading}>
                    {zipLoading ? "検索中..." : "住所検索"}
                  </button>
                </div>
              </label>
              <label className="stack">
                <span className="muted">
                  都道府県<span className="required">*</span>
                </span>
                <input value={form.prefecture} onChange={(e) => updateForm({ prefecture: e.target.value })} />
              </label>
              <label className="stack">
                <span className="muted">
                  市区町村<span className="required">*</span>
                </span>
                <input value={form.city} onChange={(e) => updateForm({ city: e.target.value })} />
              </label>
              <label className="stack">
                <span className="muted">
                  町名<span className="required">*</span>
                </span>
                <input value={form.town} onChange={(e) => updateForm({ town: e.target.value })} />
              </label>
              <label className="stack">
                <span className="muted">
                  番地<span className="required">*</span>
                </span>
                <input value={form.street} onChange={(e) => updateForm({ street: e.target.value })} />
              </label>
              <label className="stack">
                <span className="muted">ビル・マンション名</span>
                <input value={form.building} onChange={(e) => updateForm({ building: e.target.value })} />
              </label>
              <label className="stack">
                <span className="muted">部屋番号</span>
                <input value={form.room} onChange={(e) => updateForm({ room: e.target.value })} />
              </label>
            </div>
          </div>
          <label className="stack billing-email">
            <span className="muted">
              メールアドレス<span className="required">*</span>
            </span>
            <input value={form.email} onChange={(e) => updateForm({ email: e.target.value })} />
          </label>
        </div>
        <div className="btn-row" style={{ marginTop: "12px" }}>
          <button className="btn primary" type="button" onClick={handleSave}>
            {isEditing ? "更新" : "追加"}
          </button>
          {isEditing && (
            <button className="btn secondary" type="button" onClick={() => setForm(emptyForm)}>
              キャンセル
            </button>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>登録済み配送先</h2>
          <span className="tag">{items.length} 件</span>
        </div>
        <div className="list">
          {items.map((addr) => (
            <div key={addr.id} className="feature-card">
              <div className="panel-header">
                <div className="stack">
                  <div className="inline" style={{ gap: "8px" }}>
                    <strong>
                      {addr.last_name} {addr.first_name}
                    </strong>
                    {addr.is_default && <span className="status-pill paid">デフォルト</span>}
                  </div>
                  <span className="muted">
                    {addr.postal_code} / {addr.prefecture} {addr.city} {addr.town} {addr.street} {addr.building || ""} {addr.room || ""}
                  </span>
                  <span className="muted">TEL: {addr.phone || "-"}</span>
                  <span className="muted">Mail: {addr.email || "-"}</span>
                </div>
                <div className="btn-row">
                  <button className="btn secondary" type="button" onClick={() => handleEdit(addr)}>
                    編集
                  </button>
                  <button className="btn" type="button" onClick={() => handleDelete(addr.id)}>
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="muted">配送先が登録されていません。</p>}
        </div>
      </div>
    </div>
  );
}
