import fs from 'node:fs'; import zlib from 'node:zlib';
const html = fs.readFileSync('kl-hostels-admin.bundle.html', 'utf8');
const grab = (t) => { const m = html.match(new RegExp(`<script type="__bundler/${t}">([\s\S]*?)</script>`)); return m ? m[1] : null; };
const manifest = JSON.parse(grab('manifest')); const template = JSON.parse(grab('template'));
fs.writeFileSync('bundle/template.html', template);
const out = [];
for (const [id, e] of Object.entries(manifest)) {
  let b = Buffer.from(e.data, 'base64'); if (e.compressed) b = zlib.gunzipSync(b);
  const ext = (e.mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/g, '').slice(0, 10);
  fs.writeFileSync(`bundle/${id}.${ext}`, b); out.push(`${id}.${ext}\t${e.mime}\t${b.length}`);
}
const ext = grab('ext_resources'); if (ext) fs.writeFileSync('bundle/ext_resources.json', ext);
console.log(out.join('\n'));
