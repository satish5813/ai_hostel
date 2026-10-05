import { useEffect, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { StatusChip, Toast, type T } from './klh';
import { api, ApiError, getSession, type Session } from './api';
import { ACCESS_LABEL, MODULE, accessOf, screenByCode } from '@/app/screens';

/* ---------- data ---------- */
export const fetcher = <T,>(path: string) => api<T>(path);
export function useApi<T>(path: string | null) { return useSWR<T>(path, fetcher as (p: string) => Promise<T>); }
export type Kind = 'student' | 'parent' | 'staff';
export const kindOf = (role: string): Kind => (role === 'Student' ? 'student' : role === 'Parent' ? 'parent' : 'staff');
/** The signed-in person, read synchronously from local storage so every render has it. */
export function useSession() {
  const [s] = useState<(Session & { kind: Kind }) | null>(() => { const x = getSession(); return x ? { ...x, kind: kindOf(x.role) } : null; });
  return s;
}
/** The signed-in person's profile (GEN-01 source) */
export type Profile = { kind: Kind; staff_id?: string; full_name?: string; designation?: string; dept_name?: string; assignments?: { hostel_role: string; facility_id: string; hostel_name: string; zone_id: string | null; floor_name: string | null; shift: string }[]; student_id?: string; student_name?: string; contact_name?: string };
export function useProfile() { const s = useSession(); return useApi<Profile>(s ? '/me/profile' : null); }

/* ---------- toasts (KLH Toast) ---------- */
type ToastItem = { id: number; tone: 'success' | 'critical' | 'info' | 'warning'; title: string };
const listeners = new Set<(t: ToastItem[]) => void>();
let toasts: ToastItem[] = [];
export function toast(title: string, tone: ToastItem['tone'] = 'success') {
  const t = { id: Date.now() + Math.random(), tone, title };
  toasts = [...toasts, t]; listeners.forEach((l) => l(toasts));
  setTimeout(() => dismiss(t.id), tone === 'success' ? 3500 : 7000);
}
const dismiss = (id: number) => { toasts = toasts.filter((x) => x.id !== id); listeners.forEach((l) => l(toasts)); };
export function ToastHost() {
  const [list, setList] = useState<ToastItem[]>([]);
  useEffect(() => { listeners.add(setList); return () => { listeners.delete(setList); }; }, []);
  if (!list.length) return null;
  return <div className="klh klh-toasts">{list.map((t) => <Toast key={t.id} tone={t.tone} title={t.title} onClose={() => dismiss(t.id)} />)}</div>;
}
/** Runs an API action; the database's rule message surfaces as a critical toast. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, okText = 'Done') => {
    setBusy(true);
    try { await fn(); if (okText) toast(okText); return true; }
    catch (e) { toast(e instanceof ApiError ? e.message : String(e), 'critical'); return false; }
    finally { setBusy(false); }
  };
  return { run, busy };
}

/* ---------- screen header: code, name, purpose and this role's access, as in the Roles document ---------- */
export function AccessChips({ access }: { access?: string }) {
  if (!access) return null;
  return <span className="klh-row" style={{ gap: 6 }}>{access.split('').map((a) => <StatusChip key={a} status={ACCESS_LABEL[a] ?? a} tone={a === 'A' ? 'progress' : a === 'X' ? 'warning' : a === 'V' ? 'neutral' : 'info'} />)}</span>;
}
export function ScreenHeader({ code, title, subtitle, actions, compact, bare }: { code: string; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; compact?: boolean; bare?: boolean }) {
  const s = useSession();
  const scr = screenByCode(code);
  const access = s ? accessOf(s.role, code) : undefined;
  const mod = scr ? MODULE[scr.workflow] : MODULE.All;
  if (s?.kind === 'staff') {
    const sub = subtitle ?? scr?.purpose;
    if (bare) return null;
    return (
      <div className="ss-subhead">
        {sub ? <p>{sub}</p> : <span />}
        <div className="ss-subhead-r"><AccessChips access={access} />{actions}</div>
      </div>
    );
  }
  return (
    <div className="klh-screen-head">
      <div style={{ minWidth: 0 }}>
        <p className="klh-overline" style={{ margin: 0 }}><span className={`klh-screen-code klh-tile-${mod.color}`}>{code}</span>{mod.letter ? ` ${mod.label}` : ` ${mod.label}`}</p>
        {!bare && <h1 style={{ fontSize: compact ? 22 : 26, lineHeight: compact ? '30px' : '34px', fontWeight: 700, margin: '4px 0 0' }}>{title ?? scr?.name}</h1>}
        {!bare && (subtitle ?? scr?.purpose) && <p className="klh-muted" style={{ margin: '4px 0 0' }}>{subtitle ?? scr?.purpose}</p>}
      </div>
      <div className="klh-row" style={{ gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}><AccessChips access={access} />{actions}</div>
    </div>
  );
}

/* ---------- small helpers ---------- */
export const titleCase = (n?: string | null) => (n ?? '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
export const roomLabel = (spaceId?: string | null) => (spaceId ?? '').replace(/^H-/, '').replace(/^([A-Z]+\d*)-(\d+)$/, '$1-$2');
export const bedLabel = (subspaceId?: string | null) => (subspaceId ?? '').replace(/-B(\d+)$/, (_m, n) => `-${String.fromCharCode(64 + Number(n))}`);
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
export const today = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
export const words = (s?: string | null) => (s ?? '').replace(/_/g, ' ');
export const mobile = (m?: string | null) => (m ?? '').replace(/(\d{5})(\d{5})/, '$1 $2');
export const moduleColor = (w: keyof typeof MODULE): T.TileColor => MODULE[w].color;
