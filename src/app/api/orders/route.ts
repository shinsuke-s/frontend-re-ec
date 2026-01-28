import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getAuthHeader } from "@/lib/externalAuth";

const sessionCookieName = "session_user";
const cartCookieName = "cart_items";
const orderApiBase =
  process.env.EXTERNAL_CART_API_BASE ||
  process.env.EXTERNAL_PRODUCT_API_BASE ||
  "http://192.168.0.25:4649";
const productApiBase =
  process.env.EXTERNAL_PRODUCT_API_BASE || "http://192.168.0.25:4649";

const getSessionUser = () => {
  const raw = cookies().get(sessionCookieName)?.value;
  if (!raw) return null;
  try {
    const user = JSON.parse(decodeURIComponent(raw));
    if (!user?.id) return null;
    return { id: Number(user.id), name: user.name } as { id: number; name?: string };
  } catch (e) {
    return null;
  }
};

const readCartFromCookie = (): Array<{ productId: number; quantity: number }> => {
  const raw = cookies().get(cartCookieName)?.value;
  if (!raw) return [];
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((it) => ({
        productId: Number(it.productId),
        quantity: Math.max(1, Math.floor(Number(it.quantity))),
      }))
      .filter((it) => it.productId && it.quantity);
  } catch {
    return [];
  }
};

const clearCartCookie = (res: NextResponse) => {
  res.cookies.set(cartCookieName, "", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 0,
  });
};

const setSessionCookie = (res: NextResponse, user: { id: number; name?: string }) => {
  res.cookies.set(sessionCookieName, encodeURIComponent(JSON.stringify(user)), {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
};

const resolveAuthHeader = async () => {
  const header = await getAuthHeader();
  return header || null;
};

const normalizeImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const clean = url.replace(/^\/+/, "");
  return `${productApiBase.replace(/\/$/, "")}/resource/${clean}`;
};

const isPlaceholderDate = (value?: string) =>
  !value ||
  value.startsWith("1900-01-01") ||
  value.startsWith("0001-01-01");

const resolveOrderDate = (order: any) => {
  if (!isPlaceholderDate(order?.confirm_at)) return order.confirm_at;
  if (!isPlaceholderDate(order?.paid_at)) return order.paid_at;
  if (!isPlaceholderDate(order?.delivery_at)) return order.delivery_at;
  return new Date().toISOString();
};

const statusLabel = (status?: string) => {
  const value = String(status || "").toLowerCase();
  if (value === "cart") return "カート";
  if (value === "confirm") return "未決済";
  if (value === "pending_result") return "結果待ち";
  if (value === "failure") return "失敗";
  if (value === "paid") return "支払い完了";
  if (value === "delivery") return "配送中";
  return "未決済";
};

const buildAddress = (addr: any) => ({
  name: `${addr?.last_name || ""}${addr?.first_name || ""}`.trim(),
  name_kana: `${addr?.kana_last_name || ""}${addr?.kana_first_name || ""}`.trim(),
  postal_code: addr?.post_code || "",
  prefecture: addr?.prefecture || "",
  city: addr?.city_town_village || "",
  town: "",
  street: "",
  building: addr?.address_details || "",
  room: "",
  phone: addr?.phone || "",
  email: addr?.email || "",
});

const buildVariantLabel = (item: any) =>
  [item?.dimension1, item?.dimension2].filter(Boolean).join(" / ");

export async function GET() {
  try {
    const authHeader = await resolveAuthHeader();
    if (!authHeader) {
      return NextResponse.json(
        { status: "guest", message: "Auth token is not set" },
        { status: 401 }
      );
    }

    const res = await fetch(`${orderApiBase.replace(/\/$/, "")}/u/order/history`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: data?.message || "取得に失敗しました", data },
        { status: res.status }
      );
    }

    const list = Array.isArray(data?.data) ? data.data : [];
    const items = list.map((order: any) => {
      const orderItems = Array.isArray(order?.order_items)
        ? order.order_items
        : [];
      const createdAt = resolveOrderDate(order);
      const delivery = buildAddress(order?.delivery_address_id || {});
      const billing = buildAddress(order?.bill_address_id || {});
      const normalizedItems = orderItems.map((item: any) => {
        const raw = Array.isArray(item?.images)
          ? String(item.images[0]?.url || "")
          : "";
        return {
          orderItemId: item?.order_item_id || "",
          productId: item?.product_id || "",
          name: item?.name || "",
          variantLabel: buildVariantLabel(item),
          price: Number(item?.price || 0),
          quantity: Number(item?.quantity || 0),
          image: normalizeImageUrl(raw),
        };
      });
      return {
        id: order?.order_id || "",
        status: order?.status || "",
        statusLabel: statusLabel(order?.status),
        total: Number(order?.total_price || 0),
        points: Number(order?.total_grant_point || 0),
        created_at: createdAt,
        items: normalizedItems,
        payment: {
          method: "クレジットカード",
          last5: "",
        },
        shipping: delivery,
        billing,
        trackingNumber: order?.tracking_number || "",
      };
    });

    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    console.error("orders fetch error", error);
    return NextResponse.json(
      { status: "error", message: "取得に失敗しました" },
      { status: 500 }
    );
  }
}

async function GET_LEGACY() {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ status: "guest" }, { status: 401 });
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `
      SELECT
        o.id,
        o.status,
        o.total,
        o.created_at,
        o.shipping_first_name,
        o.shipping_last_name,
        o.shipping_first_name_kana,
        o.shipping_last_name_kana,
        o.shipping_postal_code,
        o.shipping_prefecture,
        o.shipping_city,
        o.shipping_town,
        o.shipping_street,
        o.shipping_building,
        o.shipping_room,
        o.shipping_phone,
        o.shipping_email,
        GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity) ORDER BY oi.id SEPARATOR '||') AS line_text
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.user_id = ?
      GROUP BY
        o.id, o.status, o.total, o.created_at,
        o.shipping_first_name, o.shipping_last_name, o.shipping_first_name_kana, o.shipping_last_name_kana,
        o.shipping_postal_code, o.shipping_prefecture, o.shipping_city, o.shipping_town, o.shipping_street,
        o.shipping_building, o.shipping_room, o.shipping_phone, o.shipping_email
      ORDER BY o.created_at DESC, o.id DESC
      `,
      [user.id]
    );
    const items = (rows as any[]).map((row) => ({
      id: Number(row.id),
      status: row.status,
      total: Number(row.total ?? 0),
      created_at: row.created_at,
      lines: typeof row.line_text === "string" && row.line_text.length > 0 ? row.line_text.split("||") : [],
      shipping: {
        name: `${row.shipping_last_name || ""}${row.shipping_first_name || ""}`.trim(),
        name_kana: `${row.shipping_last_name_kana || ""}${row.shipping_first_name_kana || ""}`.trim(),
        postal_code: row.shipping_postal_code || "",
        prefecture: row.shipping_prefecture || "",
        city: row.shipping_city || "",
        town: row.shipping_town || "",
        street: row.shipping_street || "",
        building: row.shipping_building || "",
        room: row.shipping_room || "",
        phone: row.shipping_phone || "",
        email: row.shipping_email || "",
      },
    }));
    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    console.error("orders fetch error", error);
    return NextResponse.json({ status: "error", message: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user = getSessionUser();
  const cartItems = readCartFromCookie();
  if (cartItems.length === 0) {
    return NextResponse.json({ status: "error", message: "カートが空です" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const shippingAddressId = body.addressId ? Number(body.addressId) : null;
    let shippingAddressSnapshot: {
      first_name: string;
      last_name: string;
      first_name_kana: string;
      last_name_kana: string;
      postal_code: string;
      prefecture: string;
      city: string;
      town: string;
      street: string;
      building: string | null;
      room: string | null;
      phone: string | null;
      email: string | null;
    } | null = null;

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // ゲストの場合はユーザーを作成
      if (!user) {
        const { name, email, login_id, password } = body.user || {};
        if (!name || !email || !login_id || !password) {
          await conn.rollback();
          return NextResponse.json({ status: "error", message: "ユーザー情報が不足しています" }, { status: 400 });
        }
        const [userResult]: any = await conn.query(
          `INSERT INTO users (name, email, login_id, password) VALUES (?, ?, ?, ?)`,
          [name, email, login_id, password]
        );
        user = { id: Number(userResult.insertId), name };
      }

      // 商品価格を取得し直し、total を算出
      const productIds = Array.from(new Set(cartItems.map((c) => c.productId)));
      const placeholders = productIds.map(() => "?").join(",");
      const [prodRows] = await conn.query(
        `SELECT id, price FROM products WHERE id IN (${placeholders})`,
        productIds
      );
      const priceMap = new Map<number, number>();
      (prodRows as any[]).forEach((p) => priceMap.set(Number(p.id), Number(p.price || 0)));

      let total = 0;
      const validLines: Array<{ productId: number; quantity: number; price: number }> = [];
      for (const c of cartItems) {
        const price = priceMap.get(c.productId);
        if (price === undefined) continue;
        total += price * c.quantity;
        validLines.push({ productId: c.productId, quantity: c.quantity, price });
      }
      if (validLines.length === 0) {
        await conn.rollback();
        return NextResponse.json({ status: "error", message: "有効な商品がありません" }, { status: 400 });
      }

      // 配送先IDが無い場合、送信された住所で作成
      let shippingId = shippingAddressId;
      if (!shippingId && body.address) {
        const a = body.address;
        const [addrResult]: any = await conn.query(
          `INSERT INTO addresses (
            user_id, first_name, last_name, first_name_kana, last_name_kana,
            postal_code, prefecture, city, town, street, building, room, phone, email, is_default
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            a.first_name || "",
            a.last_name || "",
            a.first_name_kana || "",
            a.last_name_kana || "",
            a.postal_code || "",
            a.prefecture || "",
            a.city || "",
            a.town || "",
            a.street || "",
            a.building || null,
            a.room || null,
            a.phone || null,
            a.email || null,
            1,
          ]
        );
        shippingId = Number(addrResult.insertId);
        shippingAddressSnapshot = {
          first_name: a.first_name || "",
          last_name: a.last_name || "",
          first_name_kana: a.first_name_kana || "",
          last_name_kana: a.last_name_kana || "",
          postal_code: a.postal_code || "",
          prefecture: a.prefecture || "",
          city: a.city || "",
          town: a.town || "",
          street: a.street || "",
          building: a.building || null,
          room: a.room || null,
          phone: a.phone || null,
          email: a.email || null,
        };
      }

      if (shippingId && !shippingAddressSnapshot) {
        const [addrRows] = await conn.query(
          `SELECT first_name, last_name, first_name_kana, last_name_kana,
                  postal_code, prefecture, city, town, street, building, room, phone, email
             FROM addresses WHERE id = ? AND user_id = ? LIMIT 1`,
          [shippingId, user.id]
        );
        const a: any = (addrRows as any[])[0];
        if (a) {
          shippingAddressSnapshot = {
            first_name: a.first_name || "",
            last_name: a.last_name || "",
            first_name_kana: a.first_name_kana || "",
            last_name_kana: a.last_name_kana || "",
            postal_code: a.postal_code || "",
            prefecture: a.prefecture || "",
            city: a.city || "",
            town: a.town || "",
            street: a.street || "",
            building: a.building || null,
            room: a.room || null,
            phone: a.phone || null,
            email: a.email || null,
          };
        }
      }

      // 支払い方法が無ければ作成（ordersテーブルには持たないが、ユーザーの支払い方法として保存）
      if (body.payment) {
        const p = body.payment;
        const last4 = (p.last4 || p.card_number || "").toString().slice(-4);
        if (last4 && p.exp_month && p.exp_year) {
          await conn.query(
            `INSERT INTO payments (user_id, nickname, brand, last4, exp_month, exp_year, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              user.id,
              p.nickname || null,
              p.brand || null,
              last4,
              Number(p.exp_month),
              Number(p.exp_year),
              1,
            ]
          );
        }
      }

      const [orderResult]: any = await conn.query(
        `INSERT INTO orders (
           user_id, total, status,
           shipping_first_name, shipping_last_name, shipping_first_name_kana, shipping_last_name_kana,
           shipping_postal_code, shipping_prefecture, shipping_city, shipping_town, shipping_street, shipping_building, shipping_room,
           shipping_phone, shipping_email
         )
         VALUES (?, ?, 'processing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          total,
          shippingAddressSnapshot?.first_name || "",
          shippingAddressSnapshot?.last_name || "",
          shippingAddressSnapshot?.first_name_kana || "",
          shippingAddressSnapshot?.last_name_kana || "",
          shippingAddressSnapshot?.postal_code || "",
          shippingAddressSnapshot?.prefecture || "",
          shippingAddressSnapshot?.city || "",
          shippingAddressSnapshot?.town || "",
          shippingAddressSnapshot?.street || "",
          shippingAddressSnapshot?.building || null,
          shippingAddressSnapshot?.room || null,
          shippingAddressSnapshot?.phone || null,
          shippingAddressSnapshot?.email || null,
        ]
      );
      const orderId = orderResult.insertId as number;

      for (const line of validLines) {
        await conn.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price_snapshot)
           VALUES (?, ?, ?, ?)`,
          [orderId, line.productId, line.quantity, line.price]
        );
      }

      await conn.commit();

      const res = NextResponse.json({ status: "ok", orderId });
      if (user) {
        setSessionCookie(res, user);
      }
      clearCartCookie(res);
      return res;
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("orders create error", error);
    return NextResponse.json({ status: "error", message: "注文登録に失敗しました" }, { status: 500 });
  }
}
