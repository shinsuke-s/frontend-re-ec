import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const sessionCookieName = "session_user";
const sessionMaxAge = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email: string = (body.email || "").trim();
    const password: string = body.password || "";
    const loginId: string = (body.loginId || email || "").trim();
    const name: string =
      (body.name || "").trim() ||
      (email.includes("@") ? email.split("@")[0] : "ユーザー");

    if (!email || !password || !loginId) {
      return NextResponse.json({ status: "error", message: "必須項目が未入力です" }, { status: 400 });
    }

    const hashed = hashPassword(password);
    const pool = getPool();
    const [result]: any = await pool.query(
      `INSERT INTO users (name, email, login_id, password) VALUES (?, ?, ?, ?)` ,
      [name, email, loginId, hashed]
    );

    const userPayload = {
      id: result?.insertId ?? null,
      name,
      email,
      loginId,
    };

    const res = NextResponse.json({ status: "ok", user: userPayload });
    res.cookies.set(sessionCookieName, encodeURIComponent(JSON.stringify(userPayload)), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: sessionMaxAge,
      path: "/",
    });
    return res;
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ status: "error", message: "メールまたはログインIDが既に使われています" }, { status: 409 });
    }
    console.error("signup error", error);
    return NextResponse.json({ status: "error", message: "サーバーエラー" }, { status: 500 });
  }
}
