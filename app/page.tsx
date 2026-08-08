import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Poised</h1>
      <p className="text-zinc-400 text-center max-w-md">
        Simulador de entrevistas técnicas con presión real. Una IA te entrevista.
        Otra observa y añade fricción.
      </p>
      <Link
        href="/session/test-session"
        className="px-6 py-3 bg-zinc-100 text-zinc-950 rounded-lg font-medium hover:bg-white transition-colors"
      >
        Iniciar sesión de prueba
      </Link>
    </main>
  );
}
