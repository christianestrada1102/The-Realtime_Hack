// Simple in-memory rate limiter (per Vercel function instance).
// Not perfect across instances but blocks most abuse patterns.

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, opts: { max: number; windowMs: number }): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + opts.windowMs });
    return true; // allowed
  }

  if (entry.count >= opts.max) return false; // blocked

  entry.count++;
  return true;
}

export function getIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
