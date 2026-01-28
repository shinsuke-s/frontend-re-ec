import { getPool } from "./db";

export type Account = {
  id: number;
  name: string;
  email: string;
  login_id: string;
  phone?: string | null;
};

export async function fetchAccount(userId: number): Promise<Account | null> {
  const pool = getPool();
  try {
    const [rows] = await pool.query("SELECT id, name, email, login_id, phone FROM users WHERE id = ? LIMIT 1", [userId]);
    const user = (rows as any[])[0];
    if (!user) return null;
    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      login_id: user.login_id,
      phone: user.phone,
    };
  } catch (error: any) {
    // phone カラムが無いなどスキーマ差異時はフォールバック
    if (error?.code === "ER_BAD_FIELD_ERROR") {
      const [rows] = await pool.query("SELECT id, name, email, login_id FROM users WHERE id = ? LIMIT 1", [userId]);
      const user = (rows as any[])[0];
      if (!user) return null;
      return {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        login_id: user.login_id,
        phone: null,
      };
    }
    throw error;
  }
}

export async function updateAccount(userId: number, payload: Partial<Account>) {
  const pool = getPool();
  try {
    await pool.query(
      "UPDATE users SET name = ?, email = ?, login_id = ?, phone = ? WHERE id = ?",
      [payload.name, payload.email, payload.login_id, payload.phone ?? null, userId]
    );
  } catch (error: any) {
    if (error?.code === "ER_BAD_FIELD_ERROR") {
      // phone カラムが無い場合は他の項目のみ更新
      await pool.query("UPDATE users SET name = ?, email = ?, login_id = ? WHERE id = ?", [
        payload.name,
        payload.email,
        payload.login_id,
        userId,
      ]);
      return;
    }
    throw error;
  }
}
