import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Analiza esta entrevista técnica y genera un feedback estructurado en JSON.
Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.

{
  "score": número del 1 al 10,
  "summary": "Una oración resumiendo el desempeño general",
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "weaknesses": ["área de mejora 1", "área de mejora 2"],
  "topics": [
    { "name": "nombre del tema", "level": "strong" | "weak" | "medium" }
  ],
  "recommendation": "Un párrafo concreto de qué estudiar y cómo mejorar"
}`;

export type FeedbackData = {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  topics: Array<{ name: string; level: "strong" | "medium" | "weak" }>;
  recommendation: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  const { history } = await req.json() as {
    history: Array<{ role: "user" | "interviewer"; content: string }>;
  };

  if (!history?.length) {
    return NextResponse.json({ error: "No history provided" }, { status: 400 });
  }

  const transcript = history
    .map((m) => `${m.role === "interviewer" ? "Entrevistador" : "Candidato"}: ${m.content}`)
    .join("\n");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Transcripción de la entrevista:\n\n${transcript}` },
      ],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[feedback] OpenRouter error ${res.status}: ${body}`);
    return NextResponse.json({ error: `OpenRouter error: ${body}` }, { status: res.status });
  }

  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content?.trim() ?? "";

  let feedback: FeedbackData;
  try {
    // Strip any accidental markdown fences
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    feedback = JSON.parse(clean);
  } catch {
    console.error("[feedback] Failed to parse JSON:", raw);
    return NextResponse.json({ error: "Invalid JSON from model", raw }, { status: 502 });
  }

  return NextResponse.json(feedback);
}
