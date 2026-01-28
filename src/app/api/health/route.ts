import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db";

export async function GET() {
  try {
    const result = await pingDatabase();
    return NextResponse.json({ status: "ok", result });
  } catch (error) {
    console.error("DB health error", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
