import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeftRight, Bell, MessageSquareWarning, ShieldCheck, BedDouble, ChefHat, ChevronsLeft, ChevronsRight, DoorOpen, GraduationCap, HeartPulse, Home, LogOut, Menu, Receipt, Star, UserRound, Utensils, Wrench, X, Zap, type LucideIcon } from 'lucide-react';
import { setSession } from '@/lib/api';
import { useApi, useProfile, useSession } from '@/lib/ui';
import { Logo } from '@/ui/kit';
import type { Screen } from './screens';

/** How the student's screens are named and grouped in the side menu; a route not listed here goes under "More". */
const ITEM: Record<string, { label: string; icon: LucideIcon; group: string }> = {
  '/home': { label: 'Home', icon: Home, group: '' },
  '/registration': { label: 'Room and registration', icon: BedDouble, group: 'My stay' },
  '/change-room': { label: 'Change room', icon: ArrowLeftRight, group: 'My stay' },
  '/fees': { label: 'Fees and receipts', icon: Receipt, group: 'My stay' },
  '/electricity': { label: 'Electricity', icon: Zap, group: 'My stay' },
  '/my-deposit': { label: 'Caution deposit', icon: ShieldCheck, group: 'My stay' },
  '/my-tickets': { label: 'Repairs', icon: Wrench, group: 'My stay' },
  '/mess-menu': { label: 'Mess menu', icon: Utensils, group: 'Mess' },
  '/my-meals': { label: 'Choose my meals', icon: ChefHat, group: 'Mess' },
  '/rate-meals': { label: 'Rate my meals', icon: Star, group: 'Mess' },
  '/outings': { label: 'Outings', icon: DoorOpen, group: 'Daily life' },
  '/sick-leave': { label: 'Sick leave', icon: HeartPulse, group: 'Daily life' },
  '/complaints': { label: 'Complaints', icon: MessageSquareWarning, group: 'Daily life' },
  '/academics': { label: 'Academic record', icon: GraduationCap, group: 'Me' },
  '/my-health': { label: 'My health', icon: HeartPulse, group: 'Me' },
  '/notifications': { label: 'Notifications', icon: Bell, group: 'Me' },
  '/profile': { label: 'Profile', icon: UserRound, group: 'Me' },
};
const GROUPS = ['', 'My stay', 'Mess', 'Daily life', 'Me', 'More'];
/** Phones: four places at hand, and Menu opens everything else. */
const BOTTOM = ['/home', '/outings', '/fees', '/my-tickets'];
const COLLAPSE_KEY = 'klu.student.nav.collapsed';

/**
 * The student frame: a side menu grouped by what the student is doing (their stay, the mess, daily life, themselves),
 * which folds to icons on a desktop; on a phone a bottom bar with four places and Menu, which opens the same side menu.
 * The items are the screens the student's role may open (screens.ts); nothing is shown that cannot be used.
 */
export function StudentShell({ screens, unread, children, extra }: { screens: Screen[]; unread: number; children: ReactNode; extra?: ReactNode }) {
  const s = useSession()!;
  const p = useProfile();
  const room = useApi<{ bed_label: string } | null>('/me/room');
  const me = useApi<{ full_name: string; photo: string | null }>(`/students/${s.id}`);
  const navigate = useNavigate();
  const { pathname: path } = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, []);
  const fold = () => { const v = !collapsed; setCollapsed(v); try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch { /* private window */ } };
  const signOut = () => { setSession(null); location.href = '/'; };

  const routes = ['/home', ...screens.map((x) => x.route!).filter((r, i, all) => all.indexOf(r) === i)];
  const items = routes.map((r) => ({ route: r, ...(ITEM[r] ?? { label: screens.find((x) => x.route === r)?.name ?? r, icon: Home, group: 'More' }) }));
  const active = (r: string) => path === r || (r !== '/home' && path.startsWith(`${r}/`));
  const name = (me.data?.full_name ?? p.data?.student_name ?? s.id).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const nav = (
    <nav className="sn-nav" aria-label="Student menu">
      {GROUPS.map((g) => {
        const list = items.filter((i) => i.group === g);
        if (!list.length) return null;
        return (
          <div key={g || 'top'} className="sn-group">
            {g && <span className="sn-head">{g}</span>}
            {list.map((i) => (
              <button key={i.route} type="button" className="sn-item" aria-current={active(i.route) ? 'page' : undefined} title={collapsed ? i.label : undefined} onClick={() => navigate(i.route)}>
                <i.icon size={18} aria-hidden="true" /><span className="sn-label">{i.label}</span>
                {i.route === '/notifications' && unread > 0 && <b className="sn-badge" aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</b>}
              </button>))}
          </div>);
      })}
    </nav>
  );

  return (
    <div className={`klh klh-comfortable sn${collapsed ? ' sn-folded' : ''}${open ? ' sn-open' : ''}`}>
      <aside className="sn-side" aria-label="Menu">
        <div className="sn-top">
          <button type="button" className="sn-brand" onClick={() => navigate('/home')} aria-label="Home"><Logo cut="mark" height={30} /><span className="sn-label"><b>KL Residencies</b><small>Student</small></span></button>
          <button type="button" className="sn-icon sn-only-phone" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <button type="button" className="sn-me" onClick={() => navigate('/profile')} title={collapsed ? name : undefined}>
          <span className="sn-avatar" aria-hidden="true">{me.data?.photo ? <img src={me.data.photo} alt="" /> : initials}</span>
          <span className="sn-label"><b>{name}</b><small>{room.data?.bed_label ?? s.id}</small></span>
        </button>
        {nav}
        <div className="sn-foot">
          <button type="button" className="sn-item sn-only-desk" onClick={fold} aria-label={collapsed ? 'Show the menu names' : 'Fold the menu to icons'}>
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}<span className="sn-label">Fold menu</span></button>
          <button type="button" className="sn-item" onClick={signOut} title={collapsed ? 'Sign out' : undefined}><LogOut size={18} /><span className="sn-label">Sign out</span></button>
        </div>
      </aside>
      {open && <div className="sn-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="sn-body">
        <header className="sn-bar sn-only-phone">
          <button type="button" className="sn-icon" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button>
          <button type="button" className="sn-brand" onClick={() => navigate('/home')}><Logo cut="mark" height={26} /><b>KL Residencies</b></button>
          <button type="button" className="sn-icon sn-bell" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => navigate('/notifications')}>
            <Bell size={19} />{unread > 0 && <i aria-hidden="true" />}</button>
        </header>
        <main className="klh-student sn-main">{children}</main>
      </div>
      {extra}

      <nav className="sn-bottom sn-only-phone" aria-label="Quick menu">
        {BOTTOM.filter((r) => routes.includes(r)).map((r) => { const i = ITEM[r]; return (
          <button key={r} type="button" aria-current={active(r) ? 'page' : undefined} onClick={() => navigate(r)}><i.icon size={20} /><span>{i.label === 'Fees and receipts' ? 'Fees' : i.label}</span></button>); })}
        <button type="button" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /><span>Menu</span>{unread > 0 && <i className="sn-dot" aria-hidden="true" />}</button>
      </nav>
    </div>
  );
}
