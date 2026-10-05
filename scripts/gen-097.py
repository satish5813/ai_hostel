"""Generate migration 097 from the data model v2.1 (docs/source/v21_tables.json):
the 28 tables of Workflows G-M that the database does not have yet, and the items the document adds to tables
that exist. Items that exist under another name are listed in SAME and left alone."""
import json, re

spec = json.load(open('docs/source/v21_tables.json', encoding='utf8'))
pks = {}
for l in open('docs/source/db_pks.txt', encoding='utf8'):
    t, sch, cols = l.strip().split('|')
    pks[t] = (sch, [c.split(':') for c in cols.split(',')])
dbcols = {}
for l in open('docs/source/db_cols.txt', encoding='utf8'):
    t, c = l.strip().split('|'); dbcols.setdefault(t, set()).add(c)

SCHEMA_OF = {'L': 'acad'}            # academic tables live with acad.*; everything else in hostel
SAME = {  # document item -> already present under this column (no change)
    'staff_master': {'department', 'email'}, 'outpass': {'actual_out_event', 'actual_in_event'}, 'mess_subscription': {'demand_id'},
    'maintenance_ticket': {'raised_by_type', 'raised_by_id', 'raised_at', 'follow_up_ticket_id'},
    'discipline_case': {'incident_at', 'recorded_by'}, 'discipline_punishment': {'effective_from', 'effective_to', 'bars_outing'},
    'vacate_request': {'vacate_reason', 'reason_details', 'intended_vacate_date', 'requested_on'},
    'approval_rule': {'level_no', 'role_code'}, 'approval_step': {'level_no', 'role_code', 'action', 'action_at', 'staff_id', 'contact_id'},
    'notification': {'recipient_ref', 'related_table'}, 'import_batch': {'data_type', 'source_system', 'rows_received', 'rows_loaded', 'rows_rejected'},
    'budget_txn': {'txn_id'}, 'asset_transfer': {'transfer_id'}, 'po_condition': {'condition_no'}, 'vendor_invoice_line': {'line_no'}, 'journal_line': {'line_no'},
    'stock_movement': {'grn_id', 'issue_id', 'deployment_id', 'srn_id'}, 'deployment': {'po_id', 'grn_id'}, 'vendor_invoice_line': {'line_no', 'po_id', 'po_line_no'},
    'po_payment': {'invoice_no', 'invoice_date', 'invoice_amount'}, 'po_line': {'cgst_pct', 'sgst_pct'}, 'asset_transfer': {'transfer_id', 'from_dept', 'to_dept'},
}
snake = lambda s: re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')
missing = [d for d in spec['defs'].values() if snake(d['name']) not in pks]
new_names = {snake(d['name']): d for d in missing}

def pk_of(name):
    """(schema.table, pk column, sql type) of a referenced table, existing or created in this file."""
    t = snake(name)
    if t in pks:
        sch, cols = pks[t]
        c = cols[0]; typ = {'int4': 'integer', 'int8': 'bigint', 'int2': 'smallint', 'uuid': 'uuid'}.get(c[1], f'varchar({c[2]})' if len(c) > 2 else 'varchar(30)')
        return f'{sch}.{t}', c[0], typ
    if t in new_names:
        d = new_names[t]; sch = SCHEMA_OF.get(d['ref'][0], 'hostel')
        pkcols = [snake(r[0]) for r in d['cols'] if r[1].startswith('PK')]
        if len(pkcols) > 1: return None   # two-part key: the column is kept, the link is checked by the application
        return f'{sch}.{t}', pkcols[0], 'bigint'
    return None

def enum_vals(desc):
    first = desc.split('.')[0]
    vals = [v.strip() for v in first.split('/')]
    return vals if len(vals) >= 2 and all(re.fullmatch(r"[A-Za-z0-9_\-]+", v) for v in vals) else None

def coltype(r, table):
    item, typ, req, desc = r
    c = snake(re.sub(r'\s*\(.*?\)', '', item))
    t = typ.replace('PK, ', '').strip()
    if t.startswith('FK'):
        ref = t[2:].strip()
        p = pk_of(ref) if ref else None
        if p: return c, p[2], f'REFERENCES {p[0]}'
        return c, ('bigint' if re.search(r'(_id|_no)$', c) else 'varchar(40)'), ''
    if t == 'Enum':
        v = enum_vals(desc)
        chk = f"CHECK ({c} IN ({', '.join(repr(x) for x in v)}))" if v else ''
        return c, 'varchar(40)', chk
    if t == 'Derived':
        if re.search(r'_at$', c): return c, 'timestamptz', ''
        if re.search(r'(_date|_on)$', c): return c, 'date', ''
        if re.search(r'^(is|has)_', c): return c, 'boolean', ''
    if t == 'PK':   # part of a composite key: the document gives no type, so it follows the name
        if re.search(r'date$', c): return c, 'date', ''
        v = enum_vals(desc)
        if v: return c, 'varchar(40)', f"CHECK ({c} IN ({', '.join(repr(x) for x in v)}))"
        if re.search(r'(code|name|type|meal|slot|shift)$', c): return c, 'varchar(60)', ''
        return c, 'bigint', ''
    if t == 'Number':
        if re.search(r'qty|quantity|kg|litre', c): return c, 'numeric(12,3)', ''
        if re.search(r'rating|count|no$|_no$|score|rank|level|slot|position|percent|pct|strength', c): return c, 'numeric(12,2)' if 'pct' in c or 'score' in c else 'integer', ''
        return c, 'numeric(12,2)', ''
    return c, {'Text': 'text', 'DateTime': 'timestamptz', 'Date': 'date', 'Time': 'time', 'Boolean': 'boolean', 'Image': 'varchar(200)', 'Derived': 'numeric(12,2)', 'PK': 'bigint'}.get(t, 'text'), ''

out = ['-- =====================================================================',
       '-- 097  Workflows G to M from "Hostel Database Design and Data Model, by Workflow", v2.1 (1 Oct 2026).',
       '--      Generated by scripts/gen-097.py from the document (docs/source/v21_tables.json):',
       '--      the 28 tables the database did not have, and the items v2.1 adds to tables that exist.',
       '--      Every column carries the document\'s description as a comment.',
       '-- =====================================================================', '']
comments = []
for d in missing:
    sch = SCHEMA_OF.get(d['ref'][0], 'hostel'); t = snake(d['name'])
    pkc = [r for r in d['cols'] if r[1].startswith('PK')]
    lines = []
    for r in d['cols']:
        c, typ, extra = coltype(r, t)
        is_pk = r[1].startswith('PK')
        single_auto = is_pk and len(pkc) == 1 and r[1] == 'PK'
        if single_auto:
            lines.append(f'  {c} bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY'); continue
        req = r[2].strip().lower()
        notnull = ' NOT NULL' if is_pk or req == 'yes' else ''
        default = ''
        if typ == 'timestamptz' and req == 'auto' and re.search(r'(submitted|raised|recorded|applied|created|marked|logged)_at$|_on$', c): default = ' DEFAULT now()'
        if typ == 'boolean': default = ' DEFAULT false'; notnull = ' NOT NULL'
        if c == 'status' and 'CHECK' in extra and req == 'auto': default = f" DEFAULT {extra.split('(')[2].split(',')[0].rstrip(')')}"; notnull = ' NOT NULL'
        lines.append(f'  {c} {typ}{notnull}{default}{(" " + extra) if extra else ""}')
        comments.append(f"COMMENT ON COLUMN {sch}.{t}.{c} IS {json.dumps(r[3])[1:-1]!r};".replace("\\'", "''"))
    if len(pkc) > 1 or (len(pkc) == 1 and pkc[0][1] != 'PK'):
        lines.append(f"  PRIMARY KEY ({', '.join(snake(re.sub(r'\s*\(.*?\)', '', r[0])) for r in pkc)})")
    have = {l.split()[0] for l in lines}
    lines.append('  ' + ', '.join(x for x in ['created_at timestamptz NOT NULL DEFAULT now()', 'created_by varchar(20)', 'updated_at timestamptz', 'updated_by varchar(20)'] if x.split()[0] not in have))
    out.append(f"-- {d['ref']} {d['name']}: {d['per'].replace('One row per: ', 'one row per ')}")
    out.append(f'CREATE TABLE {sch}.{t} (\n' + ',\n'.join(lines) + '\n);')
    out.append(f"COMMENT ON TABLE {sch}.{t} IS {('v2.1 ' + d['ref'] + ' ' + d['name'] + '. ' + d['per']).replace(chr(39), chr(39)*2)!r};".replace('"', "'"))
    out.append('')

# order: referenced new tables first
def deps(d): return {snake(r[1][2:].strip().replace('PK, ', '')) for r in d['cols'] if 'FK' in r[1]} & set(new_names)
blocks = {}; cur = None; buf = []
for line in out[6:]:
    if line.startswith('-- ') and ': one row per' in line:
        if cur: blocks[cur] = buf
        cur = snake(line.split(' ')[2].rstrip(':')); buf = [line]
    elif cur: buf.append(line)
if cur: blocks[cur] = buf
done, order = set(), []
def visit(n):
    if n in done: return
    done.add(n)
    for x in deps(new_names[n]):
        if x != n: visit(x)
    order.append(n)
for n in new_names: visit(n)
body = out[:6]
for n in order: body += blocks[n]

# items v2.1 adds to tables that exist
body += ['', '-- ---------- items added to tables that exist ----------']
for d in spec['defs'].values():
    t = snake(d['name'])
    if t not in pks: continue
    sch = pks[t][0]
    for r in d['cols']:
        for part in re.split(r'\s*/\s*|,\s*', re.sub(r'\s*\(.*?\)', '', r[0])):
            c = snake(part)
            if not c or c in dbcols.get(t, set()) or c in SAME.get(t, set()) or r[1].startswith('PK'): continue
            cc, typ, extra = coltype([part, r[1], r[2], r[3]], t)
            extra = extra if extra.startswith('REFERENCES') or extra.startswith('CHECK') else ''
            body.append(f'ALTER TABLE {sch}.{t} ADD COLUMN IF NOT EXISTS {c} {typ}{(" " + extra) if extra else ""};')
            comments.append(f"COMMENT ON COLUMN {sch}.{t}.{c} IS {json.dumps(r[3])[1:-1]!r};".replace("\\'", "''"))
body += ['', '-- ---------- descriptions from the document ----------'] + comments
# audit every new table like the others
body += ['', '-- audit']
for n in order:
    d = new_names[n]; sch = SCHEMA_OF.get(d['ref'][0], 'hostel')
    pkc = [snake(re.sub(r'\s*\(.*?\)', '', r[0])) for r in d['cols'] if r[1].startswith('PK')]
    if len(pkc) == 1: body.append(f"CREATE TRIGGER trg_audit_{n} AFTER INSERT OR UPDATE OR DELETE ON {sch}.{n} FOR EACH ROW EXECUTE FUNCTION shared.fn_audit_row('{pkc[0]}');")
open('db/migrations/097_workflows_g_to_m.sql', 'w', encoding='utf8').write('\n'.join(body) + '\n')
print('tables', len(order), 'lines', len(body))
