import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT_EN = `Analyze this technical interview and generate structured feedback in JSON.
Respond ONLY with valid JSON, no additional text, no markdown.

If [CODE SUBMITTED] followed by code appears in the transcript, evaluate that code specifically.

{
  "score": number from 1 to 10,
  "summary": "One sentence summarizing overall performance",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["area for improvement 1", "area for improvement 2"],
  "topics": [
    { "name": "topic name", "level": "strong" | "weak" | "medium" }
  ],
  "codeReview": null | {
    "problem": "brief description of the problem that was asked",
    "verdict": "correct" | "partial" | "incorrect",
    "what_worked": "what worked well in the code",
    "what_to_improve": "what to improve: edge cases, complexity, readability, etc.",
    "complexity": "O(n) — briefly explain why"
  },
  "recommendation": "A concrete paragraph on what to study and how to improve for the next interview"
}

If there was no coding exercise, set codeReview: null.`;

const SYSTEM_PROMPT = `Analiza esta entrevista técnica y genera un feedback estructurado en JSON.
Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.

Si en la transcripción aparece [CÓDIGO ENVIADO] seguido de código, evalúa ese código específicamente.

{
  "score": número del 1 al 10,
  "summary": "Una oración resumiendo el desempeño general",
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "weaknesses": ["área de mejora 1", "área de mejora 2"],
  "topics": [
    { "name": "nombre del tema", "level": "strong" | "weak" | "medium" }
  ],
  "codeReview": null | {
    "problem": "descripción breve del problema que se pidió resolver",
    "verdict": "correcto" | "parcial" | "incorrecto",
    "what_worked": "qué hizo bien en el código",
    "what_to_improve": "qué mejorar: edge cases, complejidad, legibilidad, etc.",
    "complexity": "O(n) — explica brevemente por qué"
  },
  "recommendation": "Un párrafo concreto de qué estudiar y cómo mejorar para la próxima entrevista"
}

Si no hubo ejercicio de código, pon codeReview: null.`;

export type FeedbackData = {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  topics: Array<{ name: string; level: "strong" | "medium" | "weak" }>;
  codeReview: {
    problem: string;
    verdict: "correcto" | "parcial" | "incorrecto";
    what_worked: string;
    what_to_improve: string;
    complexity: string;
  } | null;
  recommendation: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  const { history, lang } = await req.json() as {
    history: Array<{ role: "user" | "interviewer"; content: string }>;
    lang?: "es" | "en";
  };
  const systemPrompt = lang === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT;
  const transcriptLabel = lang === "en" ? "Interview transcript" : "Transcripción de la entrevista";
  const interviewerLabel = lang === "en" ? "Interviewer" : "Entrevistador";
  const candidateLabel = lang === "en" ? "Candidate" : "Candidato";

  if (!history?.length) {
    return NextResponse.json({
      score: 0,
      summary: "La sesión terminó sin conversación registrada.",
      strengths: [],
      weaknesses: ["No hubo interacción durante la sesión"],
      topics: [],
      codeReview: null,
      recommendation: "Intenta iniciar la sesión y responde las preguntas de la entrevistadora antes de terminar.",
    } satisfies FeedbackData);
  }

  const transcript = history
    .map((m) => `${m.role === "interviewer" ? interviewerLabel : candidateLabel}: ${m.content}`)
    .join("\n");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${transcriptLabel}:\n\n${transcript}` },
      ],
      max_tokens: 1200,
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
    // Strip markdown fences and extract first JSON object
    let clean = raw.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim();
    // If model added text before/after the JSON, extract just the object
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) clean = jsonMatch[0];
    feedback = JSON.parse(clean);
  } catch {
    console.error("[feedback] Failed to parse JSON:", raw);
    // Retry with a stricter prompt asking only for JSON
    const retryRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-5",
        messages: [
          { role: "system", content: "Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni markdown." },
          { role: "user", content: `Basándote en esta transcripción de entrevista técnica, genera este JSON exacto:\n{"score":número,"summary":"string","strengths":["..."],"weaknesses":["..."],"topics":[{"name":"...","level":"strong|medium|weak"}],"codeReview":null,"recommendation":"string"}\n\nTranscripción:\n${transcript}` },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });
    const retryData = await retryRes.json();
    const retryRaw: string = retryData.choices?.[0]?.message?.content?.trim() ?? "";
    try {
      const m = retryRaw.match(/\{[\s\S]*\}/);
      feedback = JSON.parse(m ? m[0] : retryRaw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from model", raw }, { status: 502 });
    }
  }

  return NextResponse.json(feedback);
}
