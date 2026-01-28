import { NextResponse } from "next/server";

const productApiBase =
  process.env.EXTERNAL_PRODUCT_API_BASE || "http://192.168.0.25:4649";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { status: "error", message: "id is required" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(
      `${productApiBase.replace(/\/$/, "")}/product/${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: json?.message || "Failed to fetch product" },
        { status: res.status }
      );
    }
    const extractProducts = (payload: any) => {
      const data = payload?.data;
      if (Array.isArray(data?.Products)) return data.Products;
      if (Array.isArray(data?.Items)) return data.Items;
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data)) return data;
      return [];
    };
    const getProductId = (item: any) =>
      String(item?.product_id ?? item?.productId ?? item?.id ?? "");
    const products = extractProducts(json);
    const first =
      products.find((p: any) => getProductId(p) === String(id)) ||
      products[0];
    const groupId = first?.group_id ? String(first.group_id) : "";
    const variantLabel = [first?.dimension1, first?.dimension2]
      .filter(Boolean)
      .join(" / ");
    return NextResponse.json({ status: "ok", groupId, variantLabel });
  } catch (e) {
    return NextResponse.json(
      { status: "error", message: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
