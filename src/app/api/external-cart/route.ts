import { NextResponse } from "next/server";
import { getAuthHeader } from "@/lib/externalAuth";

const cartApiBase =
  process.env.EXTERNAL_CART_API_BASE ||
  process.env.EXTERNAL_PRODUCT_API_BASE ||
  "http://192.168.0.25:4649";

const productApiBase =
  process.env.EXTERNAL_PRODUCT_API_BASE || "http://192.168.0.25:4649";

const resolveAuthHeader = async () => {
  const header = await getAuthHeader();
  return header || null;
};

export async function GET() {
  try {
    const authHeader = await resolveAuthHeader();
    if (!authHeader) {
      return NextResponse.json(
        { status: "guest", message: "Auth token is not set" },
        { status: 401 }
      );
    }
    const res = await fetch(`${cartApiBase.replace(/\/$/, "")}/u/cart`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: data?.message || "Failed to fetch cart", data },
        { status: res.status }
      );
    }
    const normalizeImageUrl = (url: string) => {
      if (!url) return "";
      if (url.startsWith("http://") || url.startsWith("https://")) return url;
      const clean = url.replace(/^\/+/, "");
      return `${productApiBase.replace(/\/$/, "")}/resource/${clean}`;
    };

    const orderItems = Array.isArray(data?.data?.order_items)
      ? data.data.order_items
      : [];
    const extractProducts = (json: any): any[] => {
      const data = json?.data;
      if (Array.isArray(data?.Products)) return data.Products;
      if (Array.isArray(data?.Items)) return data.Items;
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data)) return data;
      return [];
    };

    const getProductId = (item: any) =>
      String(item?.product_id ?? item?.productId ?? item?.id ?? "");

    const fetchVariantLabel = async (productId: string) => {
      try {
        const res = await fetch(
          `${productApiBase.replace(/\/$/, "")}/product/${encodeURIComponent(productId)}`,
          {
            cache: "no-store",
            headers: authHeader ? { Authorization: authHeader } : undefined,
          }
        );
        if (!res.ok) return "";
        const json = await res.json().catch(() => ({}));
        const products = extractProducts(json);
        const match = products.find(
          (p: any) => getProductId(p) === String(productId)
        ) || products[0];
        if (!match) return "";
        return [match.dimension1, match.dimension2]
          .filter(Boolean)
          .join(" / ");
      } catch {
        return "";
      }
    };

    const ids = Array.from(
      new Set(orderItems.map((item: any) => String(item?.product_id || "")))
    ).filter(Boolean);
    const labelMap = new Map<string, string>();
    await Promise.all(
      ids.map(async (id) => {
        const label = await fetchVariantLabel(id);
        if (label) labelMap.set(id, label);
      })
    );
    const items = orderItems.map((item: any) => {
      const rawImage = Array.isArray(item?.images)
        ? String(item.images[0]?.url || "")
        : "";
      const image = normalizeImageUrl(rawImage) || "/hero/slide-1.webp";
      const productId = String(item?.product_id || "");
      const inlineVariant = [item?.dimension1, item?.dimension2]
        .filter(Boolean)
        .join(" / ");
      return {
        orderItemId: String(item?.id || item?.order_item_id || ""),
        productId,
        name: item?.name || "",
        price: Number(item?.price || 0),
        quantity: Math.max(1, Number(item?.quantity || 1)),
        slug: productId,
        category: "",
        image,
        variantLabel: inlineVariant || labelMap.get(productId) || "",
      };
    });
    const total = Number(data?.data?.total_price || 0);
    return NextResponse.json({ status: "ok", source: "external", items, total });
  } catch (error) {
    console.error("external cart fetch error", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to fetch cart",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productId = String(body?.productId ?? body?.product_id ?? "").trim();
    if (!productId) {
      return NextResponse.json(
        { status: "error", message: "product_id is required" },
        { status: 400 }
      );
    }
    const authHeader = await resolveAuthHeader();
    if (!authHeader) {
      return NextResponse.json(
        { status: "guest", message: "Auth token is not set" },
        { status: 401 }
      );
    }

    const res = await fetch(`${cartApiBase.replace(/\/$/, "")}/u/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ product_id: productId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: data?.message || "Failed to add to cart", data },
        { status: res.status }
      );
    }

    return NextResponse.json({ status: "ok", data });
  } catch (error) {
    console.error("external cart add error", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to add to cart",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const addressId = String(body?.address_id ?? body?.addressId ?? "").trim();
    const type = String(body?.type ?? "").trim();
    if (!addressId || (type !== "delivery" && type !== "bill")) {
      return NextResponse.json(
        { status: "error", message: "address_id and type are required" },
        { status: 400 }
      );
    }
    const authHeader = await resolveAuthHeader();
    if (!authHeader) {
      return NextResponse.json(
        { status: "guest", message: "Auth token is not set" },
        { status: 401 }
      );
    }

    const res = await fetch(`${cartApiBase.replace(/\/$/, "")}/u/cart/address`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ address_id: addressId, type }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: data?.message || "Failed to update cart address", data },
        { status: res.status }
      );
    }

    return NextResponse.json({ status: "ok", data });
  } catch (error) {
    console.error("external cart address error", error);
    return NextResponse.json(
      { status: "error", message: "Failed to update cart address" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const orderItemId = String(body?.order_item_id ?? body?.orderItemId ?? "").trim();
    const quantity = Number(body?.quantity);
    if (!orderItemId || Number.isNaN(quantity)) {
      return NextResponse.json(
        { status: "error", message: "order_item_id and quantity are required" },
        { status: 400 }
      );
    }
    const authHeader = await resolveAuthHeader();
    if (!authHeader) {
      return NextResponse.json(
        { status: "guest", message: "Auth token is not set" },
        { status: 401 }
      );
    }

    const res = await fetch(`${cartApiBase.replace(/\/$/, "")}/u/cart/edit`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ order_item_id: orderItemId, quantity }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: data?.message || "Failed to update cart", data },
        { status: res.status }
      );
    }

    return NextResponse.json({ status: "ok", data });
  } catch (error) {
    console.error("external cart edit error", error);
    return NextResponse.json(
      { status: "error", message: "Failed to update cart" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const authHeader = await resolveAuthHeader();
    if (!authHeader) {
      return NextResponse.json(
        { status: "guest", message: "Auth token is not set" },
        { status: 401 }
      );
    }

    const res = await fetch(`${cartApiBase.replace(/\/$/, "")}/u/cart`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: data?.message || "Failed to clear cart", data },
        { status: res.status }
      );
    }

    return NextResponse.json({ status: "ok", data });
  } catch (error) {
    console.error("external cart clear error", error);
    return NextResponse.json(
      { status: "error", message: "Failed to clear cart" },
      { status: 500 }
    );
  }
}
