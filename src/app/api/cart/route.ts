import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const cartCookieName = "cart_items";

type CartCookieItem = { productId: number; quantity: number };

const readCartFromCookie = (): CartCookieItem[] => {
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

const writeCartCookie = (res: NextResponse, items: CartCookieItem[]) => {
  res.cookies.set(cartCookieName, encodeURIComponent(JSON.stringify(items)), {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
  });
};

const fetchCartDetails = async (items: CartCookieItem[]) => {
  if (!items.length) return [];
  const pool = getPool();
  const ids = Array.from(new Set(items.map((i) => i.productId)));
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.query(
    `
    SELECT p.id as productId, p.name, p.price, p.slug, p.category,
           COALESCE(GROUP_CONCAT(u.url ORDER BY u.is_primary DESC, u.position ASC, u.id ASC SEPARATOR '||'), '') AS image_list
    FROM products p
    LEFT JOIN uploads u ON u.product_id = p.id
    WHERE p.id IN (${placeholders})
    GROUP BY p.id, p.slug, p.name, p.price, p.category
    `,
    ids,
  );
  const detailMap = new Map<number, any>();
  (rows as any[]).forEach((row) => {
    const images =
      typeof row.image_list === "string" && row.image_list.length > 0
        ? row.image_list.split("||").filter(Boolean)
        : [];
    detailMap.set(Number(row.productId), {
      productId: Number(row.productId),
      name: row.name,
      price: Number(row.price ?? 0),
      slug: row.slug,
      category: row.category,
      image: images[0] ?? "/hero/slide-1.webp",
    });
  });

  return items
    .map((item) => {
      const detail = detailMap.get(item.productId);
      if (!detail) return null;
      return { ...detail, quantity: item.quantity };
    })
    .filter(Boolean);
};

export async function GET() {
  const items = readCartFromCookie();
  const detailed = await fetchCartDetails(items);
  return NextResponse.json({ status: "ok", items: detailed });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productId = Number(body.productId);
    const quantity = Math.max(1, Math.floor(Number(body.quantity || 1)));
    if (!productId || quantity <= 0) {
      return NextResponse.json(
        { status: "error", message: "繝代Λ繝｡繝ｼ繧ｿ荳肴ｭ｣" },
        { status: 400 },
      );
    }

    // 蝠・刀縺悟ｭ伜惠縺吶ｋ縺九□縺代メ繧ｧ繝・け
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id FROM products WHERE id = ? LIMIT 1",
      [productId],
    );
    if (!(rows as any[])[0]?.id) {
      return NextResponse.json(
        { status: "error", message: "蝠・刀縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ" },
        { status: 404 },
      );
    }

    const items = readCartFromCookie();
    const existing = items.find((it) => it.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ productId, quantity });
    }

    const detailed = await fetchCartDetails(items);
    const res = NextResponse.json({ status: "ok", items: detailed });
    writeCartCookie(res, items);
    return res;
  } catch (error) {
    console.error("cart add error", error);
    return NextResponse.json(
      { status: "error", message: "繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const productId = Number(body.productId);
    if (!productId)
      return NextResponse.json(
        { status: "error", message: "繝代Λ繝｡繝ｼ繧ｿ荳肴ｭ｣" },
        { status: 400 },
      );

    const items = readCartFromCookie().filter(
      (it) => it.productId !== productId,
    );
    const detailed = await fetchCartDetails(items);
    const res = NextResponse.json({ status: "ok", items: detailed });
    writeCartCookie(res, items);
    return res;
  } catch (error) {
    console.error("cart delete error", error);
    return NextResponse.json(
      { status: "error", message: "繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const productId = Number(body.productId);
    const quantity = Math.max(1, Math.floor(Number(body.quantity)));
    if (!productId || Number.isNaN(quantity)) {
      return NextResponse.json(
        { status: "error", message: "繝代Λ繝｡繝ｼ繧ｿ荳肴ｭ｣" },
        { status: 400 },
      );
    }

    const items = readCartFromCookie();
    const existing = items.find((it) => it.productId === productId);
    if (existing) {
      existing.quantity = quantity;
    } else {
      items.push({ productId, quantity });
    }

    const detailed = await fetchCartDetails(items);
    const res = NextResponse.json({ status: "ok", items: detailed });
    writeCartCookie(res, items);
    return res;
  } catch (error) {
    console.error("cart update error", error);
    return NextResponse.json(
      { status: "error", message: "繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ" },
      { status: 500 },
    );
  }
}
