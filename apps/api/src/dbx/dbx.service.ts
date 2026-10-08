import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CATALOG } from './catalog.js';

const SCHEMAS = ['ref', 'infra', 'portal', 'shared', 'hostel', 'acad'];
const SCHEMA_LABEL: Record<string, string> = { ref: 'University ERP', infra: 'Infrastructure and maintenance', portal: 'Inventory, procurement and accounts', shared: 'Shared by all workflows', hostel: 'Hostel', acad: 'Academics' };
/** Tables nobody edits by hand: the hash-chained log and the raw movement stream. */
const READ_ONLY = new Set(['shared.audit_log', 'hostel.movement_event', 'hostel.movement_event_default', 'shared.import_batch']);

export type Column = { name: string; type: string; udt: string; nullable: boolean; default: string | null; pk: boolean; identity: boolean; generated: boolean; fk: string | null; options: string[] | null; doc: string | null };
const q = (id: string) => sql.raw(`"${id.replace(/"/g, '')}"`);

/**
 * The database explorer (Data Administrator): every table of the hostel schemas with its rows, columns and the
 * description from the data model document. Reads and writes go through the same audit as the screens; names are
 * checked against the database catalogue before they reach SQL, values are always parameters.
 */
@Injectable()
export class DbxService {
  constructor(private dbs: DbService) {}

  async catalog() {
    const rows = await this.dbs.rows<{ schema: string; table: string; rows: number; comment: string | null; cols: number }>(sql`
      select n.nspname as schema, c.relname as "table", greatest(c.reltuples, 0)::bigint::int as rows, obj_description(c.oid, 'pg_class') as comment,
        (select count(*)::int from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) as cols
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where c.relkind in ('r', 'p') and not c.relispartition and n.nspname = any(${`{${SCHEMAS.join(',')}}`}::text[]) order by 1, 2`);
    // exact counts for the small tables (reltuples is -1 or stale before ANALYZE)
    for (const r of rows) {
      if (r.rows < 5000) { const [x] = await this.dbs.rows<{ n: number }>(sql`select count(*)::int as n from ${q(r.schema)}.${q(r.table)}`); r.rows = x.n; }
    }
    return rows.map((r) => {
      const d = CATALOG[r.table];
      return { ...r, ref: d?.ref ?? null, name: d?.name ?? null, status: d?.status ?? null, per: d?.per ?? null, wf: d?.wf ?? null, wf_title: d?.wf_title ?? null,
        group: d ? (d.wf === 'MS' ? 'Masters' : d.wf === 'SH' ? 'Shared by all workflows' : `Workflow ${d.wf} · ${d.wf_title.replace(/\s+EXPANDED$/i, '')}`) : SCHEMA_LABEL[r.schema], in_doc: !!d, read_only: READ_ONLY.has(`${r.schema}.${r.table}`) };
    });
  }

  private async columns(schema: string, table: string): Promise<Column[]> {
    if (!SCHEMAS.includes(schema)) throw new NotFoundException('Unknown schema');
    const cols = await this.dbs.rows<Column & { checks: string | null }>(sql`
      select a.attname as name, format_type(a.atttypid, a.atttypmod) as type, t.typname as udt, not a.attnotnull as nullable, pg_get_expr(d.adbin, d.adrelid) as default,
        exists (select 1 from pg_index i where i.indrelid = c.oid and i.indisprimary and a.attnum = any(i.indkey)) as pk,
        a.attidentity <> '' as identity, a.attgenerated <> '' as generated,
        (select fn.nspname || '.' || fc.relname from pg_constraint f join pg_class fc on fc.oid = f.confrelid join pg_namespace fn on fn.oid = fc.relnamespace
          where f.conrelid = c.oid and f.contype = 'f' and a.attnum = any(f.conkey) limit 1) as fk,
        (select string_agg(pg_get_constraintdef(k.oid), ' ') from pg_constraint k where k.conrelid = c.oid and k.contype = 'c' and k.conkey = array[a.attnum]::int2[]) as checks,
        (select string_agg(e.enumlabel, '|' order by e.enumsortorder) from pg_enum e where e.enumtypid = a.atttypid) as enums,
        col_description(c.oid, a.attnum) as doc
      from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid join pg_type t on t.oid = a.atttypid
      left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
      where n.nspname = ${schema} and c.relname = ${table} and a.attnum > 0 and not a.attisdropped order by a.attnum`);
    if (!cols.length) throw new NotFoundException('Unknown table');
    const doc = CATALOG[table]?.cols ?? {};
    return cols.map((c) => {
      const raw = c as unknown as { enums: string | null; checks: string | null };
      let options: string[] | null = raw.enums ? raw.enums.split('|') : null;
      const m = raw.checks?.match(/ANY \(\(?ARRAY\[(.*?)\]/);
      if (!options && m) options = [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
      return { name: c.name, type: c.type, udt: c.udt, nullable: c.nullable, default: c.default, pk: c.pk, identity: c.identity, generated: c.generated, fk: c.fk, options, doc: c.doc ?? doc[c.name] ?? null };
    });
  }

  async rows(schema: string, table: string, p: { q?: string; sort?: string; dir?: string; page?: string; size?: string }) {
    const cols = await this.columns(schema, table);
    const names = new Set(cols.map((c) => c.name));
    const size = Math.min(Math.max(Number(p.size) || 50, 10), 200), page = Math.max(Number(p.page) || 0, 0);
    const sortCol = p.sort && names.has(p.sort) ? p.sort : (cols.find((c) => c.pk)?.name ?? cols[0].name);
    const dir = p.dir === 'desc' ? sql.raw('desc') : sql.raw('asc');
    const where: SQL = p.q?.trim() ? sql`where t::text ilike ${'%' + p.q.trim() + '%'}` : sql``;
    const src = sql`${q(schema)}.${q(table)} t`;
    const [{ n }] = await this.dbs.rows<{ n: number }>(sql`select count(*)::int as n from ${src} ${where}`);
    const data = await this.dbs.rows(sql`select to_jsonb(t) as r from ${src} ${where} order by t.${q(sortCol)} ${dir} nulls last limit ${size} offset ${page * size}`);
    const meta = (await this.catalog()).find((x) => x.schema === schema && x.table === table);
    return { schema, table, meta, columns: cols, total: n, page, size, sort: sortCol, dir: p.dir === 'desc' ? 'desc' : 'asc', rows: data.map((x) => (x as { r: Record<string, unknown> }).r) };
  }

  private async writable(schema: string, table: string) {
    if (READ_ONLY.has(`${schema}.${table}`)) throw new BadRequestException('This table is kept by the system and cannot be edited by hand');
    return this.columns(schema, table);
  }
  private clean(cols: Column[], values: Record<string, unknown>, forInsert: boolean) {
    const byName = new Map(cols.map((c) => [c.name, c]));
    const out: [string, unknown][] = [];
    for (const [k, v] of Object.entries(values)) {
      const c = byName.get(k);
      if (!c) throw new BadRequestException(`No column ${k}`);
      if (c.identity || c.generated) continue;
      if (forInsert && (v === '' || v === null || v === undefined) && (c.default || c.nullable)) continue;
      out.push([k, v === '' ? null : v]);
    }
    return out;
  }
  private keyWhere(cols: Column[], key: Record<string, unknown>) {
    const pk = cols.filter((c) => c.pk);
    if (!pk.length) throw new BadRequestException('This table has no primary key, so rows cannot be edited here');
    if (pk.some((c) => key[c.name] === undefined || key[c.name] === null)) throw new BadRequestException('Give every key column');
    return sql.join(pk.map((c) => sql`${q(c.name)}::text = ${String(key[c.name])}`), sql` and `);
  }

  async insert(user: AuthUser, schema: string, table: string, values: Record<string, unknown>) {
    const cols = await this.writable(schema, table);
    const v = this.clean(cols, values, true);
    if (cols.some((c) => c.name === 'created_by') && !v.some(([k]) => k === 'created_by')) v.push(['created_by', user.id]);
    if (!v.length) throw new BadRequestException('Fill at least one field');
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`insert into ${q(schema)}.${q(table)} (${sql.join(v.map(([k]) => q(k)), sql`, `)})
      values (${sql.join(v.map(([, x]) => sql`${x}`), sql`, `)}) returning to_jsonb(${q(table)}.*) as r`));
    return (r as unknown as { r: unknown }[])[0]?.r;
  }

  async update(user: AuthUser, schema: string, table: string, key: Record<string, unknown>, values: Record<string, unknown>) {
    const cols = await this.writable(schema, table);
    const v = this.clean(cols, values, false).filter(([k]) => !cols.find((c) => c.name === k)?.pk);
    if (!v.length) throw new BadRequestException('Nothing to change');
    const hasUpd = cols.some((c) => c.name === 'updated_by');
    const set = sql.join([...v.map(([k, x]) => sql`${q(k)} = ${x}`), ...(hasUpd ? [sql`"updated_by" = ${user.id}`, sql`"updated_at" = now()`] : [])], sql`, `);
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`update ${q(schema)}.${q(table)} set ${set} where ${this.keyWhere(cols, key)} returning 1`));
    if (!(r as unknown as unknown[]).length) throw new NotFoundException('Row not found');
    return { updated: true };
  }

  async remove(user: AuthUser, schema: string, table: string, key: Record<string, unknown>) {
    const cols = await this.writable(schema, table);
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`delete from ${q(schema)}.${q(table)} where ${this.keyWhere(cols, key)} returning 1`));
    if (!(r as unknown as unknown[]).length) throw new NotFoundException('Row not found');
    return { deleted: true };
  }
}
