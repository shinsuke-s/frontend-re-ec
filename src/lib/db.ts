import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export const getPool = () => {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    return null;
  }
  pool = mysql.createPool(url);
  return pool;
};

export const pingDatabase = async () => {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL is not set");
  const [rows] = await p.query("SELECT 1 as ok");
  return rows as Array<{ ok: number }>;
};
