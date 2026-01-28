import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const sessionCookieName = "session_user";

export async function GET() {
  const cookieStore = cookies();
  const raw = cookieStore.get(sessionCookieName)?.value;
  if (!raw) {
    return NextResponse.json({ status: "guest" });
  }
  try {
    const user = JSON.parse(decodeURIComponent(raw));
    return NextResponse.json({ status: "ok", user });
  } catch (error) {
    return NextResponse.json({ status: "guest" });
  }
}