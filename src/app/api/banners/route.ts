import { NextResponse } from "next/server";

const apiBase =
  process.env.EXTERNAL_PRODUCT_API_BASE || "http://192.168.0.25:4649";

const normalizeImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const clean = url.replace(/^\/+/, "");
  return `${apiBase.replace(/\/$/, "")}/resource/${clean}`;
};

export async function GET() {
  try {
    const res = await fetch(`${apiBase.replace(/\/$/, "")}/banner/app`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: json?.message || "Failed to fetch banners" },
        { status: res.status }
      );
    }
    const list = Array.isArray(json?.data) ? json.data : [];
    const items = list
      .slice()
      .sort((a: any, b: any) => Number(a?.sequence || 0) - Number(b?.sequence || 0))
      .map((item: any, index: number) => ({
        id: String(item?.sequence ?? index),
        image: normalizeImageUrl(String(item?.url || "")),
        alt: `Banner ${item?.sequence ?? index + 1}`,
      }))
      .filter((item: any) => item.image);

    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    console.error("banner fetch error", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch banners" },
      { status: 500 }
    );
  }
}
