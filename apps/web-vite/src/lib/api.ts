

export const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';   // '' = same origin (Vite dev proxy / reverse proxy)

export type Session = { id: string; role: string; name?: string };

/** Local sign-in (development): the API accepts x-dev-user / x-dev-role until Keycloak is wired. */
export function getSession(): Session | null {
  try { const s = localStorage.getItem('klu.session'); return s ? (JSON.parse(s) as Session) : null; } catch { return null; }
}
export function setSession(s: Session | null) {
  try { s ? localStorage.setItem('klu.session', JSON.stringify(s)) : localStorage.removeItem('klu.session'); } catch { /* ignore */ }
}

export class ApiError extends Error {
  constructor(public status: number, public body: { message?: string; error?: string; issues?: unknown }) {
    super(body?.message ?? body?.error ?? `HTTP ${status}`);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const s = getSession();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (s) { headers['x-dev-user'] = s.id; headers['x-dev-role'] = s.role; }
  if (init.json !== undefined) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(init.json); }
  const res = await fetch(`${API}/api${path}`, { ...init, headers, cache: 'no-store' });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, body ?? {});
  return body as T;
}

export const fmtMoney = (n: unknown) => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: d.length > 10 ? 'short' : undefined }) : '—');
