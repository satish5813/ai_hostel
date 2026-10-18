"""Build docs/feature-tour.html from docs/screens/*.jpg and a captions list (code -> section, title, caption)."""
import json, os, base64, sys
ROOT = '/Users/aasrithatechnologies/Desktop/hostel_automation'
SHOTS = os.path.join(ROOT, 'docs', 'screens')
CAP = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'captions.json')))
EMBED = '--embed' in sys.argv  # single-file version with base64 images

sections = {}
for c in CAP:
    sections.setdefault(c['section'], []).append(c)

def img(code):
    p = os.path.join(SHOTS, f'{code}.jpg')
    if not os.path.exists(p): return None
    if EMBED: return 'data:image/jpeg;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
    return f'screens/{code}.jpg'

css = """
:root{--ink:#101828;--ink2:#475467;--ink3:#667085;--line:#E4E7EC;--bg:#F4F6FA;--brand:#0B7A71;--acc:#4263EB}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 -apple-system,'Plus Jakarta Sans',Inter,system-ui,sans-serif;color:var(--ink);background:var(--bg)}
header.top{padding:40px 24px 24px;max-width:1240px;margin:0 auto}header.top h1{margin:0 0 6px;font-size:34px;letter-spacing:-.01em}header.top p{margin:0;color:var(--ink2);font-size:16px}
.eyebrow{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--brand)}
nav.toc{max-width:1240px;margin:0 auto 8px;padding:0 24px;display:flex;flex-wrap:wrap;gap:8px}nav.toc a{text-decoration:none;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;font-weight:600}
section.sec{max-width:1240px;margin:28px auto;padding:0 24px}section.sec h2{display:flex;align-items:center;gap:10px;font-size:22px;margin:0 0 4px}section.sec h2 span{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#E8EDF9;color:var(--acc);font-weight:800;font-size:14px}
section.sec>p{margin:0 0 16px;color:var(--ink2)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(560px,1fr));gap:18px}
figure{margin:0;background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(16,24,40,.04)}
figure img{display:block;width:100%;height:auto;border-bottom:1px solid var(--line);cursor:zoom-in}
figcaption{padding:12px 14px}figcaption b{display:block;font-size:14.5px}figcaption small{display:block;color:var(--ink3);font-size:12.5px;margin-top:2px}
figcaption .code{display:inline-block;font-size:11px;font-weight:800;color:var(--acc);background:#EEF2FF;border-radius:6px;padding:1px 6px;margin-right:6px;font-family:ui-monospace,Menlo,monospace}
.tag{display:inline-block;margin:4px 6px 0 0;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:#E3F7F3;color:#0B7A71}
.tag.ai{background:#EEEBFF;color:#5F3DC4}.tag.auto{background:#FFF2E2;color:#9A5B00}
dialog{border:0;border-radius:16px;padding:0;max-width:96vw}dialog img{max-width:94vw;max-height:90vh;display:block}
footer{max-width:1240px;margin:40px auto;padding:0 24px;color:var(--ink3);font-size:13px}
@media print{figure{break-inside:avoid}nav.toc{display:none}}
"""
html = [f"<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>KL Residencies — feature tour</title><style>{css}</style></head><body>",
        "<header class=top><div class=eyebrow>KL Residencies · residency management</div><h1>Feature tour</h1><p>Every screen of the system, by feature area, as it looks on the demo data. Click a screenshot to enlarge.</p></header>",
        "<nav class=toc>" + ''.join(f"<a href='#s{i}'>{s}</a>" for i, s in enumerate(sections)) + "</nav>"]
for i, (sec, items) in enumerate(sections.items()):
    intro = next((c.get('intro') for c in items if c.get('intro')), '')
    html.append(f"<section class=sec id=s{i}><h2><span>{i+1:02d}</span>{sec}</h2><p>{intro}</p><div class=grid>")
    for c in items:
        src = img(c['code'])
        if not src: continue
        tags = ''.join(f"<span class='tag {t}'>{ {'ai':'AI','auto':'Automation'}.get(t, t) }</span>" for t in c.get('tags', []))
        html.append(f"<figure><img src='{src}' alt='{c['title']}' loading=lazy onclick='z(this)'><figcaption><b><span class=code>{c['code']}</span>{c['title']}</b><small>{c['caption']}</small>{tags}</figcaption></figure>")
    html.append("</div></section>")
html.append("<dialog id=d onclick='this.close()'><img id=di alt=''></dialog><script>function z(i){di.src=i.src;d.showModal()}</script>")
html.append(f"<footer>Generated from the running system on the demo data copy · {len([c for c in CAP if img(c['code'])])} screens.</footer></body></html>")
out = os.path.join(ROOT, 'docs', 'feature-tour.html' if not EMBED else 'feature-tour-single.html')
open(out, 'w').write('\n'.join(html)); print('wrote', out)
