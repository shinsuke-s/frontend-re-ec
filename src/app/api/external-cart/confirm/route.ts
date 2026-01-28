import { NextResponse } from "next/server";
import { getAuthHeader } from "@/lib/externalAuth";

const cartApiBase =
  process.env.EXTERNAL_CART_API_BASE ||
  process.env.EXTERNAL_PRODUCT_API_BASE ||
  "http://192.168.0.25:4649";

const resolveAuthHeader = async () => {
  const header = await getAuthHeader();
  return header || null;
};

export async function POST() {
  try {
    const authHeader = await resolveAuthHeader();
    if (!authHeader) {
      return NextResponse.json(
        { status: "error", message: "Auth token is not set" },
        { status: 500 }
      );
    }

    const res = await fetch(`${cartApiBase.replace(/\/$/, "")}/u/cart/confirm`, {
      method: "POST",
      headers: { Authorization: authHeader },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: data?.message || "Failed to confirm cart", data },
        { status: res.status }
      );
    }

    return NextResponse.json({ status: "ok", data });
  } catch (error) {
    console.error("external cart confirm error", error);
    return NextResponse.json(
      { status: "error", message: "Failed to confirm cart" },
      { status: 500 }
    );
  }
}
