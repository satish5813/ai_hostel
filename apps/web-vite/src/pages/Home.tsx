import { useNavigate } from 'react-router';
import StudentHome from './student/StudentHome';
import { Button, Card, HeroHeader, Notice, StatCard, StatusChip, Stepper, formatDate, formatDateTime, formatINR } from '@/lib/klh';
import { ScreenLinks } from '@/ui/kit';
import { MODULE, menuFor, roleDef, screensFor } from '@/app/screens';
import { bedLabel, greeting, roomLabel, titleCase, today, useApi, useProfile, useSession } from '@/lib/ui';

type Reg = { registration_id: number; registration_no: string; hostel_code: string; status: string; applied_on: string; subspace_id: string | null; student_decision: string | null; hold_until: string | null; allocation_date: string | null; waitlist_no: number | null };
type Demand = { demand_id: number; amount_due: string; amount_paid: string; due_date: string; status: string };
type Me = { full_name: string; programme: string; contacts: { is_verified: boolean }[]; stay: { space_id: string; subspace_id: string } | null };

const STAGE = (r?: Reg) => !r ? 0 : r.status === 'Applied' ? 1 : ['Fee_Paid', 'Waitlisted'].includes(r.status) ? 2 : r.status === 'Allotted' ? 3 : r.status === 'Accepted' ? 4 : r.status === 'Confirmed' ? 5 : 6;

/** Landing page. Students: hero, stage tracker and the module grid of their screens. Staff: hero, counts and the ModuleLauncher built from the role. */
export default function Home() {
  const s = useSession();
  if (!s) return null;
  return s.kind === 'student' ? <StudentHome /> : s.kind === 'parent' ? <ParentHome /> : null; // staff: the apps launcher is drawn by the frame (app/apps-shell.tsx)
}

function Launcher() {
  const s = useSession()!;
  const navigate = useNavigate();
  const inbox = useApi<unknown[]>(s.kind === 'staff' ? '/approvals/inbox' : null);
  const items = screensFor(s.role).filter((x) => x.route !== '/profile').map((x) => ({ code: x.code, name: x.name, icon: x.icon, color: MODULE[x.workflow].color, badge: x.code === 'GEN-03' ? inbox.data?.length || undefined : undefined, onClick: () => navigate(x.route!) }));
  return <ScreenLinks items={items} />;
}

function ParentHome() {
  const navigate = useNavigate();
  const p = useProfile();
  const inbox = useApi<unknown[]>('/approvals/inbox');
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <HeroHeader eyebrow={today()} title={p.data?.contact_name ? `${greeting()}, ${p.data.contact_name}` : 'Welcome'} subtitle={p.data?.student_name ? `You are the ${(p.data as { relation?: string }).relation?.toLowerCase() ?? 'guardian'} of ${titleCase(p.data.student_name)}. Your recommendation goes to the Floor Manager and Chief Manager.` : 'Your recommendation goes to the Floor Manager and Chief Manager.'}
        actions={[inbox.data?.length ? <Button key="a" variant="accent" pill icon="door" onClick={() => navigate('/parent-recommendation')}>Recommend {inbox.data.length} outing{inbox.data.length > 1 ? 's' : ''}</Button> : null]}
        stats={[{ value: String(inbox.data?.length ?? 0), label: 'Waiting for you', gold: !!inbox.data?.length }]} />
      <Launcher />
    </div>
  );
}

