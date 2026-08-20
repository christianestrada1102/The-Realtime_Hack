import { NextResponse } from "next/server";

export function checkAdminSecret(req: Request): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null; // not configured — open (dev mode)

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null; // authorized
}
