import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchAccount, updateAccount } from "@/lib/accountRepo";

const sessionCookieName = "session_user";
const hasDb = !!process.env.DATABASE_URL;

const getSessionUser = () => {
  const raw = cookies().get(sessionCookieName)?.value;
  if (!raw) return null;
  try {
    const user = JSON.parse(decodeURIComponent(raw));
    if (!user?.id) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      loginId: user.loginId,
    } as { id: string | number; name?: string; email?: string; loginId?: string };
  } catch (e) {
    return null;
  }
};

export async function GET() {
  try {
    const user = getSessionUser();
    if (!user) return NextResponse.json({ status: "guest" }, { status: 401 });
    const numericId = Number(user.id);
    if (!hasDb || Number.isNaN(numericId)) {
      const account = {
        name: user.name || "",
        email: user.email || "",
        login_id: user.loginId || "",
      };
      return NextResponse.json({ status: "ok", account });
    }
    const account = await fetchAccount(numericId);
    return NextResponse.json({ status: "ok", account });
  } catch (error) {
    console.error("account fetch error", error);
    return NextResponse.json({ status: "error", message: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!hasDb) return NextResponse.json({ status: "error", message: "DB未設定" }, { status: 503 });
  const user = getSessionUser();
  if (!user) return NextResponse.json({ status: "guest" }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.name || !body.email || !body.login_id) {
      return NextResponse.json({ status: "error", message: "必須項目が未入力です" }, { status: 400 });
    }
    const numericId = Number(user.id);
    if (Number.isNaN(numericId)) {
      return NextResponse.json({ status: "error", message: "外部アカウントは更新できません" }, { status: 400 });
    }
    await updateAccount(numericId, body);
    const account = await fetchAccount(numericId);
    return NextResponse.json({ status: "ok", account });
  } catch (error) {
    console.error("account update error", error);
    return NextResponse.json({ status: "error", message: "更新に失敗しました" }, { status: 500 });
  }
}
