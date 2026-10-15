import { useEffect, useState } from 'react';
import { Select } from '@/lib/klh';
import { useApi } from '@/lib/ui';

export type Mess = { mess_id: number; mess_name: string; facility_id: string; strength: number };
export type Meal = 'Breakfast' | 'Lunch' | 'Evening_Snacks' | 'Dinner';
export const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner'];
export const mealName = (m: string) => (m === 'Evening_Snacks' ? 'Snacks' : m);
export const inr = (n: number | null | undefined) => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const num = (n: number | null | undefined, d = 1) => (n == null ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: d }));
export const day = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const todayIso = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
/** The meal being served now in India time: breakfast till 10:30, lunch till 15:30, snacks till 18:30, then dinner. */
export const mealNow = (): Meal => { const t = new Date(Date.now() + 330 * 60_000); const h = t.getUTCHours() + t.getUTCMinutes() / 60;
  return h < 10.5 ? 'Breakfast' : h < 15.5 ? 'Lunch' : h < 18.5 ? 'Evening_Snacks' : 'Dinner'; };

/** The mess this page works on; remembered on this device. */
export function useMess() {
  const list = useApi<Mess[]>('/mess-ops/messes');
  const [id, setId] = useState<number | null>(() => { try { return Number(localStorage.getItem('klu.mess')) || null; } catch { return null; } });
  const messes = list.data ?? [];
  const mess = messes.find((m) => m.mess_id === id) ?? messes[0];
  useEffect(() => { if (mess) try { localStorage.setItem('klu.mess', String(mess.mess_id)); } catch { /* private window */ } }, [mess]);
  const picker = messes.length > 1 ? (
    <label className="mo-pick">Rasoi<Select value={mess ? String(mess.mess_id) : ''} onChange={(e) => setId(Number(e.target.value))}
      options={messes.map((m) => ({ value: String(m.mess_id), label: `${m.mess_name} · ${m.strength} students` }))} /></label>) : null;
  return { mess, messes, picker };
}

/** Rows to a CSV file the browser saves. */
export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' }));
  a.download = name; a.click();
}
