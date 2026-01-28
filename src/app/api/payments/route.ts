import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createPayment, deletePayment, fetchPayments, setDefaultPayment, updatePayment } from "@/lib/paymentRepo";

const sessionCookieName = "session_user";
const hasDb = !!process.env.DATABASE_URL;

const getSessionUser = () => {
  const raw = cookies().get(sessionCookieName)?.value;
  if (!raw) return null;
  try {
    const user = JSON.parse(decodeURIComponent(raw));
    if (!user?.id) return null;
    return { id: Number(user.id), name: user.name } as { id: number; name?: string };
  } catch {
    return null;
  }
};

export async function GET() {
  if (!hasDb) return NextResponse.json({ status: "ok", items: [] });
  const user = getSessionUser();
  if (!user) return NextResponse.json({ status: "guest" }, { status: 401 });
  const items = await fetchPayments(user);
  return NextResponse.json({ status: "ok", items });
}

export async function POST(request: Request) {
  if (!hasDb) return NextResponse.json({ status: "error", message: "DB未設定" }, { status: 503 });
  const user = getSessionUser();
  if (!user) return NextResponse.json({ status: "guest" }, { status: 401 });
  try {
    const body = await request.json();
    const cardNum: string = body.card_number || "";
    const last4: string = (body.last4 || cardNum).toString().slice(-4);
    const exp_month = Number(body.exp_month);
    const exp_year = Number(body.exp_year);
    if (!last4 || last4.length !== 4) {
      return NextResponse.json({ status: "error", message: "カード番号の下4桁を入力してください" }, { status: 400 });
    }
    if (!exp_month || exp_month < 1 || exp_month > 12) {
      return NextResponse.json({ status: "error", message: "有効期限（月）が不正です" }, { status: 400 });
    }
    if (!exp_year || exp_year < 2024) {
      return NextResponse.json({ status: "error", message: "有効期限（年）が不正です" }, { status: 400 });
    }
    await createPayment(user, {
      nickname: body.nickname,
      brand: body.brand,
      last4,
      exp_month,
      exp_year,
      is_default: body.is_default ?? false,
    });
    const items = await fetchPayments(user);
    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    console.error("payment create error", error);
    return NextResponse.json({ status: "error", message: "登録に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!hasDb) return NextResponse.json({ status: "error", message: "DB未設定" }, { status: 503 });
  const user = getSessionUser();
  if (!user) return NextResponse.json({ status: "guest" }, { status: 401 });
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!id) return NextResponse.json({ status: "error", message: "ID不正" }, { status: 400 });

    // デフォルト設定だけの場合
    if (body.is_default === true && Object.keys(body).length <= 2) {
      await setDefaultPayment(user, id);
      const items = await fetchPayments(user);
      return NextResponse.json({ status: "ok", items });
    }

    const cardNum: string = body.card_number || "";
    const last4: string = (body.last4 || cardNum).toString().slice(-4);
    const exp_month = Number(body.exp_month);
    const exp_year = Number(body.exp_year);
    if (!last4 || last4.length !== 4) {
      return NextResponse.json({ status: "error", message: "カード番号の下4桁を入力してください" }, { status: 400 });
    }
    if (!exp_month || exp_month < 1 || exp_month > 12) {
      return NextResponse.json({ status: "error", message: "有効期限（月）が不正です" }, { status: 400 });
    }
    if (!exp_year || exp_year < 2024) {
      return NextResponse.json({ status: "error", message: "有効期限（年）が不正です" }, { status: 400 });
    }

    await updatePayment(user, id, {
      nickname: body.nickname,
      brand: body.brand,
      last4,
      exp_month,
      exp_year,
      is_default: body.is_default ?? false,
    });
    const items = await fetchPayments(user);
    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    console.error("payment update error", error);
    return NextResponse.json({ status: "error", message: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!hasDb) return NextResponse.json({ status: "error", message: "DB未設定" }, { status: 503 });
  const user = getSessionUser();
  if (!user) return NextResponse.json({ status: "guest" }, { status: 401 });
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!id) return NextResponse.json({ status: "error", message: "ID不正" }, { status: 400 });
    await deletePayment(user, id);
    const items = await fetchPayments(user);
    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    console.error("payment delete error", error);
    return NextResponse.json({ status: "error", message: "削除に失敗しました" }, { status: 500 });
  }
}
