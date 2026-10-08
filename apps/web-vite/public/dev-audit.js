// Development only: layout audit of every screen a login can open (used to check mobile responsiveness).
// window.kluAudit() -> [{ route, overflow, offenders, squeezed }]
window.kluAudit = async function (extra = []) {
  const s = JSON.parse(localStorage.getItem('klu.session') || 'null');
  if (!s) return 'no session';
  const m = await import('/src/app/apps.ts');
  const routes = [...new Set(['/home', ...m.appsFor(s.role).flatMap((a) => a.ops.map((o) => o.route)), ...extra])];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  for (const r of routes) {
    history.pushState({}, '', r); dispatchEvent(new PopStateEvent('popstate'));
    await wait(1600);
    const W = document.documentElement.clientWidth;
    const scrollsInside = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
    const offenders = [];
    for (const el of document.querySelectorAll('main *')) {
      const b = el.getBoundingClientRect();
      if (b.width && b.right > W + 2 && !scrollsInside(el) && getComputedStyle(el).position !== 'fixed') offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} (${Math.round(b.right - W)}px)`);
      if (offenders.length > 4) break;
    }
    const squeezed = [];
    for (const el of document.querySelectorAll('main b, main span, main p, main h1, main h2, main h3, main small, main button, main td, main th, main label')) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim(); const words = t.split(/\s+/).filter(Boolean).length;
      if (words < 3) continue;
      const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3;
      const lines = Math.round(el.getBoundingClientRect().height / lh);
      if (lines >= words && el.getBoundingClientRect().width < 110) squeezed.push(t.slice(0, 40));
      if (squeezed.length > 3) break;
    }
    out.push({ route: r, overflow: document.documentElement.scrollWidth - W, offenders: [...new Set(offenders)], squeezed });
  }
  return out.filter((x) => x.overflow > 2 || x.offenders.length || x.squeezed.length).concat([{ route: `checked ${routes.length} screens at ${document.documentElement.clientWidth}px` }]);
};
