import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { HistorialClient } from "./HistorialClient";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const rows = await db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      score: sessions.score,
      duration: sessions.duration,
      feedback: sessions.feedback,
    })
    .from(sessions)
    .orderBy(desc(sessions.createdAt))
    .catch(() => []);

  return <HistorialClient initialSessions={rows} />;
}
