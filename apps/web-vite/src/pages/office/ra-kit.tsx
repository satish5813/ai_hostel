/** Shared pieces of the allotment screens (design "Room Allotment"): head, hostel switch, avatars, chips, bed cells. */
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/ui';
import { bedLetter } from '@/lib/beds';

export type HostelSum = { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; beds: number; open_beds: number; blocked_beds: number; held_beds: number; occupied_beds: number; waiting: number; to_verify: number };
export type BoardBed = { subspace_id: string; bed_code: string; bed_status: string; student_id: string | null; full_name: string | null; programme: string | null };
export type Block = { block_id: number; reason: string; remarks: string | null; blocked_by: string; blocked_on: string; until_date: string | null };
export type Room = { space_id: string; room_code: string; room_status: string; room_type_id: number | null; type_name: string | null; sharing_count: number | null; is_ac: boolean | null; is_accessible: boolean | null; reserved_for: string | null; block: Block | null; beds: BoardBed[] };
export type Floor = { zone_id: string; floor_name: string; floor_no: number; rooms: Room[] };

const AVC = [['#EBEFFF', '#364FC7'], ['#FFE8EF', '#C2255C'], ['#F1ECFF', '#5F3DC4'], ['#E5F4E8', '#237A37'], ['#FFF0E6', '#C2410C'], ['#E6F1FB', '#1971C2']];
const hash = (s: string) => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0);
export const avc = (n?: string | null) => AVC[hash(n ?? '') % AVC.length];
export const ini = (n?: string | null) => (n ?? '').replace(/^Dr\.?\s/i, '').split(/[\s.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const proper = (n?: string | null) => (n ?? '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
export const rs = (n: number | string) => `₹${Number(n).toLocaleString('en-IN')}`;
export const letterOf = (bedCode: string) => bedLetter(bedCode);

export type Tone = 'ok' | 'warn' | 'crit' | 'info' | 'neu' | 'ind';
export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`ra-chip ra-${tone}`}><i />{children}</span>;
}

export type BedState = 'occ' | 'held' | 'blocked' | 'free' | 'off';
export const bedState = (b: BoardBed, room: Room): BedState =>
  b.bed_status === 'Occupied' ? 'occ' : b.bed_status === 'Held' ? 'held' : b.bed_status === 'Damaged' || room.room_status === 'Under_Maintenance' ? 'off' : room.block ? 'blocked' : 'free';
export const BED_CHIP: Record<BedState, [string, Tone]> = { occ: ['Occupied', 'ind'], held: ['Held', 'warn'], blocked: ['Blocked', 'neu'], free: ['Vacant', 'ok'], off: ['Maintenance', 'crit'] };

/** A bed as the design draws it: initials when occupied, the bed letter otherwise; colour and border carry the state. */
export function BedCell({ b, room, size = 'lg' }: { b: BoardBed; room: Room; size?: 'lg' | 'sm' }) {
  const st = bedState(b, room);
  return <span className={`ra-bed ra-bed-${st} ra-bed-${size}`} title={`${room.room_code} bed ${letterOf(b.bed_code)} · ${b.full_name ? proper(b.full_name) : BED_CHIP[st][0]}`}>{st === 'occ' && size === 'lg' ? ini(b.full_name) : letterOf(b.bed_code)}</span>;
}

/** Page head of these screens: coloured eyebrow, title, one line, and the hostel switch on the right. */
export function RaHead({ eyebrow, tone, title, sub, right }: { eyebrow: string; tone: string; title: string; sub: string; right?: ReactNode }) {
  return (
    <div className="ra-head">
      <div className="ra-head-text"><span style={{ color: tone }}>{eyebrow}</span><h1>{title}</h1><p>{sub}</p></div>
      {right}
    </div>
  );
}

/** Pill switch of hostels, remembered across the allotment screens. */
export function useHostel() {
  const list = useApi<HostelSum[]>('/allotment/hostels');
  const [id, setId] = useState<string>(() => { try { return JSON.parse(localStorage.getItem('klu.facility') ?? '""') as string; } catch { return ''; } });
  useEffect(() => { if (list.data?.length && !list.data.some((h) => h.facility_id === id)) setId(list.data[0].facility_id); }, [list.data, id]);
  const pick = (v: string) => { setId(v); try { localStorage.setItem('klu.facility', JSON.stringify(v)); } catch { /* private window */ } };
  const h = list.data?.find((x) => x.facility_id === id);
  return { id: h ? id : '', hostel: h, list: list.data ?? [], pick, reload: () => list.mutate() };
}
export function HostelPills({ list, value, onPick }: { list: HostelSum[]; value: string; onPick: (id: string) => void }) {
  return (
    <div className="ra-pills" role="group" aria-label="Hostel">
      {list.map((h) => <button key={h.facility_id} type="button" aria-pressed={h.facility_id === value} onClick={() => onPick(h.facility_id)}>{h.hostel_code} <small>({h.hostel_gender})</small></button>)}
    </div>
  );
}
