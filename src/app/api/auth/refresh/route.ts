import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAccessTokenState } from "@/lib/externalAuth";

const accessTokenCookie = "external_access_token";
const refreshTokenCookie = "external_refresh_token";
const expiresAtCookie = "external_token_expires_at";
const issuedAtCookie = "external_token_issued_at";
const sessionMaxAge = 60 * 60 * 24 * 7;

export async function POST() {
  const store = cookies();
  const hasToken = Boolean(store.get(accessTokenCookie)?.value);
  const hasRefresh = Boolean(store.get(refreshTokenCookie)?.value);

  if (!hasToken && !hasRefresh) {
    return NextResponse.json({ status: "guest" });
  }

  const { accessToken, refreshToken, expiresAt, issuedAt } =
    await getAccessTokenState();
  if (!accessToken) {
    return NextResponse.json({ status: "expired" });
  }

  const res = NextResponse.json({ status: "ok" });
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
  if (expiresAt) {
    res.cookies.set(expiresAtCookie, String(expiresAt), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: sessionMaxAge,
      path: "/",
    });
  }
  if (issuedAt) {
    res.cookies.set(issuedAtCookie, String(issuedAt), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: sessionMaxAge,
      path: "/",
    });
  }
  return res;
}
