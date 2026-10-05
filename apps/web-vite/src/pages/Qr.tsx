import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '@/lib/api';

type Page = { space: { space_code: string; space_name: string; space_category: string; zone_name: string; facility_name: string }; status: string; people: { role: string; name: string; mobile: string; shift: string }[] };

/** The page behind every door label. Anyone can open it; it shows who to call for this place. */
export default function QrPage() {
  const { token } = useParams();
  const [page, setPage] = useState<Page | null | undefined>(undefined);
  useEffect(() => { api<Page>(`/qr/${token}`).then(setPage).catch(() => setPage(null)); }, [token]);
  if (page === undefined) return null;
  return (
    <div className="klh klh-comfortable" style={{ minHeight: '100vh', background: 'var(--surface-0)' }}>
      <div className="klh-hero" style={{ borderRadius: 0, padding: '24px 20px' }}>
        <p className="klh-hero-eyebrow">{page ? `${page.space.facility_name} · ${page.space.zone_name}` : 'KL University Hostels'}</p>
        <h1 style={{ fontSize: 32, lineHeight: '40px', fontWeight: 800, margin: '4px 0 0', color: 'var(--hero-ink)' }}>{page ? page.space.space_name : 'Label not recognised'}</h1>
        {page && <p className="klh-hero-sub">{page.space.space_category.replace(/_/g, ' ')}</p>}
      </div>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 20 }}>
        {!page ? <p className="klh-muted">Ask the hostel office for a new label.</p> : (
          <>
            {page.status !== 'Active' && <div className="klh-notice klh-notice-warning" style={{ marginBottom: 16 }}><div className="klh-notice-body"><div className="klh-notice-title">This label has been replaced</div>The names below may be out of date.</div></div>}
            <p className="klh-overline">Who to call</p>
            <div className="klh-stack" style={{ gap: 12 }}>
              {page.people.map((p, i) => (
                <div key={i} className="klh-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div><div style={{ fontWeight: 700 }}>{p.name}</div><div className="klh-muted" style={{ fontSize: 14 }}>{p.role.replace(/_/g, ' ')} · {p.shift} shift</div></div>
                  <a className="klh-btn klh-btn-primary klh-btn-pill" href={`tel:${p.mobile}`}>Call</a>
                </div>))}
              {page.people.length === 0 && <div className="klh-card klh-muted">No one is assigned to this place yet.</div>}
            </div>
            <p className="klh-muted" style={{ marginTop: 24, fontSize: 14 }}>For a repair, call the person above or raise a ticket in the hostel app.</p>
          </>)}
      </div>
    </div>
  );
}
