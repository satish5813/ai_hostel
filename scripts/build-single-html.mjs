// Packs the offline web build of the student app (apps/mobile/build/web, built with --dart-define=OFFLINE=true
// --no-web-resources-cdn --pwa-strategy=none) into ONE html file: demo/KL-Hostels-Student-App.html.
// The app's code is inlined; the graphics engine (CanvasKit wasm), fonts, images and demo data are embedded and
// handed to the app by a small fetch shim, so the file needs nothing beside it and no server.
//   node scripts/build-single-html.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';

const WEB = new URL('../apps/mobile/build/web/', import.meta.url).pathname;
const OUT = new URL('../demo/KL-Hostels-Student-App.html', import.meta.url).pathname;
const TYPES = { json: 'application/json', ttf: 'font/ttf', otf: 'font/otf', png: 'image/png', jpg: 'image/jpeg', frag: 'application/octet-stream', bin: 'application/octet-stream' };
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const inline = (js) => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// every asset the app asks for by URL; text and fonts are gzipped, pictures are already compressed
const assets = {};
for (const p of walk(join(WEB, 'assets'))) {
  const key = 'assets/' + relative(join(WEB, 'assets'), p), ext = p.split('.').pop();
  if (key.endsWith('NOTICES') || key.endsWith('AssetManifest.bin')) continue;
  const raw = readFileSync(p), picture = ext === 'png' || ext === 'jpg';
  assets[key] = { t: TYPES[ext] ?? 'application/octet-stream', z: picture ? 0 : 1, d: (picture ? raw : gzipSync(raw, { level: 9 })).toString('base64') };
}
const wasm = gzipSync(readFileSync(join(WEB, 'canvaskit/canvaskit.wasm')), { level: 9 }).toString('base64');
// CanvasKit ships as a module; as a plain script it only needs its two module-only lines changed
const canvaskit = readFileSync(join(WEB, 'canvaskit/canvaskit.js'), 'utf8').replaceAll('import.meta.url', 'location.href').replace(/export default CanvasKitInit;\s*$/, '');
const main = readFileSync(join(WEB, 'main.dart.js'), 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="KL Hostels"><meta name="theme-color" content="#0B5E57">
<title>KL Hostels Student App</title>
<style>
  /* one screen: the app paints itself on a canvas that fills the page; the teal ground shows while it loads */
  :root { --ground: #0B5E57; --ink: #EAF3F1; --soft: #B9D6D1; color-scheme: light; }
  html, body { height: 100%; margin: 0; }
  body { background: var(--ground); color: var(--ink); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; overflow: hidden; }
  #boot { position: fixed; inset: 0; display: grid; place-items: center; text-align: center; padding-inline: 24px; }
  #boot b { display: block; font-size: 22px; margin-bottom: 4px; }
  #boot small { display: block; margin-top: 14px; color: var(--soft); max-width: 36ch; }
  #boot[hidden] { display: none; }
</style></head>
<body>
<div id="boot"><div><b>KL Hostels</b><span id="boot-msg">Opening the student app…</span><small>Demo with sample data. It works without internet and nothing you type leaves this phone.</small></div></div>
<script id="kl-assets" type="application/json">${JSON.stringify(assets)}</script>
<script id="kl-wasm" type="text/plain">${wasm}</script>
<script>
(function () {
  var ASSETS = JSON.parse(document.getElementById('kl-assets').textContent);
  var failed = false;
  function fail(why) { failed = true; document.getElementById('boot-msg').textContent = why; }
  function step(what) { if (!failed) document.getElementById('boot-msg').textContent = what; }
  if (typeof DecompressionStream === 'undefined' || typeof WebAssembly === 'undefined') { fail('This browser is too old to run the app. Use Safari on iOS 16.4 or later, or a current Chrome.'); return; }
  function bytes(b64) { var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  /** The embedded file as a network answer; gzipped ones are unpacked as they are read. */
  function answer(b64, type, zipped) {
    var body = new Blob([bytes(b64)]).stream();
    if (zipped) body = body.pipeThrough(new DecompressionStream('gzip'));
    return new Response(body, { status: 200, headers: { 'Content-Type': type } });
  }
  function keyOf(url) { var m = /(assets\\/[^?#]*)/.exec(decodeURIComponent(String(url && url.url ? url.url : url))); return m && ASSETS[m[1]] ? m[1] : null; }
  // the app asks for its fonts, pictures and data by URL: answer from this file
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    var k = keyOf(input);
    if (k) return Promise.resolve(answer(ASSETS[k].d, ASSETS[k].t, ASSETS[k].z));
    return realFetch ? realFetch(input, init) : Promise.reject(new TypeError('offline'));
  };
  var src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', { configurable: true, enumerable: true, get: function () { return src.get.call(this); },
    set: function (v) { var k = keyOf(v); src.set.call(this, k && !ASSETS[k].z ? 'data:' + ASSETS[k].t + ';base64,' + ASSETS[k].d : v); } });
  // the graphics engine, started from the copy inside this file; the app waits for this promise
  window.klStartEngine = function () {
    step('Unpacking the graphics engine…');
    var engine = answer(document.getElementById('kl-wasm').textContent, 'application/wasm', 1).arrayBuffer();
    window.flutterCanvasKitLoaded = CanvasKitInit({ instantiateWasm: function (imports, done) {
      engine.then(function (buf) { step('Starting the graphics engine…'); return WebAssembly.instantiate(buf, imports); })
        .then(function (r) { step('Starting the app…'); done(r.instance, r.module); }, function (e) { fail('The app could not start its graphics engine: ' + (e && e.message)); });
      return {};
    } }).then(function (ck) { window.flutterCanvasKit = ck; return ck; }, function (e) { fail('The graphics engine stopped: ' + (e && e.message)); throw e; });
  };
  addEventListener('unhandledrejection', function (e) { if (!document.getElementById('boot').hidden) fail('The app could not start: ' + ((e.reason && (e.reason.message || e.reason)) || 'unknown error')); });
  addEventListener('flutter-first-frame', function () { document.getElementById('boot').hidden = true; });
  addEventListener('error', function (e) { if (!document.getElementById('boot').hidden) fail('The app could not start: ' + (e.message || 'unknown error')); });
})();
</script>
<script>${inline(canvaskit)}
if (window.klStartEngine) klStartEngine();</script>
<script>${inline(main)}</script>
</body></html>`;
writeFileSync(OUT, html);
console.log('wrote', OUT, (html.length / 1e6).toFixed(1), 'MB;', Object.keys(assets).length, 'assets');
