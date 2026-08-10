import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { id, duration, history, feedback, score } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await db.insert(sessions).values({ id, duration, history, feedback, score });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sessions/save]", err);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}
