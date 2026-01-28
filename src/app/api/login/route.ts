import { NextResponse } from "next/server";

const sessionCookieName = "session_user";
const sessionMaxAge = 60 * 60 * 24 * 7; // 7 days
const accessTokenCookie = "external_access_token";
const refreshTokenCookie = "external_refresh_token";
const expiresAtCookie = "external_token_expires_at";
const issuedAtCookie = "external_token_issued_at";

const tokenUrl =
  process.env.EXTERNAL_AUTH_TOKEN_URL ||
  "https://api-dev-pg.altech.hk/uaa/oauth2/token";
const basic = process.env.EXTERNAL_AUTH_BASIC;

const formatBasic = () => {
  if (!basic) return null;
  return basic.startsWith("Basic ") ? basic : `Basic ${basic}`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier: string = (body.loginId || body.email || "").trim();
    const password: string = body.password || "";

    if (!identifier || !password) {
      return NextResponse.json(
        { status: "error", message: "ID/メールとパスワードを入力してください" },
        { status: 400 }
      );
    }

    const authHeader = formatBasic();
    if (!authHeader) {
      return NextResponse.json(
        { status: "error", message: "認証情報が設定されていません" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams();
    params.set("grant_type", "custom-password-grant");
    params.set("username", identifier);
    params.set("credentials", password);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });
    const tokenJson = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenJson?.data?.accessToken) {
      return NextResponse.json(
        { status: "error", message: tokenJson?.message || "認証に失敗しました" },
        { status: 401 }
      );
    }

    const accessToken = String(tokenJson.data.accessToken);
    const refreshToken = tokenJson.data.refreshToken
      ? String(tokenJson.data.refreshToken)
      : "";
    const expiresIn = Number(tokenJson.data.expiresIn || 0);
    const issuedAt = Date.now();
    const expiresAt =
      expiresIn > 0 ? issuedAt + expiresIn * 1000 : issuedAt + 10 * 60 * 1000;

    const displayName = identifier.includes("@")
      ? identifier.split("@")[0]
      : identifier;

    const sessionPayload = {
      id: identifier,
      name: displayName || identifier,
      email: identifier.includes("@") ? identifier : "",
      loginId: identifier,
    };

    const res = NextResponse.json({ status: "ok", user: sessionPayload });
    res.cookies.set(sessionCookieName, encodeURIComponent(JSON.stringify(sessionPayload)), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: sessionMaxAge,
      path: "/",
    });
    res.cookies.set(accessTokenCookie, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: sessionMaxAge,
      path: "/",
    });
    if (refreshToken) {
      res.cookies.set(refreshTokenCookie, refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: sessionMaxAge,
        path: "/",
      });
    }
    res.cookies.set(expiresAtCookie, String(expiresAt), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: sessionMaxAge,
      path: "/",
    });
    res.cookies.set(issuedAtCookie, String(issuedAt), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: sessionMaxAge,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("login error", error);
    return NextResponse.json(
      { status: "error", message: "サーバーエラー" },
      { status: 500 }
    );
  }
}
