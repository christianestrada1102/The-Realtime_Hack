import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getIP } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  if (!rateLimit(getIP(req), { max: 60, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "x-ai/grok-voice-tts-1.0",
      input: text,
      voice: "Eve",
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `OpenRouter TTS error: ${body}` }, { status: res.status });
  }

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
