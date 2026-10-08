// Post-processes drizzle-kit pull output so it compiles under NodeNext TypeScript. Run after `drizzle-kit pull`.
// Note: tsconfig has noImplicitAny=false because mutually-referencing tables (department <-> staff_master,
// maintenance_category <-> maintenance_team, pr_line <-> po_line) cannot be typed without manual edits of generated code.
import { readFileSync, writeFileSync } from 'node:fs';
const fix = (file, fn) => { const p = new URL(file, import.meta.url); writeFileSync(p, fn(readFileSync(p, 'utf8'))); };
fix('./src/schema.ts', (s) => s.split('\n').map((l) =>
    l.includes('gen_random_bytes') ? "\tqr_token: varchar({ length: 64 }).default(sql`encode(gen_random_bytes(24), 'hex')`).notNull()," : l)
  .join('\n')
  // self / mutual references need an explicit column type or TS reports an implicit any cycle
  .replace(/\.references\(\(\) => /g, '.references((): AnyPgColumn => ')
  // partition children are introspected with null identity options
  .replace(/\.generatedAlwaysAsIdentity\(\{ name: "null"[^)]*\)/g, '.generatedAlwaysAsIdentity()'));
fix('./src/relations.ts', (s) => s.replace(/from "\.\/schema"/g, 'from "./schema.js"'));
console.log('schema.ts / relations.ts fixed');
