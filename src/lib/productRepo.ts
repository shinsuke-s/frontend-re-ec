import { getPool } from "./db";
import type { Product } from "./data";

export type ProductRecord = Product & {
  slug: string;
  groupId?: string;
};

const externalApiBase =
  process.env.EXTERNAL_PRODUCT_API_BASE || "http://192.168.0.25:4649";

const normalizeImageUrl = (url: string): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const clean = url.replace(/^\/+/, "");
  // 画像は /resource/ 配下で配信されるため付け替える
  return `${externalApiBase.replace(/\/$/, "")}/resource/${clean}`;
};

const toProducts = (rows: any[]): ProductRecord[] =>
  rows.map((row) => {
    const imageList: string[] =
      typeof row.image_list === "string" && row.image_list.length > 0
        ? row.image_list.split("||")
        : [];
    const images = imageList.filter(Boolean);
    const image = images[0] ?? "/hero/slide-1.webp";
    return {
      id: String(row.id ?? row.slug ?? ""),
      slug: row.slug ?? String(row.id ?? ""),
      name: row.name ?? "",
      description: row.description ?? "",
      price: Number(row.price ?? 0),
      stock: Number(row.stock ?? 0),
      category: row.category ?? "ポンチョ",
      image,
      images,
    };
  });

export async function fetchProducts(search?: string): Promise<ProductRecord[]> {
  const pool = getPool();
  const term = search?.trim();
  const like = term ? `%${term}%` : null;
  const [rows] = await pool.query(
    `
    SELECT
      p.id,
      p.slug,
      p.name,
      p.description,
      p.price,
      p.stock,
      p.category,
      GROUP_CONCAT(u.url ORDER BY u.is_primary DESC, u.position ASC, u.id ASC SEPARATOR '||') AS image_list
    FROM products p
    LEFT JOIN uploads u ON u.product_id = p.id
    WHERE (? IS NULL OR p.name LIKE ? OR p.description LIKE ? OR p.category LIKE ?)
    GROUP BY p.id
    ORDER BY p.id ASC
    `,
    [like, like, like, like]
  );
  return toProducts(rows as any[]);
}

export async function fetchProductBySlug(
  slug: string
): Promise<ProductRecord | null> {
  const pool = getPool();
  const [rows] = await pool.query(
    `
    SELECT
      p.id,
      p.slug,
      p.name,
      p.description,
      p.price,
      p.stock,
      p.category,
      GROUP_CONCAT(u.url ORDER BY u.is_primary DESC, u.position ASC, u.id ASC SEPARATOR '||') AS image_list
    FROM products p
    LEFT JOIN uploads u ON u.product_id = p.id
    WHERE p.slug = ?
    GROUP BY p.id
    LIMIT 1
    `,
    [slug]
  );
  const products = toProducts(rows as any[]);
  return products[0] ?? null;
}

export async function fetchExternalProduct(
  slug: string
): Promise<ProductRecord | null> {
  try {
    const res = await fetch(
      `${externalApiBase.replace(/\/$/, "")}/product/${slug}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const products = Array.isArray(json?.data?.Products)
      ? json.data.Products
      : [];
    const prod =
      products.find(
        (p: any) =>
          String(p.product_id ?? p.id) === String(slug)
      ) ?? products[0];
    const productId = prod?.product_id ?? prod?.id;
    if (!productId) return null;
    const images: string[] = Array.isArray(prod.images)
      ? prod.images
          .map((i: any) => normalizeImageUrl(String(i?.url || "")))
          .filter((u: string) => !!u)
      : [];
    const image = images[0] || "/hero/slide-1.webp";
    return {
      id: String(productId),
      slug: String(productId),
      groupId: prod.group_id ? String(prod.group_id) : undefined,
      name: prod.name || "",
      description: prod.description || "",
      price: Number(prod.price || 0),
      stock: Number(prod.stock || 0),
      type: prod.type || "",
      has_stock: typeof prod.has_stock === "boolean" ? prod.has_stock : undefined,
      point: typeof prod.point === "number" ? prod.point : undefined,
      category: prod.category || "",
      dimension1: prod.dimension1 || "",
      dimension2: prod.dimension2 || "",
      groupId: prod.group_id ? String(prod.group_id) : undefined,
      image,
      images,
    };
  } catch (e) {
    return null;
  }
}

export async function fetchExternalSearch(
  query: string
): Promise<ProductRecord[]> {
  if (!query) return [];
  try {
    const url = `${externalApiBase.replace(
      /\/$/,
      ""
    )}/product/search?q=${encodeURIComponent(query)}&page=1&size=100`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json?.data?.Items)
      ? json.data.Items
      : Array.isArray(json?.data)
      ? json.data
      : [];
    const seen = new Set<string>();
    const products: ProductRecord[] = [];
    for (const prod of list) {
      const productId = prod.product_id ?? prod.id;
      if (!productId) continue;
      const key = prod.group_id
        ? `${prod.group_id}__${
            prod.dimension1 || prod.dimension2 || productId
          }`
        : productId;
      if (seen.has(key)) continue; // 同じグループIDは先頭1件だけ表示
      seen.add(key);

      const images: string[] = Array.isArray(prod.images)
        ? prod.images
            .map((i: any) => normalizeImageUrl(String(i?.url || "")))
            .filter((u: string) => !!u)
        : [];
      const image = images[0] || "";
      products.push({
        id: String(productId),
        slug: String(productId),
        name: prod.name || "",
        description: prod.description
          ? String(prod.description).slice(0, 100)
          : "",
        price: Number(prod.price || 0),
        stock: Number(prod.stock || 0),
        type: prod.type || "",
        has_stock: typeof prod.has_stock === "boolean" ? prod.has_stock : undefined,
        point: typeof prod.point === "number" ? prod.point : undefined,
        category: prod.category || "",
        dimension1: prod.dimension1 || "",
        dimension2: prod.dimension2 || "",
        groupId: prod.group_id ? String(prod.group_id) : undefined,
        image,
        images,
      });
    }
    return products;
  } catch (e) {
    return [];
  }
}

export async function fetchExternalAll(): Promise<ProductRecord[]> {
  try {
    const url = `${externalApiBase.replace(/\/$/, "")}/product/all?page=1&size=100`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json?.data?.Items)
      ? json.data.Items
      : Array.isArray(json?.data)
      ? json.data
      : [];
    const seen = new Set<string>();
    const products: ProductRecord[] = [];
    for (const prod of list) {
      const productId = prod.product_id ?? prod.id;
      if (!productId) continue;
      const key = prod.group_id
        ? `${prod.group_id}__${prod.dimension1 || prod.dimension2 || productId}`
        : productId;
      if (seen.has(key)) continue;
      seen.add(key);

      const images: string[] = Array.isArray(prod.images)
        ? prod.images
            .map((i: any) => normalizeImageUrl(String(i?.url || "")))
            .filter((u: string) => !!u)
        : [];
      const image = images[0] || "";
      products.push({
        id: String(productId),
        slug: String(productId),
        name: prod.name || "",
        description: prod.description ? String(prod.description).slice(0, 100) : "",
        price: Number(prod.price || 0),
        stock: Number(prod.stock || 0),
        type: prod.type || "",
        has_stock: typeof prod.has_stock === "boolean" ? prod.has_stock : undefined,
        point: typeof prod.point === "number" ? prod.point : undefined,
        category: prod.category || "",
        dimension1: prod.dimension1 || "",
        dimension2: prod.dimension2 || "",
        groupId: prod.group_id ? String(prod.group_id) : undefined,
        image,
        images,
      });
    }
    return products;
  } catch {
    return [];
  }
}

export async function fetchExternalVariants(
  identifier?: string
): Promise<ProductRecord[]> {
  if (!identifier) return [];
  try {
    // /product/:id のレスポンスは同一 group_id をまとめて Products に含める
    const url = `${externalApiBase.replace(/\/$/, "")}/product/${identifier}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = res.ok ? await res.json() : null;
    const fromProduct = Array.isArray(json?.data?.Products)
      ? json.data.Products
      : [];

    const seen = new Set<string>();
    const mapToProduct = (prod: any): ProductRecord => {
      const productId = prod.product_id ?? prod.id;
      const images: string[] = Array.isArray(prod.images)
        ? prod.images
            .map((i: any) => normalizeImageUrl(String(i?.url || "")))
            .filter((u: string) => !!u)
        : [];
      const image = images[0] || "/hero/slide-1.webp";
      return {
        id: String(productId),
        slug: String(productId),
        groupId: prod.group_id ? String(prod.group_id) : undefined,
        name: prod.name || "",
        description: prod.description || "",
        price: Number(prod.price || 0),
        stock: Number(prod.stock || 0),
        type: prod.type || "",
        has_stock: typeof prod.has_stock === "boolean" ? prod.has_stock : undefined,
        point: typeof prod.point === "number" ? prod.point : undefined,
        category: prod.category || "",
        dimension1: prod.dimension1 || "",
        dimension2: prod.dimension2 || "",
        image,
        images,
      } as ProductRecord;
    };

    let products: ProductRecord[] = fromProduct
      .filter((prod: any) => {
        const id = String(prod.product_id ?? prod.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map(mapToProduct);

    // /product/:id が1件しか返さない場合、group_id をキーに search でもう一度拾う
    const groupId = products[0]?.groupId;
    if (products.length <= 1 && groupId) {
      const searchUrl = `${externalApiBase.replace(
        /\/$/,
        ""
      )}/product/search?q=${encodeURIComponent(groupId)}&page=1&size=100`;
      const searchRes = await fetch(searchUrl, { cache: "no-store" });
      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        const list = Array.isArray(searchJson?.data?.Items)
          ? searchJson.data.Items
          : Array.isArray(searchJson?.data)
          ? searchJson.data
          : [];
        for (const prod of list) {
          if (String(prod.group_id) !== String(groupId)) continue;
          const id = String(prod.product_id ?? prod.id);
          if (seen.has(id)) continue;
          seen.add(id);
          products.push(mapToProduct(prod));
        }
      }
    }

    return products;
  } catch {
    return [];
  }
}

