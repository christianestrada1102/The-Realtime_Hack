import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkAdminSecret } from "@/lib/adminAuth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = checkAdminSecret(req);
  if (deny) return deny;

  const { id } = await params;
  try {
    const rows = await db.select().from(sessions).where(eq(sessions.id, id));
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("[sessions/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}
