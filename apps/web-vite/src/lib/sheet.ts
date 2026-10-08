/** Reads a CSV or Excel file in the browser into rows keyed by the header of each column. Nothing is sent anywhere here. */
import Papa from 'papaparse';

export type Sheet = { headers: string[]; rows: Record<string, string>[] };

const text = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  return String(v).trim();
};

export async function readSheetFile(file: File): Promise<Sheet> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser');
    const data = await readSheet(file);
    const headers = (data[0] ?? []).map(text);
    const rows = data.slice(1).filter((r) => r.some((c) => text(c) !== '')).map((r) => Object.fromEntries(headers.map((h, i) => [h, text(r[i])]).filter(([h]) => h !== '')));
    return { headers: headers.filter(Boolean), rows };
  }
  if (!/\.(csv|txt)$/i.test(file.name)) throw new Error('Choose a .csv or .xlsx file');
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: 'greedy',
      complete: (res) => {
        const headers = (res.meta.fields ?? []).filter((h) => h.trim() !== '');
        resolve({ headers, rows: res.data.map((r) => Object.fromEntries(headers.map((h) => [h, text(r[h])]))) });
      },
      error: (e) => reject(new Error(e.message)),
    });
  });
}

export const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
