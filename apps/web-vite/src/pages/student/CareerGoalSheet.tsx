import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Button, Field, Input } from '@/lib/klh';
import { api } from '@/lib/api';
import { useAction, useApi } from '@/lib/ui';
import { Sheet } from './Sheet';

export const GOALS: { value: string; label: string; sub: string }[] = [
  { value: 'Placement_Product', label: 'Placement, product company', sub: 'Software roles at product firms' },
  { value: 'Placement_Services', label: 'Placement, IT services', sub: 'Service and consulting firms' },
  { value: 'Higher_Studies', label: 'Higher studies', sub: 'MS abroad, M.Tech through GATE, MBA' },
  { value: 'Govt_Exams', label: 'Government exams', sub: 'Civil services, PSUs, banking' },
  { value: 'Entrepreneurship', label: 'My own start-up', sub: 'Build a product or business' },
  { value: 'Core_Other', label: 'Core or another field', sub: 'Outside software' },
  { value: 'Undecided', label: 'Not decided yet', sub: 'A counsellor can help you choose' },
];
export type Goal = { goal: string; notes: string | null; stated_on: string } | null;
export const useCareerGoal = () => useApi<Goal>('/me/career-goal');

/** The student says what they are working towards; the hostel's career guidance reads their record against it. */
export function CareerGoalSheet({ goal, onClose, onDone }: { goal: Goal; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState(goal?.goal ?? '');
  const [notes, setNotes] = useState(goal?.notes ?? '');
  const { run, busy } = useAction();
  return (
    <Sheet mod="indigo" icon={GraduationCap} title="My career goal" sub="What are you working towards after your degree?" onClose={onClose}
      footer={<Button variant="primary" loading={busy} blockedReason={!v ? 'Choose one.' : v === goal?.goal && notes === (goal?.notes ?? '') ? 'Nothing changed.' : undefined}
        onClick={() => run(() => api('/me/career-goal', { method: 'POST', json: { goal: v, notes: notes.trim() || null } }).then(() => { onDone(); onClose(); }), 'Career goal saved')}>Save my goal</Button>}>
      <div className="st-stack">
        <div className="st-choices" role="radiogroup" aria-label="Career goal">
          {GOALS.map((g) => (
            <button key={g.value} type="button" role="radio" aria-checked={v === g.value} className="st-choice" onClick={() => setV(g.value)}>
              <span className="st-line-tx"><b>{g.label}</b><small>{g.sub}</small></span><i className="st-choice-dot" />
            </button>))}
        </div>
        <Field label="Anything to add" hint="For example: the company, the exam, the country"><Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} /></Field>
        <p className="st-note"><GraduationCap size={14} />The Dean's office uses this to offer the right guidance: placement training, a faculty mentor or counselling. You can change it any time.</p>
      </div>
    </Sheet>
  );
}
