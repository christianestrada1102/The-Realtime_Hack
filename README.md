<div align="center">

# Poised

**Simulador de entrevistas técnicas en tiempo real con IA**

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS_v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=flat&logo=greensock&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=three.js&logoColor=white)
![MIT License](https://img.shields.io/badge/license-MIT-green?style=flat)
![Estado](https://img.shields.io/badge/Estado-En_Desarrollo-f59e0b?style=flat)

[Live Demo](https://the-realtime-hack.vercel.app) · [Reportar Bug](https://github.com/christianestrada1102/The-Realtime_Hack/issues)

</div>

---

## About

Poised es un simulador de entrevistas técnicas que usa IA conversacional en tiempo real. Ana, la entrevistadora virtual, conduce una sesión completa en español con voz sintetizada, transcripción automática y un editor de código integrado — todo en una sola pantalla.

Construido para [The Realtime Hackathon 2026](https://www.realtimehackathon.com/) usando Portal SDK como canal de comunicación en tiempo real entre los agentes de IA.

> Built and maintained by [Christian Estrada](https://www.codebynas.dev/) (@CodeByNas) · Chihuahua, Mexico

---

## Key Features

| Feature | Description |
|---|---|
| 🎙️ **Voz en tiempo real** | Ana responde con voz sintetizada via OpenRouter TTS — latencia mínima por streaming |
| 🧠 **Entrevistador con memoria** | Claude Haiku mantiene el historial completo de la conversación y escala la dificultad |
| 📝 **Transcripción automática** | Whisper STT transcribe tu voz y la muestra en el panel lateral |
| 💻 **Editor de código integrado** | CodeMirror 6 aparece automáticamente cuando Ana pide que implementes algo |
| ⏱️ **Timer con aviso** | Sesión configurable (15–60 min), avisa a los 5 minutos restantes |
| 🌐 **Canal Portal** | Comunicación en tiempo real entre Entrevistador y Observador via Portal SDK |
| 🎨 **Landing con WebGL** | Globe (Three.js) y ChromaticWaves (OGL) con lazy load y `memo()` anti-re-mount |
| 📊 **Feedback al terminar** | Pantalla de resumen con fortalezas y áreas de mejora generadas por IA |

---

## Preview

> Entrevista técnica en progreso — Ana pregunta, tú respondes con voz o texto, el editor aparece cuando hay código.

---

## Tech Stack

### Frontend

```
Next.js 16.3       — App Router, Turbopack, Server Components
React 19           — UI principal
TypeScript 5       — Tipado estático
Tailwind CSS v4    — Estilos con @theme block
GSAP 3 + Lenis     — Animaciones scroll, sincronizados via gsap.ticker
Three.js + OGL     — Globe 3D y ChromaticWaves (lazy con dynamic() + ssr:false)
CodeMirror 6       — Editor de código en sesión
```

### Backend (API Routes — Next.js)

```
OpenRouter API     — LLM (claude-haiku-4-5), TTS (x-ai/grok-voice-tts-1.0, voz Eve)
Whisper STT        — Transcripción de audio vía OpenRouter
Portal SDK         — Canal en tiempo real (channelId por sesión)
```

### Arquitectura en tiempo real

```
Tú (micrófono)
  └─► Whisper STT  ──► texto
                         └─► Canal Portal ──► Ana (LLM + TTS)
                                          └─► Observador (feedback silencioso)
```

---

## Project Structure

```
/
├── app/
│   ├── page.tsx                  # Landing page completa (Hero, Problema, Globe, Arquitectura)
│   ├── layout.tsx                # Root layout con LenisProvider y PortalClientProvider
│   ├── globals.css               # @theme Tailwind v4 + Manuscribe font
│   └── api/
│       ├── interview/route.ts    # POST — LLM entrevistador (Claude Haiku via OpenRouter)
│       ├── speak/route.ts        # POST — TTS (Grok Voice via OpenRouter)
│       ├── transcribe/route.ts   # POST — STT (Whisper via OpenRouter)
│       ├── feedback/route.ts     # POST — Genera feedback de la sesión
│       └── session/create/route.ts  # POST — Crea sesión y channelId Portal
│
├── components/
│   ├── SessionView.tsx           # Vista principal de entrevista (voz, editor, transcripción)
│   ├── FeedbackScreen.tsx        # Pantalla de resultados al terminar
│   ├── CodeEditor.tsx            # CodeMirror 6 con tema dark
│   ├── LenisProvider.tsx         # Lenis + ScrollTrigger sincronizados via gsap.ticker
│   ├── PortalClientProvider.tsx  # Portal SDK context provider
│   └── originkit/
│       ├── globe.tsx             # Globe 3D — Three.js + d3-geo
│       ├── chromatic-waves.tsx   # Fondo animado Hero — OGL shaders
│       └── pixel-tetris.tsx      # Tetris canvas (OriginKit, sin uso activo)
│
├── lib/
│   ├── useVoiceRecorder.ts       # Hook: grabación de audio con MediaRecorder
│   ├── useAudioPlayer.ts         # Hook: reproducción de audio TTS
│   ├── useSilenceDetector.ts     # Hook: detección de silencio para auto-stop
│   ├── portal.ts                 # Configuración cliente Portal SDK
│   └── types.ts                  # Tipos compartidos
│
├── public/Assets/Fonts/
│   └── ManuscribeFree-Regular.otf  # Fuente display de marca
│
├── next.config.ts                # reactStrictMode: false
├── vercel.json                   # Config deploy Vercel
└── .env.local                    # Variables de entorno (no commiteado)
```

---

## Real-time Flow

La sesión funciona así paso a paso:

1. Se crea un `sessionId` único vía `/api/session/create`
2. Portal SDK abre un canal `session-{id}` compartido entre cliente y servidor
3. Ana saluda con LLM → texto → TTS → audio en el browser
4. Silencio detectado → MediaRecorder para → Whisper transcribe → texto a LLM → ciclo
5. Si la respuesta de Ana contiene keywords de código (`implementa`, `SQL`, `componente`...), el editor aparece automáticamente
6. Al terminar (timer o botón): `/api/feedback` genera el resumen de la sesión

---

## Installation

### Prerequisites

- Node.js 18+
- Cuenta en [OpenRouter](https://openrouter.ai/) (para LLM + TTS + STT)
- Cuenta en [Portal SDK](https://portalsdk.io/) (para canal en tiempo real)

### Setup

```bash
git clone https://github.com/christianestrada1102/The-Realtime_Hack.git
cd The-Realtime_Hack
npm install
```

Crea `.env.local` en la raíz:

```env
OPENROUTER_API_KEY=sk-or-...
NEXT_PUBLIC_PORTAL_API_KEY=pk_...
```

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Servidor de desarrollo con Turbopack |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend + API Routes | Vercel | Deploy automático desde `main` |
| TTS / LLM / STT | OpenRouter | API key en variables de entorno Vercel |
| Canal en tiempo real | Portal SDK | API key en variables de entorno Vercel |

### Variables de entorno en Vercel

```
OPENROUTER_API_KEY
NEXT_PUBLIC_PORTAL_API_KEY
```

---

## License

```
MIT License

Copyright (c) 2026 Christian Estrada (CodeByNas)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Author

**Christian Estrada**
Chihuahua, Mexico

[![LinkedIn](https://img.shields.io/badge/LinkedIn-000000?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/christian-estrada-a59130386/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/christianestrada1102)
[![X](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/CodeByNas)

---

<div align="center">
  <p><sub>© 2026 CodeByNas · MIT License</sub></p>
</div>
