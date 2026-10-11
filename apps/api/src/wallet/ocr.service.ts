import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import Tesseract from 'tesseract.js';
import { DbService } from '../db/db.service.js';

export type Check = { check: string; expected: string; found: string | null; ok: boolean | null };

/**
 * Reads the uploaded receipt and matches it against what the student claimed (migration 124).
 * A photograph goes through OCR (tesseract, in this process, no outside service); a PDF gives up its text layer.
 * The result never decides anything by itself: the warden sees it beside the receipt and decides.
 * ponytail: OCR runs in the API process; move it to a worker queue if uploads grow past a few a minute.
 */
@Injectable()
export class OcrService {
  private log = new Logger('OCR');
  private worker: Promise<Tesseract.Worker> | null = null;
  constructor(private dbs: DbService) {}

  private engine() {
    // one engine for the process; the language file is cached under TESSDATA_DIR (default ./tessdata) after the first run
    this.worker ??= Tesseract.createWorker('eng', 1, { cachePath: process.env.TESSDATA_DIR ?? 'tessdata', errorHandler: (e) => this.log.warn(String(e)) });
    return this.worker;
  }

  /** The text on the receipt, whatever its type. */
  async readText(dataUrl: string): Promise<string> {
    const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
    if (!m) return '';
    const buf = Buffer.from(m[2], 'base64');
    if (m[1] === 'application/pdf') {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, isEvalSupported: false }).promise;
      const parts: string[] = [];
      for (let i = 1; i <= Math.min(doc.numPages, 5); i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        parts.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
      }
      return parts.join('\n');
    }
    const w = await this.engine();
    const { data } = await w.recognize(buf);
    return data.text ?? '';
  }

  /** Read the receipt of [proofId] and record what matched. Runs after the upload answers; safe to call again. */
  async check(proofId: number) {
    const [p] = await this.dbs.rows<{ proof_id: number; student_id: string; full_name: string; amount: number; paid_on: string; reference: string | null; photo: string }>(sql`
      select p.proof_id::int as proof_id, p.student_id, sm.full_name, p.amount::float as amount, p.paid_on::text as paid_on, p.reference, p.photo
      from hostel.payment_proof p join ref.student_master sm on sm.student_id = p.student_id where p.proof_id = ${proofId}`);
    if (!p) return;
    let text = '';
    try { text = await this.readText(p.photo); } catch (e) { this.log.warn(`receipt ${proofId}: ${e instanceof Error ? e.message : e}`); }
    const { status, checks } = OcrService.match(text, p);
    await this.dbs.rows(sql`update hostel.payment_proof set ocr_status = ${status}, ocr_text = ${text.slice(0, 20000)}, ocr_checks = ${JSON.stringify(checks)}::jsonb, ocr_at = now() where proof_id = ${proofId}`);
    this.log.log(`receipt ${proofId}: ${status} (${checks.filter((c) => c.ok).length}/${checks.filter((c) => c.ok !== null).length} checks)`);
    return { status, checks };
  }

  /** What the receipt says against what was claimed. Pure, so it is easy to test. */
  static match(raw: string, p: { student_id: string; full_name: string; amount: number; paid_on: string; reference: string | null }): { status: string; checks: Check[] } {
    const text = raw.toUpperCase().replace(/\s+/g, ' ');
    const digits = text.replace(/[,\s]/g, '');                                  // "1,68,000.00" -> "168000.00"
    const alnum = text.replace(/[^A-Z0-9]/g, '');                               // references, student ids
    if (text.replace(/[^A-Z0-9]/g, '').length < 30) return { status: 'Unreadable', checks: [{ check: 'text', expected: 'readable text', found: null, ok: null }] };
    const checks: Check[] = [];
    // amount: the claimed figure, with or without paise
    const amt = Math.round(p.amount);
    const amtRe = new RegExp(`(?<![0-9])${amt}(?:\\.00)?(?![0-9])`);
    const amtFound = amtRe.exec(digits)?.[0] ?? null;
    checks.push({ check: 'amount', expected: `₹${amt.toLocaleString('en-IN')}`, found: amtFound ? `₹${Number(amtFound).toLocaleString('en-IN')}` : null, ok: !!amtFound });
    // date: dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, dd Mon yyyy, Mon dd, yyyy
    const [y, mo, d] = p.paid_on.slice(0, 10).split('-');
    const dd = String(Number(d)), mm = String(Number(mo));
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mon = months[Number(mo) - 1];
    const dateRes = [
      new RegExp(`\\b0?${dd}[/.-]0?${mm}[/.-]${y}\\b`), new RegExp(`\\b${y}[/.-]0?${mm}[/.-]0?${dd}\\b`),
      new RegExp(`\\b0?${dd}[ -]?${mon}[A-Z]*[ ,-]*${y}\\b`), new RegExp(`\\b${mon}[A-Z]*[ .]*0?${dd}[ ,]*${y}\\b`),
    ];
    const dateFound = dateRes.map((r) => r.exec(text)?.[0]).find(Boolean) ?? null;
    checks.push({ check: 'date', expected: `${dd}/${mm}/${y}`, found: dateFound, ok: !!dateFound });
    // reference: as typed, letters and digits only
    if (p.reference) {
      const ref = p.reference.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const ok = ref.length >= 4 && alnum.includes(ref);
      checks.push({ check: 'reference', expected: p.reference, found: ok ? p.reference : null, ok });
    }
    // the student: the ID, or the whole name (a surname alone is shared by many students)
    const idOk = alnum.includes(p.student_id.toUpperCase());
    const nameWords = p.full_name.toUpperCase().split(/[^A-Z]+/).filter((w) => w.length >= 3);
    const nameHits = nameWords.filter((w) => text.includes(w));
    const nameOk = nameWords.length > 0 && nameHits.length === nameWords.length;
    checks.push({ check: 'student', expected: `${p.student_id} / ${p.full_name}`, found: idOk ? p.student_id : nameHits.length ? nameHits.join(' ') + (nameOk ? '' : ' (only part of the name)') : null, ok: idOk || nameOk });
    // the issuer: informational
    const uni = /\bKL\b|KONERU|LAKSHMAIAH|KLEF|KL UNIVERSITY/.test(text);
    checks.push({ check: 'issuer', expected: 'KL University', found: uni ? 'KL University' : null, ok: uni ? true : null });
    const get = (c: string) => checks.find((x) => x.check === c)?.ok === true;
    const status = get('amount') && get('student') && (get('date') || get('reference')) ? 'Matched' : 'Mismatch';
    return { status, checks };
  }
}
