import { NextRequest, NextResponse } from "next/server";

const VOICE_ID = "kcQkGnn0HAT2JRDQ4Ljp";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === "your_elevenlabs_api_key_here") {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 500 });
  }

  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `ElevenLabs error: ${body}` }, { status: res.status });
  }

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
