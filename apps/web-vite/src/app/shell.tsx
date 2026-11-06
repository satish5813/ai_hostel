import { Link, useLocation, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { BottomNav, Button, type T } from '@/lib/klh';
import { setSession } from '@/lib/api';
import { ToastHost, useApi, useProfile, useSession, words } from '@/lib/ui';
import { MODULE, menuFor, roleDef, screenByRoute, screensFor, type Screen } from './screens';
import { Logo } from '@/ui/kit';
import { AppsShell } from './apps-shell';
import { OutingFab } from '@/pages/student/OutingLauncher';
import { StudentShell } from './student-shell';
import { DATA_KINDS } from '@/admin/registry';

/**
 * One frame per audience (design-system README, "Spacing and layout"):
 *   staff        -> AppShell: sidebar grouped by workflow letter, built from the role's screens (Roles document)
 *   student        -> StudentShell: side menu grouped by what the student does; on phones a bottom bar and the menu as a drawer
 *   parent         -> top navigation on desktop, BottomNav (at most five items) on phones
 *   security gate  -> full-screen kiosk, no frame
 * A person never sees a menu item they cannot use: the menu is derived from screens.ts, not typed per page.
 */
export function Brand({ cut = 'mark', height = 30 }: { cut?: 'mark' | 'full'; height?: number }) {
  return <span className="ui-brand"><Logo cut={cut} height={height} /><span className="ui-brand-name">Residencies</span></span>;
}

/** Menu label from a screen name: "My profile and contacts" -> "Profile", "My outings" -> "Outings". */
const SHORT: Record<string, string> = { 'My profile and contacts': 'Profile', 'Fees and receipts': 'Fees', 'Hostel registration': 'Registration', 'Parent recommendation': 'Recommend', 'Student academic page': 'My record' };
const label = (name: string) => { const n = SHORT[name] ?? name.replace(/^My /, ''); return n.charAt(0).toUpperCase() + n.slice(1); };

/**
 * On phones a table becomes a stack of cards: each cell is labelled with its column heading.
 * The bundle's DataTable does not label cells, so the labels are copied from the header once the table renders.
 */
function useTableLabels(dep: string) {
  useEffect(() => {
    const label = () => document.querySelectorAll('table.klh-table').forEach((t) => {
      const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent?.trim() ?? '');
      t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => { if (heads[i] && td.getAttribute('data-label') !== heads[i]) td.setAttribute('data-label', heads[i]); }));
    });
    label();
    const mo = new MutationObserver(label);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [dep]);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const s = useSession();
  const { pathname: path } = useLocation();
  useTableLabels(path);
  const navigate = useNavigate();
  const profile = useProfile();
  const inbox = useApi<unknown[]>(s && s.kind === 'staff' ? '/approvals/inbox' : null);
  const notes = useApi<{ delivery_status: string }[]>(s ? '/notifications' : null);
  // the executive dashboard draws its own top bar and has no menu
  if (path === '/' || path === '/set-password' || path === '/register' || path === '/app' || path.startsWith('/qr/') || path.startsWith('/a/') || path === '/exec' || path.startsWith('/exec/') || !s) return <><main>{children}</main><ToastHost /></>;
  const signOut = () => { setSession(null); location.href = '/'; };
  if (path === '/gate') return <><main>{children}</main><ToastHost /></>;

  const def = roleDef(s.role);
  const screens = screensFor(s.role);
  const unread = notes.data?.filter((n) => n.delivery_status !== 'Read').length ?? 0;
  const home: Screen = { code: 'HOME', name: 'Home', purpose: '', workflow: 'All', route: '/home', icon: 'home' };

  if (s.kind === 'student') {
    return (
      <>
        <StudentShell screens={screens} unread={unread}
          extra={!['/home', '/outings'].includes(path) ? <OutingFab /> : undefined /* ask for an outing from any page */}>{children}</StudentShell>
        <ToastHost />
      </>
    );
  }

  if (s.kind !== 'staff') {
    const items = [home, ...screens.filter((x) => x.code !== 'GEN-02')];
    const bottom = items.slice(0, 5);
    return (
      <div className="klh klh-comfortable">
        <nav className="klh-topnav hidden xl:block"><div className="klh-topnav-inner"><Brand />{items.map((i) => <Link key={i.route} to={i.route!} aria-current={path === i.route ? 'page' : undefined}>{label(i.name)}</Link>)}<span style={{ flex: 1 }} />
          <Link to="/notifications" aria-current={path === '/notifications' ? 'page' : undefined} aria-label="Notifications">Notifications{unread ? ` (${unread})` : ''}</Link>
          <span className="klh-muted" style={{ fontSize: 13 }}>{s.id}</span><Button variant="ghost" size="sm" icon="logout" onClick={signOut}>Sign out</Button></div></nav>
        <main className="klh-student">{children}</main>
        <div className="klh-bottomnav-fixed xl:hidden"><BottomNav items={bottom.map((i) => ({ label: label(i.name), icon: i.icon, active: path === i.route, badge: i.route === '/notifications' && unread ? unread : undefined, onClick: () => navigate(i.route!) }))} /></div>
        <ToastHost />
      </div>
    );
  }

  return (
    <>
      <AppsShell role={s.role} fill={path.startsWith('/admin/data/') || path === '/admin/db' || path.startsWith('/mapping/data/')} user={{ name: profile.data?.full_name ?? s.id, role: def?.name.split(' (')[0] ?? words(s.role) }} unread={unread}>
        {children}
      </AppsShell>
      <ToastHost />
    </>
  );
}
