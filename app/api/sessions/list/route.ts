import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { checkAdminSecret } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const deny = checkAdminSecret(req);
  if (deny) return deny;

  try {
    const rows = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        score: sessions.score,
        duration: sessions.duration,
        feedback: sessions.feedback,
      })
      .from(sessions)
      .orderBy(desc(sessions.createdAt));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[sessions/list]", err);
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 });
  }
}
