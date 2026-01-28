import { getPool } from "./db";

type SessionUser = { id: number };

export async function ensureCart(user: SessionUser) {
  const pool = getPool();
  const [existing] = await pool.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [user.id]);
  const cartRow = (existing as any[])[0];
  if (cartRow?.id) return cartRow.id as number;
  const [insert]: any = await pool.query("INSERT INTO carts (user_id) VALUES (?)", [user.id]);
  return insert.insertId as number;
}

export async function addCartItem(user: SessionUser, productId: number, quantity: number) {
  const pool = getPool();
  const cartId = await ensureCart(user);
  await pool.query(
    `
    INSERT INTO cart_items (cart_id, product_id, quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `,
    [cartId, productId, quantity]
  );
  return cartId;
}

export async function removeCartItem(user: SessionUser, productId: number) {
  const pool = getPool();
  const [rows] = await pool.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [user.id]);
  const cartId = (rows as any[])[0]?.id;
  if (!cartId) return;
  await pool.query("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", [cartId, productId]);
}

export async function setCartItemQuantity(user: SessionUser, productId: number, quantity: number) {
  const pool = getPool();
  const cartId = await ensureCart(user);
  if (!cartId) return;

  if (quantity <= 0) {
    await pool.query("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", [cartId, productId]);
    return;
  }

  await pool.query(
    `
    INSERT INTO cart_items (cart_id, product_id, quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)
    `,
    [cartId, productId, quantity]
  );
}

export async function changeCartItemQuantity(user: SessionUser, productId: number, delta: number) {
  const pool = getPool();
  const [rows] = await pool.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1", [user.id]);
  const cartId = (rows as any[])[0]?.id;
  if (!cartId) return;
  await pool.query("UPDATE cart_items SET quantity = GREATEST(1, quantity + ?) WHERE cart_id = ? AND product_id = ?", [
    delta,
    cartId,
    productId,
  ]);
}

export async function fetchCart(user: SessionUser) {
  const pool = getPool();
  const [rows] = await pool.query(
    `
    SELECT ci.product_id as productId, SUM(ci.quantity) AS quantity, p.name, p.price, p.slug, p.category,
           COALESCE(GROUP_CONCAT(u.url ORDER BY u.is_primary DESC, u.position ASC, u.id ASC SEPARATOR '||'), '') AS image_list
    FROM carts c
    JOIN cart_items ci ON ci.cart_id = c.id
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN uploads u ON u.product_id = p.id
    WHERE c.user_id = ?
    GROUP BY ci.product_id, p.id, p.slug, p.name, p.price, p.category
    `,
    [user.id]
  );
  return (rows as any[]).map((row) => {
    const images = typeof row.image_list === "string" && row.image_list.length > 0 ? row.image_list.split("||").filter(Boolean) : [];
    return {
      productId: row.productId,
      quantity: Number(row.quantity ?? 0),
      name: row.name,
      price: Number(row.price ?? 0),
      slug: row.slug,
      category: row.category,
      image: images[0] ?? "/hero/slide-1.webp",
    };
  });
}
