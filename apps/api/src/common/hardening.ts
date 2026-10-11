import type { NextFunction, Request, Response } from 'express';

/** Security headers on every answer (what helmet would set; HSTS only once TLS is on). */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

/**
 * Rate limits per client address: a general ceiling, and a tight one on the paths that can be guessed at
 * (sign-in, OTP, payment webhook, receipt uploads). In memory, one process: enough for one API server.
 * ponytail: per-process counters; move to Redis when the API runs on more than one machine.
 */
const TIGHT = /^\/api\/(auth\/|contacts\/\d+\/verify|payments\/razorpay\/webhook|me\/payment-proofs$)/;
const LIMITS = { general: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 600), tight: Number(process.env.RATE_LIMIT_TIGHT_PER_MINUTE ?? 10) };
const hits = new Map<string, { n: number; until: number }>();
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.until <= now) hits.delete(k); }, 60_000).unref();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const tight = TIGHT.test(req.path) && req.method !== 'GET';
  const key = `${tight ? 't' : 'g'}:${ip}`, limit = tight ? LIMITS.tight : LIMITS.general;
  const now = Date.now();
  let h = hits.get(key);
  if (!h || h.until <= now) { h = { n: 0, until: now + 60_000 }; hits.set(key, h); }
  h.n++;
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - h.n)));
  if (h.n > limit) {
    res.setHeader('Retry-After', String(Math.ceil((h.until - now) / 1000)));
    res.status(429).json({ statusCode: 429, error: 'Too Many Requests', message: 'Too many attempts. Wait a minute and try again.' });
    return;
  }
  next();
}

/** Which websites may call the API from a browser: CORS_ORIGINS (comma-separated), else the local portal. Phones send no Origin and are unaffected. */
export function corsOrigins(): (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void {
  const allow = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5180,http://127.0.0.1:5173,http://127.0.0.1:5180').split(',').map((s) => s.trim()).filter(Boolean);
  return (origin, cb) => cb(null, !origin || allow.includes(origin));
}
