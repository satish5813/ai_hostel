import { useEffect, useMemo, useState } from 'react';
import { Button, ConfirmDialog, Drawer, Field, Icon, Input, Select, Textarea, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { titleCase, toast, useAction, useApi, useSession, words } from '@/lib/ui';
import { can } from '@/app/screens';

type Place = { place: string; space_id: string | null; space_code: string; category: string; zone_id: string; zone_name: string; floor_no: number; facility_id: string };
type Item = { item_code: string; item_name: string; applies_to: string; category_id: string };
type Line = { place: string; item_code: string; ok: boolean; note: string | null; ticket_id: number | null };
export type Ticket = { ticket_id: number; description: string; priority: string; status: string; raised_date: string; deadline_at: string | null; resolved_date: string | null; resolution_notes: string | null;
  category_id: string; category_name: string; space_code: string | null; space_category: string | null; zone_name: string | null; raised_by_name: string | null; raised_by: string; verified_at: string | null; late: boolean };
type Round = { date: string; places: Place[]; items: Item[]; lines: Line[]; tickets: Ticket[] };
type Answer = { ok: boolean; note: string };
const PRIO: Record<string, string> = { Critical: 'tag-bad', High: 'tag-warn', Medium: '', Low: '' };
const placeName = (p: Place) => (p.category === 'Floor' ? `${p.zone_name}: corridor and safety` : p.category === 'Toilet_Block' ? `Washroom ${p.space_code}` : p.category === 'Hostel_Room' ? `Room ${p.space_code}` : `${words(p.category)} ${p.space_code}`);

/**
 * TKT-04 Checklists, TKT-01 raise a ticket, TKT-02 confirm the repair — the Floor Manager's maintenance in one screen.
 * Floor round: each room, washroom and the floor itself with its checklist; tap OK or Fault (a fault needs a note).
 * Saving raises one ticket per fault and trade, unless one is already open for that place.
 */
export default function Maintenance() {
  const s = useSession()!;
  const [tab, setTab] = useState<'round' | 'tickets'>('round');
  const r = useApi<Round>('/floor/round');
  const editable = can(s.role, 'TKT-04', 'C') || ['Warden', 'Assistant_Warden', 'Chief_Warden'].includes(s.role);
  const t = r.data?.tickets ?? [];
  const toConfirm = t.filter((x) => x.status === 'Resolved').length;
  return (
    <div className="pg">
      <div className="pg-head"><p>Walk your floors with the checklist; every fault becomes a ticket for the right trade. Confirm repairs when the work is done.</p></div>
      <div className="fl-tabs" role="tablist" style={{ padding: 0 }}>
        <button role="tab" className="fl-tab" aria-selected={tab === 'round'} onClick={() => setTab('round')}>Today’s round</button>
        <button role="tab" className="fl-tab" aria-selected={tab === 'tickets'} onClick={() => setTab('tickets')}>Repairs<small>{t.filter((x) => x.status !== 'Closed').length}</small>{toConfirm > 0 && <small className="tag-warn" style={{ background: 'var(--warning-bg)', color: 'var(--warning-fg)' }}>{toConfirm} to confirm</small>}</button>
      </div>
      {!r.data && <div className="q-empty">Loading…</div>}
      {r.data && tab === 'round' && <RoundView data={r.data} editable={editable} onSaved={() => r.mutate()} />}
      {r.data && tab === 'tickets' && <Tickets list={t} places={r.data.places} editable={editable} onDone={() => r.mutate()} />}
    </div>
  );
}

function RoundView({ data, editable, onSaved }: { data: Round; editable: boolean; onSaved: () => void }) {
  const floors = useMemo(() => [...new Map(data.places.map((p) => [p.zone_id, p.zone_name])).entries()], [data.places]);
  const [zone, setZone] = useState('');
  const z = zone || floors[0]?.[0] || '';
  const [ans, setAns] = useState<Record<string, Answer>>({});
  useEffect(() => { setAns(Object.fromEntries(data.lines.map((l) => [`${l.place}|${l.item_code}`, { ok: l.ok, note: l.note ?? '' }]))); }, [data.lines]);
  const { run, busy } = useAction();
  const places = data.places.filter((p) => p.zone_id === z);
  const itemsFor = (p: Place) => data.items.filter((i) => i.applies_to === (p.category === 'Common_Area' ? 'Floor' : p.category));
  const keys = places.flatMap((p) => itemsFor(p).map((i) => `${p.place}|${i.item_code}`));
  const done = keys.filter((k) => ans[k]).length;
  const faults = keys.filter((k) => ans[k] && !ans[k].ok);
  const set = (k: string, a: Answer) => setAns({ ...ans, [k]: a });
  const allOk = (p: Place) => setAns({ ...ans, ...Object.fromEntries(itemsFor(p).filter((i) => !ans[`${p.place}|${i.item_code}`]).map((i) => [`${p.place}|${i.item_code}`, { ok: true, note: '' }])) });
  const missingNote = faults.some((k) => !ans[k].note.trim());
  const save = () => run(async () => {
    const lines = places.flatMap((p) => itemsFor(p).filter((i) => ans[`${p.place}|${i.item_code}`]).map((i) => { const a = ans[`${p.place}|${i.item_code}`]; return { place: p.place, space_id: p.space_id, item_code: i.item_code, ok: a.ok, note: a.note || undefined }; }));
    const res = await api<{ raised: number }>('/floor/round', { method: 'POST', json: { zone_id: z, date: data.date, lines } });
    onSaved(); toast(res.raised ? `Round saved; ${res.raised} ticket${res.raised > 1 ? 's' : ''} raised` : 'Round saved');
  });
  return (
    <>
      <div className="fl-tabs" role="tablist" aria-label="Floor" style={{ padding: 0 }}>
        {floors.map(([id, name]) => { const ks = data.places.filter((p) => p.zone_id === id).flatMap((p) => itemsFor(p).map((i) => `${p.place}|${i.item_code}`));
          return <button key={id} role="tab" className="fl-tab" aria-selected={z === id} onClick={() => setZone(id)}>{name}<small>{ks.filter((k) => ans[k]).length}/{ks.length}</small></button>; })}
      </div>
      <div className="hbar rc-progress" aria-label={`${done} of ${keys.length} checked`}><i className="b-occ" style={{ width: `${(100 * done) / Math.max(1, keys.length)}%` }} /></div>
      <div className="mt-places">
        {places.map((p) => (
          <section key={p.place} className="box mt-place" aria-label={placeName(p)}>
            <div className="box-head"><h2>{placeName(p)}</h2><span className="grow" />{editable && <button type="button" className="dm-clear" onClick={() => allOk(p)}>All OK</button>}</div>
            {itemsFor(p).map((i) => { const k = `${p.place}|${i.item_code}`; const a = ans[k]; const line = data.lines.find((l) => l.place === p.place && l.item_code === i.item_code);
              return (
                <div key={i.item_code} className="mt-item">
                  <span className="mt-name">{i.item_name}{line?.ticket_id ? <small className="tag tag-warn">Ticket {line.ticket_id}</small> : null}</span>
                  <span className="seg" role="group" aria-label={i.item_name} aria-disabled={!editable}>
                    <button type="button" className="s-p" aria-pressed={a?.ok === true} onClick={() => set(k, { ok: true, note: '' })}>OK</button>
                    <button type="button" className="s-a" aria-pressed={a?.ok === false} onClick={() => set(k, { ok: false, note: a?.note ?? '' })}>Fault</button>
                  </span>
                  {a && !a.ok && <input className="mt-note" placeholder="What is wrong?" value={a.note} onChange={(e) => set(k, { ok: false, note: e.target.value })} aria-label={`What is wrong with ${i.item_name}`} />}
                </div>);
            })}
          </section>))}
      </div>
      {editable && (
        <div className="rc-bar">
          <span><b>{done}</b> of {keys.length} checked{faults.length ? ` · ${faults.length} fault${faults.length > 1 ? 's' : ''}` : ''}</span>
          <button type="button" className="selbar-btn selbar-go" disabled={busy || !done || missingNote} title={missingNote ? 'Say what is wrong for each fault' : undefined} onClick={save}>Save round</button>
        </div>)}
    </>
  );
}

function Tickets({ list, places, editable, onDone }: { list: Ticket[]; places: Place[]; editable: boolean; onDone: () => void }) {
  const [raise, setRaise] = useState(false);
  const [sel, setSel] = useState<Ticket | null>(null);
  const groups: [string, Ticket[]][] = [
    ['Repaired, to confirm', list.filter((x) => x.status === 'Resolved')],
    ['Open', list.filter((x) => ['Open', 'Assigned', 'In_Progress', 'Reopened'].includes(x.status))],
    ['Closed this week', list.filter((x) => x.status === 'Closed')],
  ];
  return (
    <>
      {editable && <div><Button variant="primary" icon="plus" onClick={() => setRaise(true)}>Raise a ticket</Button></div>}
      {groups.map(([title, rows]) => rows.length > 0 && (
        <section key={title} className="box"><div className="box-head"><h2>{title}</h2><span className="grow" /><span className="dm-count">{rows.length}</span></div>
          <div className="q">{rows.map((x) => (
            <button key={x.ticket_id} type="button" className="q-row" onClick={() => setSel(x)}>
              <span className="q-av" style={{ borderRadius: 10 }}><Icon name={x.category_id === 'ELEC' ? 'bolt' : x.category_id === 'FIRE' ? 'alert' : x.category_id === 'PLUMB' ? 'door' : 'settings'} size={15} /></span>
              <span className="q-text"><b>{x.description}</b><span>#{x.ticket_id} · {x.category_name} · {x.space_code ? `${x.space_category === 'Toilet_Block' ? 'washroom' : 'room'} ${x.space_code}` : 'floor'} · {formatDateTime(x.raised_date)}</span></span>
              <span className="klh-row" style={{ gap: 4 }}>{x.late && <span className="tag tag-bad">Late</span>}<span className={`tag ${PRIO[x.priority]}`}>{x.priority}</span></span>
            </button>))}</div></section>))}
      {!list.length && <div className="q-empty">No repairs on your floors.</div>}
      {raise && <RaisePanel places={places} onClose={() => setRaise(false)} onDone={() => { setRaise(false); onDone(); }} />}
      {sel && <TicketPanel t={sel} editable={editable} onClose={() => setSel(null)} onDone={() => { setSel(null); onDone(); }} />}
    </>
  );
}

function RaisePanel({ places, onClose, onDone }: { places: Place[]; onClose: () => void; onDone: () => void }) {
  const cats = useApi<{ category_id: string; category_name: string; default_sla_hours: number }[]>('/tickets/categories');
  const [f, setF] = useState({ space_id: '', category_id: '', description: '', priority: 'Medium' });
  const { run, busy } = useAction();
  return (
    <Drawer open onClose={onClose} title="Raise a ticket" subtitle="Goes to the maintenance team of that trade with its deadline"
      footer={<Button variant="primary" loading={busy} blockedReason={!f.space_id ? 'Choose the place.' : !f.category_id ? 'Choose the trade.' : f.description.length < 5 ? 'Describe the fault.' : undefined}
        onClick={() => run(() => api('/tickets', { method: 'POST', json: f }).then(onDone), 'Ticket raised')}>Raise ticket</Button>}>
      <div className="klh-stack" style={{ gap: 14 }}>
        <Field label="Place" required><Select value={f.space_id} onChange={(e) => setF({ ...f, space_id: e.target.value })} options={[{ value: '', label: 'Choose' }, ...places.filter((p) => p.space_id).map((p) => ({ value: p.space_id!, label: `${p.zone_name} · ${placeName(p)}` }))]} /></Field>
        <Field label="Trade" required><Select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} options={[{ value: '', label: 'Choose' }, ...(cats.data ?? []).map((c) => ({ value: c.category_id, label: `${c.category_name} (within ${c.default_sla_hours} h)` }))]} /></Field>
        <Field label="Priority"><Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} options={['Low', 'Medium', 'High', 'Critical']} /></Field>
        <Field label="What is wrong" required><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      </div>
    </Drawer>
  );
}

function TicketPanel({ t, editable, onClose, onDone }: { t: Ticket; editable: boolean; onClose: () => void; onDone: () => void }) {
  const s = useSession()!;
  const { run, busy } = useAction();
  const [back, setBack] = useState(false);
  const own = t.raised_by === s.id;
  return (
    <>
      <Drawer open onClose={onClose} title={`Ticket ${t.ticket_id}`} subtitle={`${t.category_name} · ${t.priority}`}
        footer={editable && t.status === 'Resolved' ? <div className="klh-row"><Button variant="primary" icon="check" loading={busy} onClick={() => run(() => api(`/tickets/${t.ticket_id}/confirm`, { method: 'POST', json: { fixed: true } }).then(onDone), 'Repair confirmed; ticket closed')}>Repair is done</Button><Button variant="secondary" onClick={() => setBack(true)}>Not fixed</Button></div> : undefined}>
        <div className="klh-stack" style={{ gap: 12 }}>
          <p style={{ margin: 0, fontSize: 15 }}>{t.description}</p>
          <div className="facts">
            <div><span>Place</span><b>{t.space_code ?? t.zone_name ?? 'Floor'}</b></div><div><span>Status</span><b>{words(t.status)}</b></div>
            <div><span>Raised by</span><b>{titleCase(t.raised_by_name)}</b></div><div><span>Due</span><b>{t.deadline_at ? formatDateTime(t.deadline_at) : '—'}</b></div>
          </div>
          {t.resolution_notes && <p className="klh-muted" style={{ margin: 0 }}>Repair: {t.resolution_notes}{t.resolved_date ? ` (${formatDateTime(t.resolved_date)})` : ''}</p>}
          {own && t.status === 'Resolved' && <p className="klh-muted" style={{ margin: 0 }}>You raised this ticket. Confirming your own ticket is allowed for floor rounds; the Warden reviews closures.</p>}
        </div>
      </Drawer>
      <ConfirmDialog open={back} title="Send the ticket back?" body="It reopens for the same team with your note." confirmLabel="Reopen" tone="danger" requireRemarks remarksLabel="What is still wrong?" onCancel={() => setBack(false)}
        onConfirm={(note) => { setBack(false); run(() => api(`/tickets/${t.ticket_id}/confirm`, { method: 'POST', json: { fixed: false, note } }).then(onDone), 'Ticket reopened'); }} />
    </>
  );
}
