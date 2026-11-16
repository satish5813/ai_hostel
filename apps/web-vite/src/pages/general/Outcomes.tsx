/** A final-year outcome as the student and exec APIs return it (acad.career_outcome, migration 109). */
export type Outcome = { outcome_type: string; stage: string; stage_label: string; is_success: boolean; organisation: string; detail: string | null; ctc_lpa: number | null; stage_on: string };

const KIND: Record<string, string> = { Placement: 'Placement', Higher_Studies: 'Higher studies', Competitive_Exam: 'Competitive exam', Entrepreneurship: 'Venture' };
const day = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const lpa = (v: number) => `${v % 1 ? v.toFixed(2).replace(/0$/, '') : v} LPA`;

/** The best placement offer (highest package among the successful ones), for headline tiles. */
export function bestOffer(list: Outcome[]) {
  return list.filter((o) => o.outcome_type === 'Placement' && o.is_success).sort((a, b) => (b.ctc_lpa ?? 0) - (a.ctc_lpa ?? 0))[0];
}

/**
 * Placements, admissions, exams and ventures: one row each, the best offer marked. Used on the student page
 * (ACA-01) and the dashboard student card (EXE-01).
 */
export function OutcomeList({ list }: { list: Outcome[] }) {
  if (!list.length) return <p className="oc-none">No placement or other outcome recorded yet.</p>;
  const best = bestOffer(list);
  return (
    <ul className="oc-list">
      {list.map((o, i) => (
        <li key={`${o.organisation}-${i}`} className={o === best ? 'oc-best' : undefined}>
          <span className="oc-logo" aria-hidden="true">{o.organisation.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·'}</span>
          <span className="oc-tx"><b>{o.organisation}</b>
            <small>{KIND[o.outcome_type] ?? o.outcome_type} · {o.stage_label}{o.detail ? ` · ${o.detail}` : ''} · {day(o.stage_on)}</small></span>
          <span className="oc-v">{o.ctc_lpa != null ? lpa(o.ctc_lpa) : o.is_success ? 'Offer' : '—'}{o === best && <em>Best offer</em>}</span>
        </li>))}
    </ul>
  );
}
