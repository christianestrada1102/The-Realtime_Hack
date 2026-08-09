import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "your_openrouter_api_key_here") {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio field" }, { status: 400 });
  }

  // Forward to OpenRouter Whisper as multipart/form-data
  const outForm = new FormData();
  outForm.append("file", audio, "audio.webm");
  outForm.append("model", "openai/whisper-large-v3");
  outForm.append("language", "es");
  // Domain prompt helps Whisper recognize technical vocabulary correctly
  outForm.append(
    "prompt",
    "Entrevista técnica de programación en español. Términos comunes: función, array, objeto, clase, variable, algoritmo, complejidad, O(n), recursión, iteración, useState, useEffect, async, await, Promise, API, REST, SQL, índice, puntero, stack, queue, árbol, grafo, nodo, heap, hash, backend, frontend, deployment, TypeScript, JavaScript, Python, Java."
  );
  outForm.append("temperature", "0.2");

  const res = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: outForm,
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `OpenRouter error: ${body}` }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ text: data.text ?? "" });
}
