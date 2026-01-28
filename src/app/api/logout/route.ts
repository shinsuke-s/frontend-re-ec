import { NextResponse } from "next/server";

const sessionCookieName = "session_user";
const accessTokenCookie = "external_access_token";
const refreshTokenCookie = "external_refresh_token";
const expiresAtCookie = "external_token_expires_at";

export async function POST() {
  const res = NextResponse.json({ status: "ok" });
  res.cookies.set(sessionCookieName, "", { maxAge: 0, path: "/" });
  res.cookies.set(accessTokenCookie, "", { maxAge: 0, path: "/" });
  res.cookies.set(refreshTokenCookie, "", { maxAge: 0, path: "/" });
  res.cookies.set(expiresAtCookie, "", { maxAge: 0, path: "/" });
  return res;
}
