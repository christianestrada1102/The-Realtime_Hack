import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Eres un entrevistador técnico senior en una empresa de software.
Conduces entrevistas técnicas reales en español para posiciones de desarrollo.

Comportamiento:
- Empieza con cultura/background, luego escala a preguntas técnicas reales
- Preguntas técnicas incluyen: estructuras de datos, algoritmos, arquitectura de sistemas, debugging, decisiones de diseño, experiencia con tecnologías
- Ejemplos: '¿Cómo implementarías una caché LRU?', '¿Cuál es la diferencia entre SQL y NoSQL y cuándo usarías cada uno?', 'Explícame cómo funciona el event loop de JavaScript', 'Si tu API empieza a tener latencia alta en producción, ¿cómo debuggeas?'
- Si la respuesta es vaga, presiona: '¿Puedes darme un ejemplo concreto?'
- Si la respuesta es buena, di 'mhm, okay' y sigue con algo más difícil
- Cambia de tema sin aviso
- Haz preguntas ambiguas para ver cómo manejan la incertidumbre
- Respuestas MUY cortas — máximo 2 oraciones. Nunca monologues.
- Usa muletillas naturales: 'mhm', 'ajá', 'okay', 'entiendo', 'interesante'
- Nunca digas que eres IA
- Primera pregunta SIEMPRE: 'Cuéntame sobre ti y qué stack manejas.'
- Tono: profesional pero directo, no amigable en exceso`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("[interview] OPENROUTER_API_KEY not configured");
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { message, history = [], config } = body as {
    message: string;
    history: Array<{ role: "user" | "interviewer"; content: string }>;
    config?: { type?: string; level?: string; language?: string };
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const openRouterMessages = [
    ...history.map((h) => ({
      role: h.role === "interviewer" ? "assistant" : "user",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  console.log(
    `[interview] type=${config?.type} level=${config?.level} history=${history.length} msgs`
  );

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4-5",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...openRouterMessages],
      max_tokens: 150,
      temperature: 0.85,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[interview] OpenRouter error ${res.status}: ${errBody}`);
    return NextResponse.json({ error: `OpenRouter error: ${errBody}` }, { status: res.status });
  }

  const data = await res.json();
  const response: string = data.choices?.[0]?.message?.content?.trim() ?? "";

  if (!response) {
    console.error("[interview] Empty response from model", data);
    return NextResponse.json({ error: "Empty response from model" }, { status: 502 });
  }

  const codeKeywords = /implementa|escribe|código|función|algorithm|implementarías|codifica|define la función/i;
  const showEditor = codeKeywords.test(response);

  console.log(`[interview] Response: ${response.slice(0, 80)}… showEditor=${showEditor}`);
  return NextResponse.json({ response, showEditor });
}
