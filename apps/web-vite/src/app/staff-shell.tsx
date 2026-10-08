import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Icon, type T } from '@/lib/klh';
import { setSession } from '@/lib/api';
import { Logo, initials } from '@/ui/kit';
import { MODULE, type Screen } from './screens';

export type NavGroup = { heading: string; items: { label: string; icon: T.IconName; route: string; badge?: number }[] };

/**
 * Staff frame. Desktop (1024 px and wider): fixed sidebar. Below that: the sidebar slides in from a menu button.
 * Every control in the top bar does something: "Go to a screen" (Ctrl K) searches the screens of this role,
 * the bell opens Notifications, the profile menu holds My profile, Screen map and Sign out.
 */
export function StaffShell({ nav, screens, user, unread, title, crumb, fill, children }: {
  fill?: boolean; nav: NavGroup[]; screens: Screen[]; user: { name: string; role: string }; unread: number; title?: string; crumb?: string; children: ReactNode;
}) {
  const { pathname: path, search } = useLocation();
  const here = (route: string) => (route.includes('?') ? `${path}${search}` === route : path === route && !(route === '/admin/masters' && search));
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [finder, setFinder] = useState(false);
  const [profile, setProfile] = useState(false);
  useEffect(() => { setMenu(false); setProfile(false); }, [path]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setFinder(true); }
      if (e.key === 'Escape') { setMenu(false); setProfile(false); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menu]);
  const signOut = () => { setSession(null); location.href = '/'; };

  return (
    <div className="ss klh">
      <aside className={`ss-side${menu ? ' ss-side-open' : ''}`} aria-label="Main menu">
        <div className="ss-brand"><Logo cut="mark" height={30} /><span>Hostels</span>
          <button type="button" className="ss-iconbtn ss-only-small" aria-label="Close menu" onClick={() => setMenu(false)}><Icon name="x" size={18} /></button></div>
        <nav className="ss-nav">
          {nav.map((g) => (
            <div key={g.heading} className="ss-group">
              <div className="ss-heading">{g.heading}</div>
              {g.items.map((i) => (
                <button key={i.route} type="button" className="ss-item" aria-current={here(i.route) ? 'page' : undefined} onClick={() => navigate(i.route)}>
                  <Icon name={i.icon} size={17} /><span>{i.label}</span>{i.badge ? <span className="ss-badge">{i.badge}</span> : null}
                </button>))}
            </div>))}
        </nav>
      </aside>
      {menu && <div className="ss-scrim" onClick={() => setMenu(false)} aria-hidden="true" />}

      <div className="ss-main">
        <header className="ss-top">
          <button type="button" className="ss-iconbtn ss-only-small" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <span className="ss-only-small ss-top-logo"><Logo cut="letters" height={22} /></span>
          <button type="button" className="ss-find" onClick={() => setFinder(true)} aria-label="Go to a screen">
            <Icon name="search" size={16} /><span className="ss-find-text">Go to a screen</span><kbd>Ctrl K</kbd>
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="ss-iconbtn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => navigate('/notifications')}>
            <Icon name="bell" size={19} />{unread ? <span className="ss-dot">{unread > 9 ? '9+' : unread}</span> : null}
          </button>
          <div className="ss-profile">
            <button type="button" className="ss-profile-btn" aria-haspopup="menu" aria-expanded={profile} onClick={() => setProfile(!profile)}>
              <span className="ss-avatar">{initials(user.name)}</span>
              <span className="ss-profile-text"><b>{user.name}</b><small>{user.role}</small></span>
              <Icon name="chevron-down" size={15} />
            </button>
            {profile && (<>
              <div className="ss-scrim ss-scrim-clear" onClick={() => setProfile(false)} aria-hidden="true" />
              <div className="ss-pop" role="menu">
                <div className="ss-pop-head"><b>{user.name}</b><small>{user.role}</small></div>
                <button role="menuitem" type="button" onClick={() => navigate('/profile')}><Icon name="user" size={16} />My profile</button>
                <button role="menuitem" type="button" onClick={() => navigate('/notifications')}><Icon name="bell" size={16} />Notifications{unread ? <span className="ss-badge">{unread}</span> : null}</button>
                <button role="menuitem" type="button" onClick={() => navigate('/screens')}><Icon name="file" size={16} />Screen map</button>
                <hr />
                <button role="menuitem" type="button" onClick={signOut}><Icon name="logout" size={16} />Sign out</button>
              </div>
            </>)}
          </div>
        </header>

        <main className={fill ? "ss-content ss-fill" : "ss-content"}>
          {title && <div className="ss-pagehead">{crumb && <p>{crumb}</p>}<h1>{title}</h1></div>}
          <Guard key={path}>{children}</Guard>
        </main>
      </div>
      {finder && <Finder screens={screens} onClose={() => setFinder(false)} onGo={(r) => { setFinder(false); navigate(r); }} />}
    </div>
  );
}

/** "Go to a screen": type a few letters of a screen's name, its code or what it is for. */
function Finder({ screens, onClose, onGo }: { screens: Screen[]; onClose: () => void; onGo: (route: string) => void }) {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = [{ code: 'HOME', name: 'Home', purpose: 'Your dashboard', workflow: 'All', route: '/home', icon: 'home' } as Screen, ...screens];
    if (!t) return all.slice(0, 9);
    const score = (s: Screen) => (s.name.toLowerCase().startsWith(t) ? 0 : s.name.toLowerCase().includes(t) ? 1 : s.code.toLowerCase().includes(t) ? 2 : 3);
    return all.filter((s) => `${s.name} ${s.code} ${s.purpose} ${MODULE[s.workflow].label}`.toLowerCase().includes(t)).sort((a, b) => score(a) - score(b)).slice(0, 9);
  }, [q, screens]);
  return (
    <div className="ss-modal" role="dialog" aria-modal="true" aria-label="Go to a screen" onClick={onClose}>
      <div className="ss-finder" onClick={(e) => e.stopPropagation()}>
        <div className="ss-finder-input"><Icon name="search" size={18} />
          <input ref={input} value={q} placeholder="Go to a screen: rooms, approvals, REG-05…" aria-label="Screen name or code"
            onChange={(e) => { setQ(e.target.value); setAt(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setAt(Math.min(at + 1, hits.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setAt(Math.max(at - 1, 0)); }
              if (e.key === 'Enter' && hits[at]) onGo(hits[at].route!);
              if (e.key === 'Escape') onClose();
            }} />
        </div>
        <div className="ss-finder-list" role="listbox">
          {hits.length ? hits.map((s, i) => (
            <button key={s.route} type="button" role="option" aria-selected={i === at} onMouseEnter={() => setAt(i)} onClick={() => onGo(s.route!)}>
              <span className={`ss-finder-ico klh-tile-${MODULE[s.workflow].color}`}><Icon name={s.icon} size={15} /></span>
              <span className="ss-finder-text"><b>{s.name}</b><small>{s.purpose}</small></span>
              {s.code !== 'HOME' && <span className="ss-finder-code">{s.code}</span>}
            </button>)) : <p className="ss-finder-empty">No screen matches “{q}”.</p>}
        </div>
      </div>
    </div>
  );
}

/** If a screen fails while drawing, show a message instead of a blank page; the menu keeps working. */
class Guard extends Component<{ children: ReactNode }, { failed: string | null }> {
  state = { failed: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { failed: e instanceof Error ? e.message : String(e) }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="ss-failed" role="alert">
        <b>This screen could not be shown</b>
        <span>Reload the page. If it happens again, note what you clicked and tell the support team.</span>
        <button type="button" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}
