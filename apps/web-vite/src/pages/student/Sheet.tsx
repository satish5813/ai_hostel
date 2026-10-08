import { useEffect, useRef, type ReactNode } from 'react';
import { CheckCircle2, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/lib/klh';
import { MODC, type Mod } from '@/app/apps';

/* ---------------------------------------------------------------- the sheet */

/** A dialog over the home: centred on wide screens, a bottom sheet on phones. Esc and the backdrop close it. */
export function Sheet({ mod, icon: I, title, sub, onClose, children, footer }: { mod: Mod; icon: LucideIcon; title: string; sub?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const M = MODC[mod];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    const o = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = o; prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="st-sheet-wrap" onClick={onClose}>
      <div ref={ref} className="st-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <span className="st-grab" aria-hidden="true" />
        <header className="st-sheet-head">
          <span className="st-ico" style={{ background: M.grad, color: M.on, boxShadow: `0 10px 18px -10px ${M.glow}` }}><I size={20} /></span>
          <span className="st-sheet-title"><b>{title}</b>{sub && <small>{sub}</small>}</span>
          <button type="button" className="st-x" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="st-sheet-body">{children}</div>
        {footer && <footer className="st-sheet-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Done({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return <div className="st-done"><span><CheckCircle2 size={34} /></span><b>{title}</b><p>{body}</p><Button variant="primary" onClick={onClose}>Done</Button></div>;
}
