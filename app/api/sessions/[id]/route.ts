import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await db.select().from(sessions).where(eq(sessions.id, params.id));
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("[sessions/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}
