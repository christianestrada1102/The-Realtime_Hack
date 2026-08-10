import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  duration: integer("duration"),
  history: jsonb("history"),
  feedback: jsonb("feedback"),
  score: integer("score"),
});
