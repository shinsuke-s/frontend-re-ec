import { getPool } from "./db";

type SessionUser = { id: number };

export type PaymentRecord = {
  id: number;
  user_id: number;
  nickname?: string | null;
  brand?: string | null;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
};

export async function fetchPayments(user: SessionUser): Promise<PaymentRecord[]> {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query(
    "SELECT id, user_id, nickname, brand, last4, exp_month, exp_year, is_default FROM payments WHERE user_id = ? ORDER BY is_default DESC, id DESC",
    [user.id]
  );
  return rows as PaymentRecord[];
}

export async function createPayment(user: SessionUser, payload: Partial<PaymentRecord>) {
  const pool = getPool();
  if (!pool) throw new Error("DB not configured");
  if (payload.is_default) {
    await pool.query("UPDATE payments SET is_default = FALSE WHERE user_id = ?", [user.id]);
  }
  const [result]: any = await pool.query(
    `INSERT INTO payments (user_id, nickname, brand, last4, exp_month, exp_year, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      payload.nickname ?? null,
      payload.brand ?? null,
      payload.last4,
      payload.exp_month,
      payload.exp_year,
      payload.is_default ? 1 : 0,
    ]
  );
  return result.insertId as number;
}

export async function updatePayment(user: SessionUser, id: number, payload: Partial<PaymentRecord>) {
  const pool = getPool();
  if (!pool) throw new Error("DB not configured");
  if (payload.is_default) {
    await pool.query("UPDATE payments SET is_default = FALSE WHERE user_id = ?", [user.id]);
  }
  await pool.query(
    `UPDATE payments SET nickname = ?, brand = ?, last4 = ?, exp_month = ?, exp_year = ?, is_default = ? WHERE id = ? AND user_id = ?`,
    [
      payload.nickname ?? null,
      payload.brand ?? null,
      payload.last4,
      payload.exp_month,
      payload.exp_year,
      payload.is_default ? 1 : 0,
      id,
      user.id,
    ]
  );
}

export async function deletePayment(user: SessionUser, id: number) {
  const pool = getPool();
  if (!pool) throw new Error("DB not configured");
  await pool.query("DELETE FROM payments WHERE id = ? AND user_id = ?", [id, user.id]);
}

export async function setDefaultPayment(user: SessionUser, id: number) {
  const pool = getPool();
  if (!pool) throw new Error("DB not configured");
  await pool.query("UPDATE payments SET is_default = FALSE WHERE user_id = ?", [user.id]);
  await pool.query("UPDATE payments SET is_default = TRUE WHERE id = ? AND user_id = ?", [id, user.id]);
}
