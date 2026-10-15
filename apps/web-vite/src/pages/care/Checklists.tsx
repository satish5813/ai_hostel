import { useState } from 'react';
import { ClipboardCheck, Wrench } from 'lucide-react';
import { Button, Drawer, Field, Input, SegmentedControl, Select, StatCard, Textarea } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi, words } from '@/lib/ui';

type Fill = { template_id: number; template_name: string; frequency: string; scope: string; answer_type: string; reviewer_role: string; items: number; last_done: string | null };
type Sub = { submission_id: number; template_name: string; scope: string; facility_id: string; hostel_name: string | null; zone_name: string | null; period_date: string; shift: string | null;
  overall_status: string; status: string; submitted_at: string; submitted_by_name: string | null; reviewed_by_name: string | null; reviewed_at: string | null; review_remarks: string | null;
  fails: number; tickets: number; can_review: boolean };
type Template = { template_id: number; template_name: string; scope: string; answer_type: string; reviewer_role: string;
  items: { item_no: number; section: string | null; item_text: string; category_id: string | null; ticket_on_fail: boolean }[]; places: { facility_id: string; zone_id: string | null; label: string }[] };
type Detail = Sub & { answers: { item_no: number; section: string | null; item_text: string; answer: string; remarks: string | null; ticket_id: number | null; ticket_status: string | null }[] };
const ANSWERS: Record<string, [string, string]> = { Yes_No: ['Yes', 'No'], OK_NotOK: ['OK', 'Not_OK'], GYRC: ['Green', 'Red'] };
const STATUS: Record<string, { label: string; tone: string }> = { Satisfactory: { label: 'Satisfactory', tone: 'good' }, Minor_Corrections: { label: 'Minor corrections', tone: 'warn' },
  Needs_Attention: { label: 'Needs attention', tone: 'warn' }, Urgent_Action: { label: 'Urgent action', tone: 'bad' } };
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
const todayIso = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/**
 * TKT-05 Checklists. Staff fill the daily or weekly checklist of their role (floor check, mess kitchen hygiene, store);
 * a failed item with a trade opens a repair ticket at once; the reviewer (Chief Manager, Rasoi In-charge) signs it.
 */
export default function Checklists() {
  const r = useApi<{ fill: Fill[]; submissions: Sub[] }>('/checklists');
  const [show, setShow] = useState<'review' | 'all'>('review');
  const [filling, setFilling] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const d = r.data;
  const toReview = (d?.submissions ?? []).filter((s) => s.can_review && s.status === 'Submitted');
  const list = show === 'review' ? toReview : d?.submissions ?? [];
  return (
    <div className="klh-stack mo" style={{ gap: 16 }}>
      <ScreenHeader code="TKT-05" subtitle="Fill your daily and weekly checklists; a failed item opens a repair ticket. Reviewers sign what was submitted." />
      {d && d.fill.length > 0 && (
        <section className="mo-fill">{d.fill.map((t) => { const done = t.last_done && t.last_done.slice(0, 10) === todayIso(); return (
          <button key={t.template_id} type="button" className="box" onClick={() => setFilling(t.template_id)}>
            <ClipboardCheck size={20} /><b>{t.template_name}</b><small>{t.frequency} · {t.items} items · {done ? 'done today' : `last ${day(t.last_done)}`}</small>
            <span className={`xd-pill xd-t-${done ? 'good' : 'warn'}`}>{done ? 'Done' : 'Fill now'}</span>
          </button>); })}</section>)}
      {d && (
        <div className="klh-grid-4">
          <StatCard color="amber" icon="eye" label="To review" value={String(toReview.length)} sub="Waiting for your signature" />
          <StatCard color="rose" icon="alert" label="Needing attention" value={String(d.submissions.filter((s) => ['Needs_Attention', 'Urgent_Action'].includes(s.overall_status)).length)} sub="Of the recent checklists" />
          <StatCard color="indigo" icon="settings" label="Tickets opened" value={String(d.submissions.reduce((a, s) => a + s.tickets, 0))} sub="From failed items" />
          <StatCard color="brand" icon="check" label="Signed" value={String(d.submissions.filter((s) => s.status === 'Reviewed').length)} sub="Of the recent checklists" />
        </div>)}
      <section className="box rd-bar"><SegmentedControl label="Show" value={show} onChange={(v) => setShow(v as typeof show)} options={[{ value: 'review', label: 'To review' }, { value: 'all', label: 'All recent' }]} /></section>
      {d && !list.length && <div className="box mm-empty"><b>Nothing here</b><p>{show === 'review' ? 'No checklist is waiting for your signature.' : 'No checklist yet.'}</p></div>}
      <div className="mo-list">{list.map((s) => { const st = STATUS[s.overall_status]; return (
        <button key={s.submission_id} type="button" className="box mo-card" onClick={() => setOpen(s.submission_id)}>
          <span className="mo-when"><b>{day(s.period_date)}</b><small>{s.shift ?? ''}</small></span>
          <span className="mo-text"><b>{s.template_name}</b> · {s.hostel_name}{s.zone_name ? ` · ${s.zone_name}` : ''}
            <small>{s.submitted_by_name} · {s.fails ? `${s.fails} item${s.fails === 1 ? '' : 's'} failed` : 'all items passed'}{s.tickets ? ` · ${s.tickets} ticket${s.tickets === 1 ? '' : 's'}` : ''}{s.status === 'Reviewed' ? ` · signed by ${s.reviewed_by_name}` : ''}</small></span>
          <span className={`xd-pill xd-t-${st?.tone ?? 'warn'}`}>{st?.label ?? s.overall_status}</span>
        </button>); })}</div>
      {filling && <FillDrawer id={filling} onClose={() => setFilling(null)} onDone={() => { setFilling(null); r.mutate(); }} />}
      {open && <ReviewDrawer id={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); r.mutate(); }} />}
    </div>
  );
}

function FillDrawer({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: () => void }) {
  const t = useApi<Template>(`/checklists/templates/${id}`);
  const [place, setPlace] = useState('');
  const [date, setDate] = useState(todayIso());
  const [ans, setAns] = useState<Record<number, { answer: string; remarks: string }>>({});
  const [busy, setBusy] = useState(false);
  const d = t.data;
  if (!d) return <Drawer open onClose={onClose} title="Checklist"><p className="q-empty">Loading…</p></Drawer>;
  const [pass, fail] = ANSWERS[d.answer_type] ?? ['OK', 'Not_OK'];
  const pl = d.places.find((p) => `${p.facility_id}|${p.zone_id ?? ''}` === place) ?? (d.places.length === 1 ? d.places[0] : undefined);
  const missing = d.items.find((i) => !ans[i.item_no]);
  const noNote = d.items.find((i) => ans[i.item_no]?.answer === fail && !ans[i.item_no].remarks.trim());
  const save = async () => {
    setBusy(true);
    try {
      const x = await api<{ overall_status: string; tickets: number }>('/checklists/submissions', { method: 'POST', json: { template_id: id, facility_id: pl!.facility_id, zone_id: pl!.zone_id, period_date: date,
        answers: d.items.map((i) => ({ item_no: i.item_no, answer: ans[i.item_no].answer, remarks: ans[i.item_no].remarks || null })) } });
      toast(`Submitted: ${STATUS[x.overall_status]?.label ?? x.overall_status}${x.tickets ? `; ${x.tickets} repair ticket${x.tickets === 1 ? '' : 's'} opened` : ''}`); onDone();
    } catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const sections = [...new Set(d.items.map((i) => i.section ?? ''))];
  return (
    <Drawer open onClose={onClose} title={d.template_name} subtitle={`${d.items.length} items · signed by the ${words(d.reviewer_role)}`}
      footer={<Button variant="primary" icon="check" loading={busy} blockedReason={!pl ? 'Choose where.' : missing ? `Answer item ${missing.item_no}.` : noNote ? `Item ${noNote.item_no}: say what is wrong.` : undefined} onClick={save}>Submit</Button>}>
      <div className="klh-stack" style={{ gap: 12 }}>
        <div className="mo-row">
          {d.places.length > 1 ? <Field label="Where"><Select value={place} onChange={(e) => setPlace(e.target.value)} options={[{ value: '', label: 'Choose…' }, ...d.places.map((p) => ({ value: `${p.facility_id}|${p.zone_id ?? ''}`, label: p.label }))]} /></Field>
            : <Field label="Where"><Input value={d.places[0]?.label ?? 'No place assigned to you'} disabled /></Field>}
          <Field label="Day"><Input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        {sections.map((sec) => (
          <section key={sec} className="mo-ck"><h4>{sec}</h4>
            {d.items.filter((i) => (i.section ?? '') === sec).map((i) => { const a = ans[i.item_no]; return (
              <div key={i.item_no} className={`mo-ck-item ${a?.answer === fail ? 'mo-ck-fail' : ''}`}>
                <span><b>{i.item_no}.</b> {i.item_text}{i.ticket_on_fail && <small><Wrench size={12} /> opens a {i.category_id} ticket if not OK</small>}</span>
                <span className="mo-ck-btns" role="group" aria-label={`Item ${i.item_no}`}>
                  {[pass, fail].map((v) => <button key={v} type="button" aria-pressed={a?.answer === v} onClick={() => setAns({ ...ans, [i.item_no]: { answer: v, remarks: a?.remarks ?? '' } })}>{v.replace('_', ' ')}</button>)}</span>
                {a?.answer === fail && <Textarea rows={1} value={a.remarks} onChange={(e) => setAns({ ...ans, [i.item_no]: { ...a, remarks: e.target.value } })} placeholder="What is wrong, and where" />}
              </div>); })}
          </section>))}
      </div>
    </Drawer>
  );
}

function ReviewDrawer({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: () => void }) {
  const r = useApi<Detail>(`/checklists/submissions/${id}`);
  const [status, setStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const d = r.data;
  const sign = async () => {
    setBusy(true);
    try { await api(`/checklists/submissions/${id}/review`, { method: 'POST', json: { overall_status: status || d!.overall_status, remarks: remarks || null } }); toast('Signed'); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <Drawer open onClose={onClose} title={d ? d.template_name : 'Checklist'} subtitle={d ? `${d.hostel_name ?? ''}${d.zone_name ? ` · ${d.zone_name}` : ''} · ${day(d.period_date)} · ${d.submitted_by_name}` : ''}
      footer={d?.can_review && d.status === 'Submitted' ? <Button variant="primary" icon="check" loading={busy} onClick={sign}>Sign</Button> : undefined}>
      {!d ? <p className="q-empty">Loading…</p> : (
        <div className="klh-stack" style={{ gap: 12 }}>
          <ol className="mo-answers">{d.answers.map((a) => { const failed = ['No', 'Not_OK', 'Red'].includes(a.answer); return (
            <li key={a.item_no} className={failed ? 'mo-ck-fail' : ''}><span>{a.item_text}{a.remarks && <small>“{a.remarks}”</small>}{a.ticket_id && <small><Wrench size={12} /> Ticket {a.ticket_id} · {a.ticket_status?.replace('_', ' ')}</small>}</span>
              <b>{a.answer.replace('_', ' ')}</b></li>); })}</ol>
          {d.status === 'Reviewed' ? <p className="mo-muted">Signed by {d.reviewed_by_name} on {day(d.reviewed_at)}{d.review_remarks ? `: “${d.review_remarks}”` : ''}</p>
            : d.can_review && <>
              <Field label="Overall"><Select value={status || d.overall_status} onChange={(e) => setStatus(e.target.value)} options={Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))} /></Field>
              <Field label="Remarks"><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field></>}
        </div>)}
    </Drawer>
  );
}
