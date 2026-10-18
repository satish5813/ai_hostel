// Headless capture of every planned screen at 1440x900 using the installed Google Chrome.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const plan = JSON.parse(readFileSync(resolve(import.meta.dirname, 'plan.json'), 'utf8'));
const OUT = '/Users/aasrithatechnologies/Desktop/hostel_automation/docs/screens';
mkdirSync(OUT, { recursive: true });
const only = process.argv[2] ? new Set(process.argv.slice(2)) : null;   // optional: role users to (re)capture

const HIDE = `react-scan-root, [id*="react-scan"], [class*="react-scan"], .toast, .klh-toast, [data-dev-overlay] { display: none !important; }`;
const settled = async (page) => {
  // the dev server compiles routes lazily and pages fetch after mount: wait until there is real content and no "Loading…"
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    const state = await page.evaluate(() => {
      const txt = document.body?.innerText ?? '';
      return { len: txt.replace(/\s+/g, ' ').trim().length, loading: /\bLoading…|\bLoading\.\.\./.test(txt), skel: document.querySelectorAll('.klh-skeleton, [data-skeleton], .ui-skeleton').length };
    }).catch(() => ({ len: 0, loading: true, skel: 0 }));
    if (state.len > 120 && !state.loading && state.skel === 0) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1200);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
let ok = 0, bad = 0;
for (const role of plan.roles) {
  if (only && !only.has(String(role.user))) continue;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 100)); });
  try {
    if (role.user) {
      await page.goto(plan.base + '/', { waitUntil: 'networkidle' });
      await page.getByPlaceholder('Employee or university ID').fill(role.user);
      await page.getByPlaceholder('Your password').fill(plan.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForFunction(() => !document.querySelector('input[placeholder="Your password"]'), null, { timeout: 45000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(800);
    }
    for (const s of role.shots) {
      try {
        await page.goto(plan.base + s.path, { waitUntil: 'networkidle', timeout: 45000 });
        await settled(page);
        if (s.click) { const el = page.getByRole('tab', { name: new RegExp(s.click, 'i') }).first().or(page.getByText(new RegExp(s.click, 'i')).first()); await el.click({ timeout: 5000 }).catch(() => {}); await settled(page); }
        await page.addStyleTag({ content: HIDE }).catch(() => {});
        await page.evaluate(() => document.querySelectorAll('react-scan-root, [id*="react-scan"]').forEach((n) => n.remove())).catch(() => {});
        await page.screenshot({ path: `${OUT}/${s.code}.jpg`, type: 'jpeg', quality: 86, fullPage: !!s.full });
        const len = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim().length);
        console.log(`${len < 150 ? 'THIN' : 'ok  '} ${role.user ?? '-'}  ${s.code}  ${s.path}  text=${len}`);
        ok++;
      } catch (e) { console.log(`FAIL ${role.user ?? '-'}  ${s.code}  ${s.path}  ${String(e.message).split('\n')[0]}`); bad++; }
    }
    if (errors.length) console.log(`   console errors for ${role.user}: ${[...new Set(errors)].slice(0, 2).join(' | ')}`);
  } catch (e) { console.log(`FAIL login ${role.user}: ${String(e.message).split('\n')[0]}`); bad += role.shots.length; }
  await ctx.close();
}
await browser.close();
console.log(`done: ${ok} captured, ${bad} failed`);
