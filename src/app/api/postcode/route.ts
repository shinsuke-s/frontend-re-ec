import { NextResponse } from "next/server";

const HOST = process.env.JP_API_HOST || "";
const CLIENT_ID = process.env.JP_API_CLIENT_ID || "";
const CLIENT_SECRET = process.env.JP_API_CLIENT_SECRET || "";

// searchcode エンドポイントは仕様で固定だが、将来の差し替えに備えて可変に
const SEARCH_PATHS = Array.from(
  new Set([
    process.env.JP_API_SEARCH_PATH || "/api/v1/searchcode",
    "/api/v1/searchcode",
  ])
);

async function fetchToken() {
  const url = `https://${HOST}/api/v1/j/token`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      // 仕様で必須のため固定値を送る（本来はクライアントIPを入れる）
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      secret_key: CLIENT_SECRET,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`token error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const token = data?.token || data?.access_token;
  if (!token) throw new Error("token missing in response");
  return token as string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawZip = (searchParams.get("zip") || "").replace(/\D/g, "");
    if (rawZip.length < 3) {
      return NextResponse.json({ status: "error", message: "郵便番号は3桁以上を入力してください" }, { status: 400 });
    }
    if (!HOST || !CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({ status: "error", message: "APIの設定が不足しています" }, { status: 500 });
    }

    let token: string;
    try {
      token = await fetchToken();
    } catch (err: any) {
      console.error("postcode token error", err);
      return NextResponse.json({ status: "error", message: "トークン取得に失敗しました" }, { status: 502 });
    }

    let lastStatus = 500;
    let lastBody = "";

    for (const path of SEARCH_PATHS) {
      const url = `https://${HOST}${path}/${rawZip}?page=1&limit=10&choikitype=1&searchtype=1`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const first = data?.addresses?.[0];
        if (!first) {
          return NextResponse.json({ status: "error", message: "住所が見つかりませんでした", raw: data }, { status: 404 });
        }

        const prefecture = first.pref_name || "";
        const city = first.city_name || "";
        const town = first.town_name || "";

        return NextResponse.json({ status: "ok", zip: rawZip, prefecture, city, town, raw: data });
      }

      lastStatus = res.status;
      lastBody = await res.text();
      // 404 などでも次のパスを試す
    }

    return NextResponse.json(
      { status: "error", message: lastBody || "APIエラー", tried: SEARCH_PATHS },
      { status: lastStatus || 500 }
    );
  } catch (error: any) {
    console.error("postcode lookup error", error);
    return NextResponse.json({ status: "error", message: "検索に失敗しました" }, { status: 500 });
  }
}
