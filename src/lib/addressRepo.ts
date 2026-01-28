import { getPool } from "./db";

type SessionUser = { id: number };

export type AddressRecord = {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  first_name_kana: string;
  last_name_kana: string;
  postal_code: string;
  prefecture: string;
  city: string;
  town: string;
  street: string;
  building?: string | null;
  room?: string | null;
  phone?: string | null;
  email?: string | null;
  is_default: boolean;
  billing_same: boolean;
  billing_first_name?: string | null;
  billing_last_name?: string | null;
  billing_first_name_kana?: string | null;
  billing_last_name_kana?: string | null;
  billing_postal_code?: string | null;
  billing_prefecture?: string | null;
  billing_city?: string | null;
  billing_town?: string | null;
  billing_street?: string | null;
  billing_building?: string | null;
  billing_room?: string | null;
  billing_phone?: string | null;
  billing_email?: string | null;
};

export async function fetchAddresses(user: SessionUser): Promise<AddressRecord[]> {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC", [user.id]);
  return rows as AddressRecord[];
}

export async function createAddress(user: SessionUser, payload: Partial<AddressRecord>) {
  const pool = getPool();
  if (!pool) throw new Error("DB not configured");
  if (payload.is_default) {
    await pool.query("UPDATE addresses SET is_default = FALSE WHERE user_id = ?", [user.id]);
  }
  const [result]: any = await pool.query(
    `INSERT INTO addresses (
      user_id, first_name, last_name, first_name_kana, last_name_kana,
      postal_code, prefecture, city, town, street, building, room, phone, email,
      is_default, billing_same, billing_first_name, billing_last_name, billing_first_name_kana, billing_last_name_kana,
      billing_postal_code, billing_prefecture, billing_city, billing_town, billing_street, billing_building, billing_room, billing_phone, billing_email
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      user.id,
      payload.first_name,
      payload.last_name,
      payload.first_name_kana,
      payload.last_name_kana,
      payload.postal_code,
      payload.prefecture,
      payload.city,
      payload.town,
      payload.street,
      payload.building ?? null,
      payload.room ?? null,
      payload.phone ?? null,
      payload.email ?? null,
      payload.is_default ? 1 : 0,
      payload.billing_same ?? true,
      payload.billing_first_name ?? null,
      payload.billing_last_name ?? null,
      payload.billing_first_name_kana ?? null,
      payload.billing_last_name_kana ?? null,
      payload.billing_postal_code ?? null,
      payload.billing_prefecture ?? null,
      payload.billing_city ?? null,
      payload.billing_town ?? null,
      payload.billing_street ?? null,
      payload.billing_building ?? null,
      payload.billing_room ?? null,
      payload.billing_phone ?? null,
      payload.billing_email ?? null,
    ]
  );
  return result.insertId as number;
}

export async function updateAddress(user: SessionUser, id: number, payload: Partial<AddressRecord>) {
  const pool = getPool();
  if (!pool) throw new Error("DB not configured");
  if (payload.is_default) {
    await pool.query("UPDATE addresses SET is_default = FALSE WHERE user_id = ?", [user.id]);
  }
  await pool.query(
    `UPDATE addresses SET
      first_name=?, last_name=?, first_name_kana=?, last_name_kana=?,
      postal_code=?, prefecture=?, city=?, town=?, street=?, building=?, room=?, phone=?, email=?,
      is_default=?, billing_same=?, billing_first_name=?, billing_last_name=?, billing_first_name_kana=?, billing_last_name_kana=?,
      billing_postal_code=?, billing_prefecture=?, billing_city=?, billing_town=?, billing_street=?, billing_building=?, billing_room=?, billing_phone=?, billing_email=?
    WHERE id=? AND user_id=?`,
    [
      payload.first_name,
      payload.last_name,
      payload.first_name_kana,
      payload.last_name_kana,
      payload.postal_code,
      payload.prefecture,
      payload.city,
      payload.town,
      payload.street,
      payload.building ?? null,
      payload.room ?? null,
      payload.phone ?? null,
      payload.email ?? null,
      payload.is_default ? 1 : 0,
      payload.billing_same ?? true,
      payload.billing_first_name ?? null,
      payload.billing_last_name ?? null,
      payload.billing_first_name_kana ?? null,
      payload.billing_last_name_kana ?? null,
      payload.billing_postal_code ?? null,
      payload.billing_prefecture ?? null,
      payload.billing_city ?? null,
      payload.billing_town ?? null,
      payload.billing_street ?? null,
      payload.billing_building ?? null,
      payload.billing_room ?? null,
      payload.billing_phone ?? null,
      payload.billing_email ?? null,
      id,
      user.id,
    ]
  );
}

export async function deleteAddress(user: SessionUser, id: number) {
  const pool = getPool();
  if (!pool) throw new Error("DB not configured");
  await pool.query("DELETE FROM addresses WHERE id = ? AND user_id = ?", [id, user.id]);
}

export async function setDefaultAddress(user: SessionUser, id: number) {
  const pool = getPool();
  if (!pool) throw new Error("DB not configured");
  await pool.query("UPDATE addresses SET is_default = FALSE WHERE user_id = ?", [user.id]);
  await pool.query("UPDATE addresses SET is_default = TRUE WHERE id = ? AND user_id = ?", [id, user.id]);
}
