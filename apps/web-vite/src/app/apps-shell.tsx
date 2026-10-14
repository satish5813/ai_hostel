import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowUpRight, Bell, BellRing, BedDouble, Building2, Calendar, ChevronDown, ChevronRight, ChevronsUpDown, Clock, CornerDownLeft, DoorOpen, FileText,
  GraduationCap, House, IndianRupee, LayoutGrid, LogOut, Menu, PlugZap, Search, Smartphone, UserRound, Users, X, type LucideIcon,
} from 'lucide-react';
import { setSession } from '@/lib/api';
import { useApi } from '@/lib/ui';
import { Logo, initials } from '@/ui/kit';
import { GENERAL, MODC, appsFor, locate, type App, type Op, type Summary } from './apps';

type Hostel = { facility_id: string; facility_name: string; hostel_code: string; hostel_gender: string };
const GENERAL_APP: App = { k: 'general', name: 'My work', mod: 'teal', icon: House, ops: GENERAL };
const RECENT_KEY = 'klu.recent';
const FAC_KEY = 'klu.facility';
const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window */ } };

/**
 * Staff frame from the design "KL Residencies Admin": the home is an apps launcher; opening an app shows its operations
 * in a sidebar with a breadcrumb bar on top. Ctrl K jumps to any app or operation. Below 1024 px the sidebar slides in.
 */
export function AppsShell({ role, user, unread, fill, children }: { role: string; user: { name: string; role: string }; unread: number; fill?: boolean; children: ReactNode }) {
  const { pathname: path, search } = useLocation();
  const navigate = useNavigate();
  const apps = useMemo(() => appsFor(role), [role]);
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [me, setMe] = useState(false);
  const [facility, setFacility] = useState<string>(() => read(FAC_KEY, ''));
  const summary = useApi<Summary & { year?: string | null }>(`/home/summary${facility ? `?facility_id=${facility}` : ''}`);
  const hostels = useApi<Hostel[]>('/hostels');
  const isHome = path === '/home';
  const at = isHome ? null : locate([...apps, GENERAL_APP], path, search) ?? { app: GENERAL_APP, op: GENERAL.find((o) => o.route === path) ?? { label: titleFromPath(path), route: path, icon: FileText } };

  useEffect(() => { setMenu(false); setMe(false); }, [path, search]);
  useEffect(() => {
    if (!at || at.app.k === 'general') return;
    const r = read<string[]>(RECENT_KEY, []); const k = `${path}${search}`;
    write(RECENT_KEY, [k, ...r.filter((x) => x !== k)].slice(0, 6));
  }, [path, search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
      if (e.key === 'Escape') { setPalette(false); setMenu(false); setMe(false); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  const pickHostel = (id: string) => { setFacility(id); write(FAC_KEY, id); };
  const s = summary.data;
  const badge = (r: string) => s?.badges[r] ?? 0;
  const hostelName = hostels.data?.find((h) => h.facility_id === facility);

  return (
    <div className="ax klh">
      {isHome ? (
        <div className="ax-home">
          <header className="ax-bar">
            <div className="ax-bar-row">
              <span className="ax-brand"><Logo cut="mark" height={36} /><b>KL Residencies</b></span>
              <span className="ax-grow" />
              <HostelPicker hostels={hostels.data ?? []} value={facility} onPick={pickHostel} />
              <span className="ax-pill ax-hide-sm"><Calendar size={16} className="ax-muted" />AY {s?.year ?? '—'}</span>
              <BellBtn unread={unread} onClick={() => navigate('/notifications')} />
              <button type="button" className="ax-me" onClick={() => setMe(!me)} aria-haspopup="menu" aria-expanded={me}>
                <span className="ax-av">{initials(user.name)}</span><span className="ax-me-text ax-hide-sm"><b>{user.name}</b><small>{user.role}</small></span>
              </button>
              {me && <MeMenu user={user} unread={unread} onClose={() => setMe(false)} top />}
            </div>
            <div className="ax-line" />
          </header>
          <main className="ax-home-body">
            <Launcher apps={apps} s={s} user={user} hostel={hostelName?.facility_name} onPalette={() => setPalette(true)} />
          </main>
        </div>
      ) : (
        <div className="ax-app">
          <aside className={`ax-side${menu ? ' ax-side-open' : ''}`} aria-label={`${at!.app.name} menu`}>
            <div className="ax-side-top">
              <button type="button" className="ax-allapps" onClick={() => navigate('/home')}><Logo cut="mark" height={26} /><span>All apps</span><LayoutGrid size={16} className="ax-muted" /></button>
              <button type="button" className="ax-close" aria-label="Close menu" onClick={() => setMenu(false)}><X size={18} /></button>
              <AppCard app={at!.app} />
            </div>
            <nav className="ax-ops" aria-label={at!.app.name}>
              {at!.app.ops.map((o) => { const on = o.route === at!.op.route; const n = badge(o.route); const Ico = o.icon; const M = MODC[at!.app.mod];
                return (
                  <button key={o.route} type="button" className={`ax-op${on ? ' ax-op-on' : ''}`} aria-current={on ? 'page' : undefined} onClick={() => navigate(o.route)}>
                    <span className="ax-op-ico" style={on ? undefined : { background: M.bg, color: M.fg }}><Ico size={14} /></span><span className="ax-op-label">{o.label}</span>{n > 0 && <span className="ax-op-badge">{n}</span>}
                  </button>); })}
              <span className="ax-cap">Switch app</span>
              <div className="ax-switch">
                {apps.filter((x) => x.k !== at!.app.k && x.ops.length).map((x) => { const M = MODC[x.mod]; const Ico = x.icon; const n = x.ops.reduce((a, o) => a + badge(o.route), 0);
                  return <button key={x.k} type="button" title={x.name} aria-label={x.name} style={{ background: M.grad, color: M.on, boxShadow: `0 6px 12px -8px ${M.glow}` }} onClick={() => navigate(x.ops[0].route)}><Ico size={18} />{n > 0 && <span className="ax-dot">{n > 99 ? '99+' : n}</span>}</button>; })}
                <button type="button" title="My approvals" aria-label="My approvals" className="ax-switch-ghost" onClick={() => navigate('/approvals')}><BellRing size={18} /></button>
              </div>
            </nav>
            <div className="ax-side-foot">
              <button type="button" className="ax-usercard" onClick={() => setMe(!me)} aria-haspopup="menu" aria-expanded={me}>
                <span className="ax-av ax-av-glass">{initials(user.name)}</span><span className="ax-me-text"><b>{user.name}</b><small>{user.role}</small></span><ChevronsUpDown size={16} />
              </button>
              {me && <MeMenu user={user} unread={unread} onClose={() => setMe(false)} />}
            </div>
          </aside>
          {menu && <div className="ax-scrim" onClick={() => setMenu(false)} aria-hidden="true" />}
          <div className="ax-main">
            <header className="ax-bar">
              <div className="ax-bar-row ax-bar-app">
                <button type="button" className="ax-iconbtn ax-only-sm" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}><Menu size={19} /></button>
                <nav className="ax-crumb" aria-label="Breadcrumb">
                  <button type="button" onClick={() => navigate('/home')}><LayoutGrid size={14} />Apps</button><ChevronRight size={14} className="ax-muted" />
                  <span className="ax-hide-sm">{at!.app.name}</span><ChevronRight size={14} className="ax-muted ax-hide-sm" />
                  <b>{at!.op.label}</b>
                </nav>
                <span className="ax-grow" />
                <button type="button" className="ax-jump" onClick={() => setPalette(true)}><Search size={16} /><span className="ax-hide-sm">Jump to…</span><kbd className="ax-hide-sm">Ctrl K</kbd></button>
                <HostelPicker hostels={hostels.data ?? []} value={facility} onPick={pickHostel} short />
                <BellBtn unread={unread} onClick={() => navigate('/notifications')} />
              </div>
              <div className="ax-line" style={{ background: MODC[at!.app.mod].grad }} />
            </header>
            <main className={`ax-content${fill ? ' ax-fill' : ''}`}>
              {!fill && !at!.op.own && <div className="ax-pagehead"><p>{at!.app.name}{at!.op.code ? ` · ${at!.op.code}` : ''}</p><h1>{at!.op.label}</h1></div>}
              <Guard key={path}>{children}</Guard>
            </main>
          </div>
        </div>
      )}
      <nav className="ax-tabbar" aria-label="Quick menu">
        <button type="button" aria-current={isHome ? 'page' : undefined} onClick={() => navigate('/home')}><House size={20} /><span>Home</span></button>
        {!isHome && <button type="button" aria-expanded={menu} onClick={() => setMenu(true)}><Menu size={20} /><span>Menu</span></button>}
        <button type="button" onClick={() => setPalette(true)}><Search size={20} /><span>Search</span></button>
        <button type="button" aria-current={path === '/notifications' ? 'page' : undefined} onClick={() => navigate('/notifications')}><Bell size={20} /><span>Alerts</span>{unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}</button>
        <button type="button" aria-current={path === '/profile' ? 'page' : undefined} onClick={() => navigate('/profile')}><UserRound size={20} /><span>Me</span></button>
      </nav>
      {palette && <Palette apps={apps} onClose={() => setPalette(false)} onGo={(r) => { setPalette(false); navigate(r); }} />}
    </div>
  );
}

function titleFromPath(path: string) {
  const p = path.split('/').filter(Boolean)[0] ?? 'home';
  return p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' ');
}

function AppCard({ app }: { app: App }) {
  const M = MODC[app.mod]; const Ico = app.icon;
  return (
    <div className="ax-appcard" style={{ background: M.grad, color: M.on, boxShadow: `0 12px 24px -14px ${M.glow}` }}>
      <span className="ax-appcard-ico"><Ico size={20} /></span>
      <span className="ax-appcard-text"><b>{app.name}</b><small>{app.ops.length} {app.ops.length === 1 ? 'operation' : 'operations'}</small></span>
    </div>
  );
}

function HostelPicker({ hostels, value, onPick, short }: { hostels: Hostel[]; value: string; onPick: (id: string) => void; short?: boolean }) {
  return (
    <label className={`ax-pill ax-picker${short ? ' ax-hide-sm' : ''}`}>
      <Building2 size={16} className="ax-teal" />
      <select value={value} onChange={(e) => onPick(e.target.value)} aria-label="Hostel">
        <option value="">All hostels</option>
        {hostels.map((h) => <option key={h.facility_id} value={h.facility_id}>{short ? h.hostel_code : `${h.facility_name}`}</option>)}
      </select>
      <ChevronDown size={16} className="ax-muted" />
    </label>
  );
}

function BellBtn({ unread, onClick }: { unread: number; onClick: () => void }) {
  return <button type="button" className="ax-iconbtn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={onClick}><Bell size={18} />{unread > 0 && <span className="ax-dot ax-dot-bell">{unread > 9 ? '9+' : unread}</span>}</button>;
}

function MeMenu({ user, unread, onClose, top }: { user: { name: string; role: string }; unread: number; onClose: () => void; top?: boolean }) {
  const navigate = useNavigate();
  const signOut = () => { setSession(null); location.href = '/'; };
  return (<>
    <div className="ax-scrim ax-scrim-clear" onClick={onClose} aria-hidden="true" />
    <div className={`ax-pop${top ? ' ax-pop-top' : ''}`} role="menu">
      <div className="ax-pop-head"><b>{user.name}</b><small>{user.role}</small></div>
      <button role="menuitem" type="button" onClick={() => navigate('/profile')}><UserRound size={16} />My profile</button>
      <button role="menuitem" type="button" onClick={() => navigate('/notifications')}><Bell size={16} />Notifications{unread ? <span className="ax-op-badge">{unread}</span> : null}</button>
      <button role="menuitem" type="button" onClick={() => navigate('/screens')}><FileText size={16} />Screen map</button>
      <hr />
      <button role="menuitem" type="button" onClick={signOut}><LogOut size={16} />Sign out</button>
    </div>
  </>);
}

/** The home of every staff member: hero with the day's numbers, the apps, what needs them, connected systems, recent. */
function Launcher({ apps, s, user, hostel, onPalette }: { apps: (App & { soon?: boolean })[]; s?: Summary; user: { name: string; role: string }; hostel?: string; onPalette: () => void }) {
  const navigate = useNavigate();
  const h = s?.hero;
  const badge = (r: string) => s?.badges[r] ?? 0;
  const needs = s?.needs ?? [];
  const hour = new Date().getHours();
  const first = user.name.replace(/^(Dr|Mr|Ms|Mrs|Prof)\.?\s+/i, '').split(' ')[0];
  const recent = read<string[]>(RECENT_KEY, []).map((r) => { const hit = locate(apps, r.split('?')[0], r.includes('?') ? `?${r.split('?')[1]}` : ''); return hit ? { r, ...hit } : null; }).filter(Boolean).slice(0, 4) as { r: string; app: App; op: Op }[];
  const appOf = (route: string) => apps.find((a) => a.ops.some((o) => o.route === route));
  const stats: { icon: LucideIcon; v: string; l: string }[] = [
    { icon: BedDouble, v: h && h.beds ? `${((100 * h.occupied) / h.beds).toFixed(1)}%` : '—', l: 'Occupancy' },
    { icon: DoorOpen, v: h ? String(h.on_pass) : '—', l: 'Outside on pass' },
    { icon: Users, v: h ? `${h.staff_present}/${h.staff_total}` : '—', l: 'Staff present' },
    { icon: BellRing, v: s ? String(needs.length) : '—', l: 'Need you' },
  ];
  return (
    <div className="ax-launch">
      <section className="ax-hero">
        <div className="ax-hero-pattern" /><div className="ax-orb ax-orb-sun" /><div className="ax-orb ax-orb-violet" /><div className="ax-orb ax-orb-sky" /><div className="ax-orb ax-orb-dot" />
        <div className="ax-hero-main">
          <div><span className="ax-hero-date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}{hostel ? ` · ${hostel}` : ''}</span>
            <h1>{hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, {first}</h1></div>
          <button type="button" className="ax-hero-search" onClick={onPalette}><Search size={20} className="ax-teal" /><span>Jump to any app, operation or screen</span><kbd>Ctrl K</kbd></button>
        </div>
        <div className="ax-hero-stats">
          {stats.map((x) => { const I = x.icon; return <div key={x.l}><I size={16} /><b>{x.v}</b><span>{x.l}</span></div>; })}
        </div>
      </section>

      <div className="ax-cols">
        <section aria-label="Apps" className="ax-apps">
          <div className="ax-sec-head"><h2>Apps</h2><span>{apps.filter((a) => a.ops.length).length} apps · {apps.reduce((n, a) => n + a.ops.length, 0)} operations</span><span className="ax-grow" /><small className="ax-hide-sm">Open an app to see its menu</small></div>
          <div className="ax-tiles">
            {apps.map((a) => { const M = MODC[a.mod]; const Ico = a.icon; const n = a.ops.reduce((x, o) => x + badge(o.route), 0); const go = () => a.ops.length && navigate(a.ops[0].route);
              return (
                <div key={a.k} role="button" tabIndex={a.soon ? -1 : 0} aria-disabled={a.soon} aria-label={`Open ${a.name}`} className={`ax-tile${a.soon ? ' ax-tile-soon' : ''}`} onClick={go} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}>
                  <div className="ax-tile-tint" style={{ background: M.bg }} />
                  <div className="ax-tile-top">
                    <span className="ax-tile-ico" style={{ background: M.grad, color: M.on, boxShadow: `0 12px 22px -10px ${M.glow}, inset 0 1px 0 rgba(255,255,255,.25)` }}><Ico size={26} /></span>
                    {n > 0 && <span className="ax-wait"><i />{n} waiting</span>}
                    {a.soon && <span className="ax-soon">Next release</span>}
                  </div>
                  <div className="ax-tile-text"><b>{a.name}</b><span>{a.soon ? 'Coming in the next release' : s && a.stat ? a.stat(s) : `${a.ops.length} operations`}</span></div>
                  {!a.soon && <div className="ax-chips">
                    {a.ops.slice(0, 3).map((o) => <button key={o.route} type="button" style={{ background: M.bg, color: M.fg }} onClick={(e) => { e.stopPropagation(); navigate(o.route); }}>{o.label}</button>)}
                    {a.ops.length > 3 && <span>+{a.ops.length - 3} more</span>}
                  </div>}
                </div>); })}
          </div>
        </section>

        <aside className="ax-aside">
          <section className="ax-card">
            <div className="ax-card-head"><h2>Needs you today</h2><span className="ax-count">{needs.length}</span></div>
            {!s && <p className="ax-empty">Counting…</p>}
            {s && !needs.length && <p className="ax-empty">Nothing waiting for you. A calm day.</p>}
            {needs.map((n) => { const a = appOf(n.route); const M = MODC[a?.mod ?? 'teal']; const op = a?.ops.find((o) => o.route === n.route); const I = op?.icon ?? a?.icon ?? Bell;
              return (
                <button key={n.key} type="button" className="ax-need" onClick={() => navigate(n.route)}>
                  <span className="ax-need-ico" style={{ background: M.bg, color: M.fg }}><I size={18} /></span>
                  <span className="ax-need-text"><b>{n.title}</b><small>{n.sub}</small></span><ChevronRight size={16} className="ax-muted" />
                </button>); })}
          </section>

          <section className="ax-card">
            <div className="ax-card-head"><h2>Connected systems</h2><PlugZap size={16} className="ax-muted" /></div>
            <div className="ax-fee">
              <div className="ax-orb ax-orb-fee" />
              <div className="ax-fee-head"><span className="ax-fee-ico"><IndianRupee size={20} /></span><span><b>Fee payments</b><small><i style={{ background: s?.systems.gateway_live ? '#7CF2B0' : '#FFD166' }} />{s?.systems.gateway_live ? 'Razorpay · connected' : 'Razorpay · test mode'}</small></span></div>
              <div className="ax-fee-stats"><div><b>₹{(s?.systems.collected_today ?? 0).toLocaleString('en-IN')}</b><span>Collected today</span></div><div><b>{s?.systems.failed_today ?? 0}</b><span>Failed payments</span></div></div>
              {appOf('/dues') && <button type="button" className="ax-fee-go" onClick={() => navigate('/dues')}>Open dues and collections<ArrowUpRight size={16} /></button>}
            </div>
            <div className="ax-sys"><span className="ax-sys-ico" style={{ background: MODC.teal.bg, color: MODC.teal.fg }}><Smartphone size={16} /></span><span><b>Student portal</b><small>Registration, bed choice, payments · {s?.systems.registrations_today ?? 0} today</small></span></div>
            <div className="ax-sys"><span className="ax-sys-ico" style={{ background: '#E8F1FD', color: '#175CD3' }}><GraduationCap size={16} /></span><span><b>University ERP</b><small>Students and staff · {s?.systems.erp_sync ? `synced ${new Date(s.systems.erp_sync).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'not synced yet'}</small></span><i className="ax-live" style={{ background: s?.systems.erp_sync ? '#22A06B' : '#9AA3AD' }} /></div>
          </section>

          {recent.length > 0 && (
            <section className="ax-card">
              <div className="ax-card-head"><h2>Recent</h2></div>
              {recent.map((r) => { const M = MODC[r.app.mod]; const I = r.op.icon;
                return <button key={r.r} type="button" className="ax-recent" onClick={() => navigate(r.r)}><span style={{ background: M.bg, color: M.fg }}><I size={14} /></span><span className="ax-need-text"><b>{r.op.label}</b><small>{r.app.name}</small></span><Clock size={13} className="ax-muted" /></button>; })}
            </section>)}
        </aside>
      </div>
    </div>
  );
}

/** Ctrl K: apps and operations of this role, plus the general screens. Arrow keys move, Enter opens, Esc closes. */
function Palette({ apps, onClose, onGo }: { apps: App[]; onClose: () => void; onGo: (route: string) => void }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const res = useMemo(() => {
    const t = q.trim().toLowerCase(); const out: { label: string; sub: string; route: string; icon: LucideIcon; app: App; isApp: boolean }[] = [];
    for (const a of [...apps.filter((x) => x.ops.length), GENERAL_APP]) {
      if (!t || a.name.toLowerCase().includes(t)) out.push({ label: a.name, sub: `App · ${a.ops.length} operations`, route: a.ops[0].route, icon: a.icon, app: a, isApp: true });
      if (t) for (const o of a.ops) if (o.label.toLowerCase().includes(t) || a.name.toLowerCase().includes(t) || (o.code ?? '').toLowerCase().includes(t)) out.push({ label: o.label, sub: `${a.name}${o.code ? ` · ${o.code}` : ''}`, route: o.route, icon: o.icon, app: a, isApp: false });
    }
    return out.filter((x, n, all) => all.findIndex((y) => y.route === x.route && y.isApp === x.isApp) === n).slice(0, 10);
  }, [q, apps]);
  const k = Math.min(i, Math.max(res.length - 1, 0));
  return (
    <div className="ax-modal" role="dialog" aria-modal="true" aria-label="Jump to" onClick={onClose}>
      <div className="ax-palette" onClick={(e) => e.stopPropagation()}>
        <div className="ax-palette-in"><Search size={20} className="ax-teal" />
          <input ref={ref} value={q} placeholder="Search apps and operations, e.g. block, outpass, meter" aria-label="Search apps and operations"
            onChange={(e) => { setQ(e.target.value); setI(0); }}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(k + 1, res.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(k - 1, 0)); } if (e.key === 'Enter' && res[k]) onGo(res[k].route); }} />
          <kbd>Esc</kbd>
        </div>
        <div className="ax-palette-list" role="listbox">
          <span className="ax-cap">{q.trim() ? 'Results' : 'All apps'}</span>
          {res.map((r, n) => { const M = MODC[r.app.mod]; const I = r.icon;
            return (
              <button key={`${r.route}-${r.isApp}`} type="button" role="option" aria-selected={n === k} onMouseEnter={() => setI(n)} onClick={() => onGo(r.route)}>
                <span className="ax-pal-ico" style={r.isApp ? { background: M.grad, color: M.on } : { background: M.bg, color: M.fg }}><I size={17} /></span>
                <span className="ax-need-text"><b>{r.label}</b><small>{r.sub}</small></span>
                {n === k && <span className="ax-open">Open<CornerDownLeft size={13} /></span>}
              </button>); })}
          {!res.length && <p className="ax-empty">Nothing matches “{q}”.</p>}
        </div>
        <div className="ax-palette-foot"><span>↑ ↓ to move</span><span>↵ to open</span><span>Esc to close</span><span className="ax-grow" /><span>{res.length} shown</span></div>
      </div>
    </div>
  );
}

/** If a screen fails while drawing, show a message instead of a blank page; the frame keeps working. */
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
