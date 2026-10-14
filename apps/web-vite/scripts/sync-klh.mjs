// Refreshes src/vendor from a downloaded copy of the KLH design-system artifact (project/ folder).
//   node scripts/sync-klh.mjs <path-to-artifact>/project
// Produces: klh-bundle.js (ESM wrapper), klh.css, klh-types.d.ts, klh-tokens.json, klh-tokens.css and docs/design-system-klh.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = resolve(process.argv[2] ?? '');
if (!src) { console.error('usage: node scripts/sync-klh.mjs <artifact>/project'); process.exit(1); }
const here = dirname(fileURLToPath(import.meta.url));
const vendor = join(here, '..', 'src', 'vendor');
mkdirSync(vendor, { recursive: true });

// 1. bundle.js is a UMD-style IIFE that reads window.React and writes window.KLH; wrap it as an ES module
const bundle = readFileSync(join(src, 'components', 'bundle.js'), 'utf8');
if (!bundle.includes('var React = window.React;') || !bundle.includes('window.KLH = Object.assign(window.KLH || {}, api);')) throw new Error('bundle.js shape changed; update sync-klh.mjs');
const esm = `// ESM wrapper around the KLH design-system bundle (project/components/bundle.js). Do not edit by hand; re-run scripts/sync-klh.mjs.
import * as __React from 'react';
const __out = {};
${bundle.replace('var React = window.React;', 'var React = __React;').replace('window.KLH = Object.assign(window.KLH || {}, api);', '__out.KLH = api;')}
export const KLH = __out.KLH;
export default KLH;
`;
writeFileSync(join(vendor, 'klh-bundle.js'), esm);
writeFileSync(join(vendor, 'klh-bundle.d.ts'), `export const KLH: Record<string, unknown>;\nexport default KLH;\n`);
writeFileSync(join(vendor, 'klh.css'), readFileSync(join(src, 'components', 'bundle.css'), 'utf8'));
writeFileSync(join(vendor, 'klh-types.d.ts'), readFileSync(join(src, 'components', 'index.d.ts'), 'utf8'));

// 2. tokens.json -> CSS custom properties (light at :root, dark under [data-theme="dark"])
const tok = JSON.parse(readFileSync(join(src, 'tokens.json'), 'utf8'));
writeFileSync(join(vendor, 'klh-tokens.json'), JSON.stringify(tok, null, 2));
const themed = (list) => ({ light: list.map((t) => `  --${t.name}: ${typeof t.value === 'object' ? t.value.light : t.value};`), dark: list.filter((t) => typeof t.value === 'object').map((t) => `  --${t.name}: ${t.value.dark};`) });
const colors = themed(tok.color.tokens), shadows = themed(tok.shadow.tokens);
const flat = (list) => list.map((t) => `  --${t.name}: ${t.value};`);
const fonts = Object.entries(tok.type.families).map(([k, v]) => `  --font-${k}: ${v};`);
const typeStyles = tok.type.groups.flatMap((g) => g.styles).flatMap((s) => [`  --${s.name}-size: ${s.fontSize};`, `  --${s.name}-line: ${s.lineHeight};`, `  --${s.name}-weight: ${s.fontWeight};`]);
const css = `/* KLH tokens — generated from tokens.json (${tok.name} design system v${tok.version}) by scripts/sync-klh.mjs */
:root, [data-theme="light"] {
${[...colors.light, ...shadows.light, ...fonts, ...typeStyles, ...flat(tok.spacing.tokens), ...flat(tok.radius.tokens), ...flat(tok.size.tokens), ...flat(tok.breakpoint.tokens)].join('\n')}
}
[data-theme="dark"] {
${[...colors.dark, ...shadows.dark].join('\n')}
}
`;
writeFileSync(join(vendor, 'klh-tokens.css'), css);

// 3. the guide
const docs = join(here, '..', '..', '..', 'docs', 'design-system-klh.md');
writeFileSync(docs, `# KLH design system (KL Residencies)\n\nCopied from the design-system artifact by apps/web-vite/scripts/sync-klh.mjs. The bundle lives in apps/web-vite/src/vendor.\n\n${readFileSync(join(src, 'README.md'), 'utf8')}`);
console.log('vendor refreshed:', Object.keys(tok.color.tokens).length, 'colour tokens;', (bundle.match(/\{"name":"/g) ?? []).length, 'components');
