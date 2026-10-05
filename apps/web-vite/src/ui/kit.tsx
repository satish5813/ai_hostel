/**
 * App-level layout kit: the quiet, compact look the screens share.
 * Soft white panels on a cool ground, small labels, light-weight numerals, pill controls, one dark panel as the anchor.
 * Colours come only from the KLH tokens (teal brand, coral action, yellow highlight, module tints); nothing here invents a colour.
 */
import type { ReactNode } from 'react';
import { Icon, type T } from '@/lib/klh';

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

/* ---------- Panel: the bento card ---------- */
export function Panel({ title, sub, action, children, tone = 'plain', className, flush, style }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children?: ReactNode; tone?: 'plain' | 'dark' | 'tint'; className?: string; flush?: boolean; style?: React.CSSProperties }) {
  return (
    <section className={cx('ui-panel', tone === 'dark' && 'ui-panel-dark', tone === 'tint' && 'ui-panel-tint', flush && 'ui-panel-flush', className)} style={style}>
      {(title || action) && (
        <header className="ui-panel-head">
          <div style={{ minWidth: 0 }}><h2 className="ui-panel-title">{title}</h2>{sub && <p className="ui-panel-sub">{sub}</p>}</div>
          {action}
        </header>)}
      {children}
    </section>
  );
}

/* ---------- Welcome: page opener with a light title, a strip of segments and thin numerals ---------- */
export type Segment = { label: string; value: ReactNode; weight: number; tone?: 'dark' | 'accent' | 'brand' | 'hatch' | 'outline' };
export function Welcome({ eyebrow, title, subtitle, chips, actions, stats, segments }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; chips?: ReactNode; actions?: ReactNode; stats?: { value: ReactNode; label: ReactNode; gold?: boolean; icon?: T.IconName }[]; segments?: Segment[] }) {
  return (
    <div className="ui-welcome">
      <div className="ui-welcome-main">
        {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
        <h1 className="ui-welcome-title">{title}</h1>
        {subtitle && <p className="ui-welcome-sub">{subtitle}</p>}
        {(chips || actions) && <div className="ui-welcome-row">{chips}{actions}</div>}
        {segments && <Segments items={segments} />}
      </div>
      {stats && stats.length > 0 && (
        <div className="ui-thin-row">
          {stats.map((s, i) => <Thin key={i} value={s.value} label={s.label} icon={s.icon} accent={s.gold} />)}
        </div>)}
    </div>
  );
}
export function Thin({ value, label, icon, accent }: { value: ReactNode; label: ReactNode; icon?: T.IconName; accent?: boolean }) {
  return <div className="ui-thin"><div className={cx('ui-thin-value', accent && 'ui-thin-accent')}>{value}</div><div className="ui-thin-label">{icon && <Icon name={icon} size={14} />}{label}</div></div>;
}
export function Segments({ items }: { items: Segment[] }) {
  return (
    <div className="ui-segments" role="list">
      {items.map((s) => (
        <div key={s.label} role="listitem" style={{ flex: `${Math.max(s.weight, 0.6)} 1 0` }}>
          <div className="ui-seg-label">{s.label}</div>
          <div className={cx('ui-seg', `ui-seg-${s.tone ?? 'outline'}`)}>{s.value}</div>
        </div>))}
    </div>
  );
}

/* ---------- Stat: compact tile (same props as the KLH StatCard, without the gradient block) ---------- */
export function Stat({ icon, color = 'brand', label, value, sub, tone, onClick }: T.StatCardProps) {
  const body = (
    <>
      <div className="ui-stat-top"><span className="ui-stat-label">{label}</span>{icon && <span className={cx('ui-stat-icon', `klh-tile-${color}`)}><Icon name={icon} size={15} /></span>}</div>
      <div className={cx('ui-stat-value', tone === 'critical' && 'ui-critical', tone === 'warning' && 'ui-warning')}>{value}</div>
      {sub && <div className="ui-stat-sub">{sub}</div>}
    </>);
  return onClick ? <button type="button" className="ui-stat ui-stat-btn" onClick={onClick}>{body}</button> : <div className="ui-stat">{body}</div>;
}

/* ---------- PillTabs ---------- */
export function PillTabs({ tabs, value, onChange, size }: { tabs: { id: string; label: ReactNode; count?: number; icon?: T.IconName }[]; value: string; onChange: (id: string) => void; size?: 'sm' }) {
  return (
    <div className={cx('ui-pills', size === 'sm' && 'ui-pills-sm')} role="tablist">
      {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={value === t.id} className="ui-pill" onClick={() => onChange(t.id)}>{t.icon && <Icon name={t.icon} size={15} />}{t.label}{t.count !== undefined && <span className="ui-pill-count">{t.count}</span>}</button>)}
    </div>
  );
}

/* ---------- Checklist: the dark anchor panel ---------- */
export type Check = { label: ReactNode; meta?: ReactNode; done: boolean; warn?: boolean; icon?: T.IconName; onClick?: () => void };
export function Checklist({ title, items, footer }: { title: ReactNode; items: Check[]; footer?: ReactNode }) {
  const done = items.filter((i) => i.done).length;
  return (
    <Panel tone="dark" className="ui-checklist">
      <div className="ui-check-head"><span className="ui-check-title">{title}</span><span className="ui-check-count">{done}/{items.length}</span></div>
      <ol className="ui-check-list">
        {items.map((it, i) => {
          const row = (<><span className={cx('ui-check-icon', it.done && 'ui-check-icon-done')}><Icon name={it.icon ?? 'check'} size={15} /></span><span className="ui-check-text"><span className={cx('ui-check-label', it.done && 'ui-check-label-done')}>{it.label}</span>{it.meta && <span className="ui-check-meta">{it.meta}</span>}</span><span className={cx('ui-check-dot', it.done && 'ui-check-dot-done', it.warn && 'ui-check-dot-warn')}>{it.done && <Icon name="check" size={11} />}</span></>);
          return <li key={i}>{it.onClick ? <button type="button" className="ui-check-row" onClick={it.onClick}>{row}</button> : <div className="ui-check-row">{row}</div>}</li>;
        })}
      </ol>
      {footer}
    </Panel>
  );
}

/* ---------- small pieces ---------- */
export function Meter({ value, max, tone = 'brand' }: { value: number; max: number; tone?: 'brand' | 'accent' | 'dark' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="ui-meter" role="img" aria-label={`${pct}%`}><div className={cx('ui-meter-fill', `ui-meter-${tone}`)} style={{ width: `${pct}%` }} /></div>;
}
export function Row({ left, right, sub, onClick }: { left: ReactNode; right?: ReactNode; sub?: ReactNode; onClick?: () => void }) {
  const body = (<><div style={{ minWidth: 0 }}><div className="ui-row-title">{left}</div>{sub && <div className="ui-row-sub">{sub}</div>}</div>{right}</>);
  return onClick ? <button type="button" className="ui-row ui-row-btn" onClick={onClick}>{body}</button> : <div className="ui-row">{body}</div>;
}
/** Compact links to a role's screens: one line each, not a wall of big tiles. */
export function ScreenLinks({ items }: { items: { code: string; name: string; icon: T.IconName; color: T.TileColor; badge?: number; onClick: () => void }[] }) {
  return (
    <div className="ui-links">
      {items.map((i) => (
        <button key={i.code + i.name} type="button" className="ui-link" onClick={i.onClick}>
          <span className={cx('ui-link-icon', `klh-tile-${i.color}`)}><Icon name={i.icon} size={16} /></span>
          <span className="ui-link-text"><span className="ui-link-name">{i.name}</span><span className="ui-link-code">{i.code}</span></span>
          {i.badge ? <span className="ui-link-badge">{i.badge}</span> : <Icon name="chevron-right" size={14} />}
        </button>))}
    </div>
  );
}
export const initials = (name?: string | null) => (name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

/* ---------- the KL (Deemed to be University) logo: official artwork, never recoloured ---------- */
const LOGO = { full: { src: '/brand/kl-logo.png', ratio: 1200 / 489 }, mark: { src: '/brand/kl-mark.png', ratio: 720 / 244 }, letters: { src: '/brand/kl-letters.png', ratio: 400 / 208 } };
/** `full` = emblem, KL and the "Deemed to be University" line; `mark` = emblem and KL for small sizes; `letters` = KL only. `plate` puts it on white, for dark or coloured grounds. */
export function Logo({ cut = 'mark', height = 32, plate, className }: { cut?: keyof typeof LOGO; height?: number; plate?: boolean; className?: string }) {
  const l = LOGO[cut];
  const img = <img src={l.src} alt="KL Deemed to be University" height={height} width={Math.round(height * l.ratio)} style={{ display: 'block', height, width: 'auto' }} />;
  return plate ? <span className={cx('ui-logo-plate', className)}>{img}</span> : <span className={cx('ui-logo', className)}>{img}</span>;
}
