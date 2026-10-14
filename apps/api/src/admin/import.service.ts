import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService, type Tx } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/**
 * Bulk upload of masters (ADM-04). The browser reads the CSV or Excel file and sends the rows in chunks;
 * this service is the single authority on what a column means, what is valid, and how a row is written.
 *
 *   check  -> validates only, writes nothing
 *   load   -> writes the valid rows of a chunk in one statement per table, refuses the rest with a reason,
 *             and keeps the count in shared.import_batch
 *
 * Privacy rule of the spec: Aadhaar, PAN and bank details are never copied. Columns that are not listed in
 * a kind's `columns` are dropped (the browser does not even send them), and refusal messages name the field
 * and the rule, never the value.
 */
type Row = Record<string, string>;
type Clean = Record<string, unknown>;
export type RowError = { row: number; key?: string; message: string };
type Col = { key: string; label: string; required?: boolean; hint?: string; sample: string; aliases?: string[] };
type Ctx = {
  hostels: Map<string, string>; types: Map<string, { id: number; sharing: number; is_ac: boolean }>; spaces: Set<string>; zones: Set<string>;
  staff: Set<string>; years: Set<string>; roles: Map<string, string>; metered: Map<string, string>; user: AuthUser;
  beds: Map<string, string>; students: Set<string>; housed: Set<string>; currentYear: string; genders: Map<string, string>; hostelFor: Map<string, string>;
  messes: Map<string, number>; meterIds: Map<string, number>;
};
type Kind = {
  kind: string; order: number; title: string; target: string; source: string; note: string; count: string; needs: (keyof Ctx)[];
  columns: Col[]; key: (c: Clean) => string;
  validate: (r: Row, ctx: Ctx) => Clean;
  load: (tx: Tx, rows: Clean[], ctx: Ctx, batchId: number) => Promise<void>;
};

/* ---------- value helpers: messages name the field and the rule, never the value ---------- */
const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
const need = (v: string | undefined, label: string) => { if (!v) throw new Error(`${label} is missing`); return v; };
const cut = (v: string | undefined, n: number) => (v ? v.slice(0, n) : null);
const whole = (v: string | undefined, label: string, min: number, max: number) => {
  const n = Number(need(v, label)); if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label} must be a whole number from ${min} to ${max}`); return n;
};
const amount = (v: string | undefined, label: string) => {
  const n = Number(need(v, label).replace(/[,₹\s]/g, '')); if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be an amount`); return n;
};
const isoDate = (v: string | undefined, label: string, required = false): string | null => {
  if (!v) { if (required) throw new Error(`${label} is missing`); return null; }
  let y: string, m: string, d: string;
  const a = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/), b = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (a) [, y, m, d] = a; else if (b) [, d, m, y] = b; else throw new Error(`${label} is not a date; use DD-MM-YYYY`);
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; const t = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== iso) throw new Error(`${label} is not a real date`);
  return iso;
};
const oneOf = (v: string | undefined, label: string, options: string[], aliases: Record<string, string> = {}, fallback?: string) => {
  if (!v) { if (fallback !== undefined) return fallback; throw new Error(`${label} is missing`); }
  const k = norm(v); const hit = options.find((o) => norm(o) === k) ?? aliases[k];
  if (!hit) { if (fallback !== undefined) return fallback; throw new Error(`${label} must be one of: ${options.join(', ')}`); }
  return hit;
};
const yes = (v: string | undefined, dflt: boolean) => (v ? /^(y|yes|true|1)$/i.test(v) : dflt);
const mobile = (v: string | undefined) => { const m = (v ?? '').replace(/\D/g, '').slice(-10); return /^[6-9]\d{9}$/.test(m) ? m : null; };
const email = (v: string | undefined) => (v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v.toLowerCase().slice(0, 120) : null);
const deptCode = (v: string | undefined) => (v ? v.toUpperCase().replace(/[^A-Z0-9&]+/g, '_').replace(/^_|_$/g, '').slice(0, 20) : null);
const json = (rows: Clean[]) => sql`${JSON.stringify(rows)}::jsonb`;

const GENDER = { m: 'Male', f: 'Female', boy: 'Male', girl: 'Female', o: 'Other' };
const STAFF_TYPES = ['Faculty', 'Warden', 'Lab_Assistant', 'Maintenance', 'Sports_Coach', 'Admin', 'Security', 'Housekeeping', 'Mess', 'Medical', 'Counsellor', 'Other'];
const staffTypeFrom = (designation: string) => {
  const d = designation.toLowerCase();
  return /warden/.test(d) ? 'Warden' : /security|guard/.test(d) ? 'Security' : /mess|cook|chef|cater/.test(d) ? 'Mess' : /electric|plumb|carpent|maint|technic/.test(d) ? 'Maintenance'
    : /house ?keep|clean|sweep/.test(d) ? 'Housekeeping' : /prof|lectur|faculty|teach/.test(d) ? 'Faculty' : /doctor|nurse|medical/.test(d) ? 'Medical' : /counsel/.test(d) ? 'Counsellor' : 'Admin';
};
const RELATION: Record<string, string> = { self: 'Self', father: 'Father', mother: 'Mother', guardian: 'Guardian', husband: 'Spouse', wife: 'Spouse', spouse: 'Spouse', brother: 'Brother', sister: 'Sister', communication: 'Communication' };

/* ---------- the masters in set-up order, then the opening balances for going live ---------- */
const KINDS: Kind[] = [
  {
    kind: 'hostels', order: 1, title: 'Hostel buildings', target: 'infra.facility, hostel.hostel_profile, infra.zone', source: 'Hostel_Building', needs: [],
    note: 'One row per hostel. Floors are created as Floor 1 to Floor n.', count: 'select count(*)::int as n from hostel.hostel_profile',
    columns: [
      { key: 'hostel_code', label: 'Hostel code', required: true, hint: '2 to 8 letters or digits; prefix of every room ID', sample: 'BH2' },
      { key: 'hostel_name', label: 'Hostel name', required: true, sample: 'Boys Hostel 2', aliases: ['name', 'facility name', 'building name'] },
      { key: 'gender', label: 'For', required: true, hint: 'Boys, Girls or Staff', sample: 'Boys', aliases: ['hostel gender', 'for'] },
      { key: 'floors', label: 'Floors', required: true, sample: '6', aliases: ['no of floors', 'number of floors'] },
      { key: 'gate_close_time', label: 'Gate closes', hint: 'HH:MM, 24 hour', sample: '21:30', aliases: ['gate close', 'closing time'] },
    ],
    key: (c) => String(c.hostel_code),
    validate: (r) => {
      const code = need(r.hostel_code, 'Hostel code').toUpperCase(); if (!/^[A-Z0-9]{2,8}$/.test(code)) throw new Error('Hostel code must be 2 to 8 letters or digits');
      const t = r.gate_close_time || '21:30'; if (!/^\d{1,2}:\d{2}/.test(t)) throw new Error('Gate closes must be a time like 21:30');
      return { hostel_code: code, facility_id: `H-${code}`, hostel_name: need(r.hostel_name, 'Hostel name').slice(0, 120), gender: oneOf(r.gender, 'For', ['Boys', 'Girls', 'Staff'], { male: 'Boys', female: 'Girls', boy: 'Boys', girl: 'Girls' }), floors: whole(r.floors, 'Floors', 1, 30), gate_close_time: t.slice(0, 5) };
    },
    load: async (tx, rows, ctx) => {
      const x = sql`jsonb_to_recordset(${json(rows)}) as x(hostel_code text, facility_id text, hostel_name text, gender text, floors int, gate_close_time text)`;
      await tx.execute(sql`insert into ref.department (dept_code, dept_name) values ('HOSTELS', 'University Hostels') on conflict do nothing`);
      await tx.execute(sql`insert into infra.facility (facility_id, campus_id, facility_name, facility_type, no_of_floors)
        select x.facility_id, (select campus_id from infra.campus order by campus_id limit 1), x.hostel_name, 'Hostel'::infra.facility_type, x.floors from ${x}
        on conflict (facility_id) do update set facility_name = excluded.facility_name, no_of_floors = greatest(coalesce(infra.facility.no_of_floors, 0), excluded.no_of_floors)`);
      await tx.execute(sql`insert into hostel.hostel_profile (facility_id, hostel_code, hostel_gender, dept_code, gate_close_time, created_by)
        select x.facility_id, x.hostel_code, x.gender::hostel.hostel_gender, 'HOSTELS', x.gate_close_time::time, ${ctx.user.id} from ${x}
        on conflict (facility_id) do update set gate_close_time = excluded.gate_close_time, updated_by = ${ctx.user.id}`);
      await tx.execute(sql`insert into infra.zone (zone_id, facility_id, zone_name, zone_type, sequence_no)
        select x.hostel_code || '-F' || n, x.facility_id, 'Floor ' || n, 'Floor'::infra.zone_type, n from ${x}, generate_series(1, x.floors) n on conflict (zone_id) do nothing`);
    },
  },
  {
    kind: 'room_types', order: 2, title: 'Room types', target: 'hostel.room_type', source: 'Hostel_Room_Type', needs: [],
    note: 'Sharing is the number of beds a room of this type gets.', count: "select count(*)::int as n from hostel.room_type where status = 'Active'",
    columns: [
      { key: 'type_name', label: 'Room type', required: true, sample: '3-sharing AC', aliases: ['room type', 'name'] },
      { key: 'sharing_count', label: 'Beds in a room', required: true, sample: '3', aliases: ['sharing', 'beds'] },
      { key: 'is_ac', label: 'Air conditioned', hint: 'Yes or No', sample: 'Yes', aliases: ['ac'] },
      { key: 'attached_bath', label: 'Attached bathroom', hint: 'Yes or No', sample: 'Yes', aliases: ['attached bathroom', 'bath'] },
    ],
    key: (c) => norm(String(c.type_name)),
    validate: (r) => ({ type_name: need(r.type_name, 'Room type').slice(0, 60), sharing_count: whole(r.sharing_count, 'Beds in a room', 1, 12), is_ac: yes(r.is_ac, false), attached_bath: yes(r.attached_bath, false) }),
    load: async (tx, rows) => {
      await tx.execute(sql`insert into hostel.room_type (type_name, sharing_count, is_ac, attached_bath)
        select x.type_name, x.sharing_count, x.is_ac, x.attached_bath from jsonb_to_recordset(${json(rows)}) as x(type_name text, sharing_count int, is_ac boolean, attached_bath boolean)
        on conflict (type_name) do update set is_ac = excluded.is_ac, attached_bath = excluded.attached_bath`);
    },
  },
  {
    kind: 'rooms', order: 3, title: 'Rooms and beds', target: 'infra.space, hostel.room_profile, infra.subspace', source: 'Infra_Space', needs: ['hostels', 'types'],
    note: 'One row per room. Beds are created from the room type. A missing floor is created.', count: "select count(*)::int as n from infra.space s join infra.zone z on z.zone_id = s.zone_id join hostel.hostel_profile hp on hp.facility_id = z.facility_id where s.space_category = 'Hostel_Room'",
    columns: [
      { key: 'hostel_code', label: 'Hostel code', required: true, sample: 'BH2', aliases: ['hostel'] },
      { key: 'floor_no', label: 'Floor number', required: true, sample: '1', aliases: ['floor'] },
      { key: 'room_no', label: 'Room number', required: true, hint: 'Up to 6 letters or digits', sample: '101', aliases: ['room', 'room number'] },
      { key: 'room_type', label: 'Room type', hint: 'Needed for hostel rooms; must exist in Room types', sample: '3-sharing AC', aliases: ['type'] },
      { key: 'category', label: 'Kind of place', hint: 'Hostel_Room (default), Toilet_Block, Common_Area, Store, Mess_Hall, Office', sample: 'Hostel_Room', aliases: ['space category', 'kind'] },
      { key: 'reserved_for', label: 'Reserved for', hint: 'None (default), Staff, Guest, Medical', sample: 'None', aliases: ['reserved'] },
      { key: 'accessible', label: 'Accessible room', hint: 'Yes or No', sample: 'No', aliases: ['is accessible'] },
    ],
    key: (c) => String(c.space_id),
    validate: (r, ctx) => {
      const code = need(r.hostel_code, 'Hostel code').toUpperCase(); const fid = ctx.hostels.get(code); if (!fid) throw new Error('Hostel code is not in Hostel buildings; upload the hostel first');
      const floor = whole(r.floor_no, 'Floor number', 1, 40); const no = need(r.room_no, 'Room number'); if (!/^[A-Za-z0-9]{1,6}$/.test(no)) throw new Error('Room number must be up to 6 letters or digits');
      const category = oneOf(r.category, 'Kind of place', ['Hostel_Room', 'Toilet_Block', 'Common_Area', 'Store', 'Mess_Hall', 'Office'], { room: 'Hostel_Room' }, 'Hostel_Room');
      const isRoom = category === 'Hostel_Room'; const t = isRoom ? ctx.types.get(norm(need(r.room_type, 'Room type'))) : undefined;
      if (isRoom && !t) throw new Error('Room type is not in Room types; upload it first');
      return { facility_id: fid, hostel_code: code, floor_no: floor, zone_id: `${code}-F${floor}`, room_no: no, space_id: `${code}-${no}`, space_name: isRoom ? `Room ${no}` : `${category.replace(/_/g, ' ')} ${no}`, category,
        room_type_id: t?.id ?? null, sharing: t?.sharing ?? 0, is_ac: t?.is_ac ?? false, reserved_for: oneOf(r.reserved_for, 'Reserved for', ['None', 'Staff', 'Guest', 'Medical'], {}, 'None'), accessible: yes(r.accessible, false) };
    },
    load: async (tx, rows, ctx) => {
      const x = sql`jsonb_to_recordset(${json(rows)}) as x(facility_id text, hostel_code text, floor_no int, zone_id text, room_no text, space_id text, space_name text, category text, room_type_id int, sharing int, is_ac boolean, reserved_for text, accessible boolean)`;
      await tx.execute(sql`insert into infra.zone (zone_id, facility_id, zone_name, zone_type, sequence_no) select distinct x.zone_id, x.facility_id, 'Floor ' || x.floor_no, 'Floor'::infra.zone_type, x.floor_no from ${x} on conflict (zone_id) do nothing`);
      await tx.execute(sql`insert into infra.space (space_id, zone_id, space_code, space_name, space_category, capacity, has_ac)
        select x.space_id, x.zone_id, x.room_no, x.space_name, x.category::infra.space_category, x.sharing, x.is_ac from ${x} on conflict (space_id) do nothing`);
      await tx.execute(sql`insert into hostel.room_profile (space_id, room_type_id, reserved_for, is_accessible, created_by)
        select x.space_id, x.room_type_id, x.reserved_for::hostel.reserved_for, x.accessible, ${ctx.user.id} from ${x} where x.category = 'Hostel_Room'
        on conflict (space_id) do update set reserved_for = excluded.reserved_for, is_accessible = excluded.is_accessible, updated_by = ${ctx.user.id}`);
      await tx.execute(sql`insert into infra.subspace (subspace_id, space_id, subspace_code, subspace_type)
        select x.space_id || '-B' || n, x.space_id, chr(64 + n), 'Bed'::infra.subspace_type from ${x}, generate_series(1, x.sharing) n where x.category = 'Hostel_Room' on conflict (subspace_id) do nothing`);
      await tx.execute(sql`update infra.facility f set no_of_floors = m.top from (select x.facility_id, max(x.floor_no) as top from ${x} group by 1) m where m.facility_id = f.facility_id and coalesce(f.no_of_floors, 0) < m.top`);
    },
  },
  {
    kind: 'fees', order: 4, title: 'Fees by room type', target: 'hostel.room_type_fee', source: 'Hostel_Fee', needs: ['hostels', 'types', 'years'],
    note: 'One row per hostel, room type and academic year. Uploading again replaces the amounts.', count: 'select count(*)::int as n from hostel.room_type_fee f where f.academic_year = (select academic_year from hostel.academic_year where is_current)',
    columns: [
      { key: 'hostel_code', label: 'Hostel code', required: true, sample: 'BH2', aliases: ['hostel'] },
      { key: 'room_type', label: 'Room type', required: true, sample: '3-sharing AC', aliases: ['type'] },
      { key: 'academic_year', label: 'Academic year', required: true, sample: '2026-27', aliases: ['year'] },
      { key: 'registration_fee', label: 'Registration fee', required: true, hint: 'Not refundable', sample: '5000' },
      { key: 'hostel_fee', label: 'Hostel fee a year', required: true, sample: '105000', aliases: ['annual fee', 'hostel fee a year'] },
      { key: 'instalment_1_pct', label: 'First instalment %', required: true, sample: '60', aliases: ['first instalment', 'instalment 1'] },
      { key: 'instalment_2_due_date', label: 'Second instalment due', required: true, hint: 'DD-MM-YYYY', sample: '15-12-2026', aliases: ['second instalment due', 'instalment 2 due'] },
      { key: 'caution_deposit', label: 'Caution deposit', hint: 'Refundable, on joining only; empty keeps 10000', sample: '10000', aliases: ['caution deposit', 'security deposit'] },
      { key: 'elec_caution_deposit', label: 'Electricity deposit', hint: 'Refundable, on joining only; empty keeps 2000', sample: '2000', aliases: ['electricity caution deposit', 'electricity deposit'] },
      { key: 'meter_charge', label: 'Meter charge a year', hint: 'Every year, also on renewal; empty keeps 500', sample: '500', aliases: ['meter charge', 'electricity meter charge'] },
    ],
    key: (c) => `${c.facility_id}|${c.room_type_id}|${c.academic_year}`,
    validate: (r, ctx) => {
      const fid = ctx.hostels.get(need(r.hostel_code, 'Hostel code').toUpperCase()); if (!fid) throw new Error('Hostel code is not in Hostel buildings');
      const t = ctx.types.get(norm(need(r.room_type, 'Room type'))); if (!t) throw new Error('Room type is not in Room types');
      const year = need(r.academic_year, 'Academic year'); if (!ctx.years.has(year)) throw new Error('Academic year is not defined; add it under Masters first');
      return { facility_id: fid, room_type_id: t.id, academic_year: year, registration_fee: amount(r.registration_fee, 'Registration fee'), hostel_fee: amount(r.hostel_fee, 'Hostel fee a year'),
        instalment_1_pct: whole(r.instalment_1_pct, 'First instalment %', 1, 100), instalment_2_due_date: isoDate(r.instalment_2_due_date, 'Second instalment due', true),
        caution_deposit: r.caution_deposit ? amount(r.caution_deposit, 'Caution deposit') : null, elec_caution_deposit: r.elec_caution_deposit ? amount(r.elec_caution_deposit, 'Electricity deposit') : null,
        meter_charge: r.meter_charge ? amount(r.meter_charge, 'Meter charge a year') : null };
    },
    load: async (tx, rows) => {
      await tx.execute(sql`insert into hostel.room_type_fee (room_type_id, facility_id, academic_year, registration_fee, hostel_fee, instalment_1_pct, instalment_2_due_date, caution_deposit, elec_caution_deposit, meter_charge)
        select x.room_type_id, x.facility_id, x.academic_year, x.registration_fee, x.hostel_fee, x.instalment_1_pct, x.instalment_2_due_date,
               coalesce(x.caution_deposit, 10000), coalesce(x.elec_caution_deposit, 2000), coalesce(x.meter_charge, 500)
        from jsonb_to_recordset(${json(rows)}) as x(room_type_id int, facility_id text, academic_year text, registration_fee numeric, hostel_fee numeric, instalment_1_pct numeric, instalment_2_due_date date,
             caution_deposit numeric, elec_caution_deposit numeric, meter_charge numeric)
        on conflict (room_type_id, facility_id, academic_year) do update set registration_fee = excluded.registration_fee, hostel_fee = excluded.hostel_fee, instalment_1_pct = excluded.instalment_1_pct,
          instalment_2_due_date = excluded.instalment_2_due_date`);
      // the deposits and meter charge change only where the file gives them
      await tx.execute(sql`update hostel.room_type_fee f set caution_deposit = coalesce(x.caution_deposit, f.caution_deposit),
          elec_caution_deposit = coalesce(x.elec_caution_deposit, f.elec_caution_deposit), meter_charge = coalesce(x.meter_charge, f.meter_charge)
        from jsonb_to_recordset(${json(rows)}) as x(room_type_id int, facility_id text, academic_year text, caution_deposit numeric, elec_caution_deposit numeric, meter_charge numeric)
        where f.room_type_id = x.room_type_id and f.facility_id = x.facility_id and f.academic_year = x.academic_year`);
    },
  },
  {
    kind: 'assets', order: 5, title: 'Room assets', target: 'infra.asset_master', source: 'Infra_Asset', needs: ['hostels', 'spaces'],
    note: 'One row per tagged item (cot, table, chair, fan). This is the handover list at check-in and the damage list at check-out.', count: "select count(*)::int as n from infra.asset_master where status = 'Active'",
    columns: [
      { key: 'hostel_code', label: 'Hostel code', required: true, sample: 'BH2', aliases: ['hostel'] },
      { key: 'room_no', label: 'Room number', required: true, sample: '101', aliases: ['room'] },
      { key: 'asset_id', label: 'Asset tag', required: true, hint: 'The number on the sticker; unique across the university', sample: 'BH2-101-COT1', aliases: ['asset tag', 'tag', 'tag no'] },
      { key: 'asset_name', label: 'Item', required: true, sample: 'Cot', aliases: ['item', 'name'] },
      { key: 'category', label: 'Category', required: true, hint: 'Furniture, Electrical, IT, Plumbing, Civil, Meter, Other', sample: 'Furniture', aliases: ['asset category'] },
      { key: 'make_model', label: 'Make and model', sample: 'Godrej steel cot', aliases: ['make', 'model'] },
      { key: 'serial_no', label: 'Serial number', sample: '', aliases: ['serial'] },
      { key: 'purchase_date', label: 'Purchased on', hint: 'DD-MM-YYYY', sample: '01-06-2025' },
      { key: 'cost', label: 'Cost', sample: '4500' },
      { key: 'warranty_expiry', label: 'Warranty until', hint: 'DD-MM-YYYY', sample: '', aliases: ['warranty'] },
      { key: 'condition', label: 'Condition', hint: 'Good (default), Fair, Poor, Scrap', sample: 'Good' },
    ],
    key: (c) => String(c.asset_id),
    validate: (r, ctx) => {
      const code = need(r.hostel_code, 'Hostel code').toUpperCase(); if (!ctx.hostels.has(code)) throw new Error('Hostel code is not in Hostel buildings');
      const space = `${code}-${need(r.room_no, 'Room number')}`; if (!ctx.spaces.has(space)) throw new Error('Room is not in Rooms and beds; upload the room first');
      const id = need(r.asset_id, 'Asset tag'); if (id.length > 30) throw new Error('Asset tag must be 30 characters or fewer');
      return { asset_id: id, space_id: space, asset_name: need(r.asset_name, 'Item').slice(0, 120), category: oneOf(r.category, 'Category', ['Furniture', 'Electrical', 'IT', 'Lab_Equipment', 'Sports_Equipment', 'Plumbing', 'Civil', 'Meter', 'Other'], { electronics: 'Electrical', electric: 'Electrical' }),
        make_model: cut(r.make_model, 120), serial_no: cut(r.serial_no, 60), purchase_date: isoDate(r.purchase_date, 'Purchased on'), cost: r.cost ? amount(r.cost, 'Cost') : null, warranty_expiry: isoDate(r.warranty_expiry, 'Warranty until'),
        condition: oneOf(r.condition, 'Condition', ['Good', 'Fair', 'Poor', 'Scrap'], {}, 'Good') };
    },
    load: async (tx, rows) => {
      await tx.execute(sql`insert into infra.asset_master (asset_id, space_id, asset_name, asset_category, make_model, serial_no, purchase_date, cost, warranty_expiry, condition)
        select x.asset_id, x.space_id, x.asset_name, x.category::infra.asset_category, x.make_model, x.serial_no, x.purchase_date, x.cost, x.warranty_expiry, x.condition::infra.asset_condition
        from jsonb_to_recordset(${json(rows)}) as x(asset_id text, space_id text, asset_name text, category text, make_model text, serial_no text, purchase_date date, cost numeric, warranty_expiry date, condition text)
        on conflict (asset_id) do update set space_id = excluded.space_id, asset_name = excluded.asset_name, asset_category = excluded.asset_category, make_model = excluded.make_model, serial_no = excluded.serial_no,
          purchase_date = excluded.purchase_date, cost = excluded.cost, warranty_expiry = excluded.warranty_expiry, condition = excluded.condition`);
    },
  },
  {
    kind: 'meters', order: 6, title: 'Room meters', target: 'hostel.room_meter', source: 'Hostel_Meter', needs: ['hostels', 'spaces', 'metered'],
    note: 'One active electricity meter per room. A smart prepaid meter needs its device reference.', count: "select count(*)::int as n from hostel.room_meter where status = 'Active'",
    columns: [
      { key: 'hostel_code', label: 'Hostel code', required: true, sample: 'BH2', aliases: ['hostel'] },
      { key: 'room_no', label: 'Room number', required: true, sample: '101', aliases: ['room'] },
      { key: 'meter_no', label: 'Meter number', required: true, sample: 'MTR-BH2-101', aliases: ['meter'] },
      { key: 'meter_type', label: 'Meter type', required: true, hint: 'Manual or Smart_Prepaid', sample: 'Manual', aliases: ['type'] },
      { key: 'device_ref', label: 'Device reference', hint: 'Needed for Smart_Prepaid', sample: '', aliases: ['device'] },
      { key: 'installed_on', label: 'Installed on', required: true, hint: 'DD-MM-YYYY', sample: '01-06-2026', aliases: ['installed'] },
    ],
    key: (c) => String(c.meter_no),
    validate: (r, ctx) => {
      const code = need(r.hostel_code, 'Hostel code').toUpperCase(); if (!ctx.hostels.has(code)) throw new Error('Hostel code is not in Hostel buildings');
      const space = `${code}-${need(r.room_no, 'Room number')}`; if (!ctx.spaces.has(space)) throw new Error('Room is not in Rooms and beds; upload the room first');
      const no = need(r.meter_no, 'Meter number').slice(0, 40); const has = ctx.metered.get(space); if (has && has !== no) throw new Error('This room already has an active meter');
      const type = oneOf(r.meter_type, 'Meter type', ['Manual', 'Smart_Prepaid'], { smart: 'Smart_Prepaid', prepaid: 'Smart_Prepaid' }); if (type === 'Smart_Prepaid' && !r.device_ref) throw new Error('Device reference is needed for a smart prepaid meter');
      return { space_id: space, meter_no: no, meter_type: type, device_ref: cut(r.device_ref, 60), installed_on: isoDate(r.installed_on, 'Installed on', true) };
    },
    load: async (tx, rows, ctx) => {
      await tx.execute(sql`insert into hostel.room_meter (space_id, meter_no, meter_type, device_ref, installed_on, created_by)
        select x.space_id, x.meter_no, x.meter_type::hostel.meter_type, x.device_ref, x.installed_on, ${ctx.user.id}
        from jsonb_to_recordset(${json(rows)}) as x(space_id text, meter_no text, meter_type text, device_ref text, installed_on date)
        on conflict (meter_no) do update set meter_type = excluded.meter_type, device_ref = excluded.device_ref, installed_on = excluded.installed_on, updated_by = ${ctx.user.id}`);
    },
  },
  {
    kind: 'staff', order: 7, title: 'Staff and managers', target: 'ref.staff_master, portal.app_user', source: 'ERP_Staff', needs: [],
    note: 'Wardens, office, accounts, security, mess and maintenance staff. The ERP employee export uploads as it is; identification, bank and dependent columns are dropped.', count: "select count(*)::int as n from ref.staff_master where status = 'Active'",
    columns: [
      { key: 'staff_id', label: 'Employee ID', required: true, sample: 'E1042', aliases: ['uni id', 'emp id', 'employee id'] },
      { key: 'salutation', label: 'Title', sample: 'Mr.', aliases: ['salutation shortname'] },
      { key: 'first_name', label: 'First name', required: true, sample: 'Ramesh', aliases: ['firstname'] },
      { key: 'middle_name', label: 'Middle name', sample: '', aliases: ['middlename'] },
      { key: 'last_name', label: 'Last name', sample: 'Babu', aliases: ['lastname'] },
      { key: 'gender', label: 'Gender', required: true, hint: 'Male, Female or Other', sample: 'Male', aliases: ['gendershortname'] },
      { key: 'dept_code', label: 'Department', required: true, hint: 'Department code; added if it is new', sample: 'HOSTELS', aliases: ['department', 'dept'] },
      { key: 'designation', label: 'Designation', required: true, sample: 'Floor Manager' },
      { key: 'staff_type', label: 'Staff type', hint: 'Warden, Admin, Security, Mess, Maintenance, Housekeeping, Faculty…; worked out from the designation if empty', sample: 'Warden' },
      { key: 'mobile_no', label: 'Mobile', required: true, hint: '10 digits', sample: '9000012345', aliases: ['mobile number', 'mobile'] },
      { key: 'official_email', label: 'Official e-mail', sample: 'ramesh.b@kluniversity.in', aliases: ['official email', 'email'] },
      { key: 'personal_email', label: 'Personal e-mail', sample: '', aliases: ['personalemail'] },
      { key: 'joining_date', label: 'Joined on', hint: 'DD-MM-YYYY', sample: '01-07-2022', aliases: ['joiningdate'] },
    ],
    key: (c) => String(c.staff_id),
    validate: (r) => {
      const id = need(r.staff_id, 'Employee ID'); if (id.length > 20) throw new Error('Employee ID must be 20 characters or fewer');
      const m = mobile(r.mobile_no); if (!m) throw new Error('Mobile must be a 10-digit Indian number');
      const designation = need(r.designation, 'Designation').slice(0, 80);
      return { staff_id: id, salutation: cut(r.salutation, 10), first_name: need(r.first_name, 'First name').slice(0, 80), middle_name: cut(r.middle_name, 80), last_name: cut(r.last_name, 80),
        gender: oneOf(r.gender, 'Gender', ['Male', 'Female', 'Other'], GENDER), dept_code: need(deptCode(r.dept_code) ?? undefined, 'Department'), dept_name: (r.dept_code ?? '').slice(0, 120), designation,
        staff_type: oneOf(r.staff_type, 'Staff type', STAFF_TYPES, {}, staffTypeFrom(designation)), mobile_no: m, official_email: email(r.official_email), personal_email: email(r.personal_email), joining_date: isoDate(r.joining_date, 'Joined on') };
    },
    load: async (tx, rows, _ctx, batchId) => {
      const x = sql`jsonb_to_recordset(${json(rows)}) as x(staff_id text, salutation text, first_name text, middle_name text, last_name text, gender text, dept_code text, dept_name text, designation text, staff_type text, mobile_no text, official_email text, personal_email text, joining_date date)`;
      await tx.execute(sql`insert into ref.department (dept_code, dept_name) select distinct on (x.dept_code) x.dept_code, coalesce(nullif(x.dept_name, ''), x.dept_code) from ${x} on conflict (dept_code) do nothing`);
      await tx.execute(sql`insert into ref.staff_master (staff_id, salutation, first_name, middle_name, last_name, gender, dept_code, designation, staff_type, mobile_no, official_email, personal_email, joining_date, synced_at, import_batch_id)
        select x.staff_id, x.salutation, x.first_name, x.middle_name, x.last_name, x.gender::ref.gender, x.dept_code, x.designation, x.staff_type::ref.staff_type, x.mobile_no, x.official_email, x.personal_email, x.joining_date, now(), ${batchId} from ${x}
        on conflict (staff_id) do update set salutation = excluded.salutation, first_name = excluded.first_name, middle_name = excluded.middle_name, last_name = excluded.last_name, gender = excluded.gender, dept_code = excluded.dept_code,
          designation = excluded.designation, staff_type = excluded.staff_type, mobile_no = excluded.mobile_no, official_email = excluded.official_email, personal_email = excluded.personal_email, joining_date = excluded.joining_date, synced_at = now(), import_batch_id = coalesce(excluded.import_batch_id, ref.staff_master.import_batch_id)`);
      await tx.execute(sql`insert into portal.app_user (staff_id, full_name, email, title, home_dept)
        select sm.staff_id, sm.full_name, case when exists (select 1 from portal.app_user u where u.email = sm.official_email) then null else sm.official_email end, sm.designation, sm.dept_code
        from ref.staff_master sm join ${x} on x.staff_id = sm.staff_id where not exists (select 1 from portal.app_user u where u.staff_id = sm.staff_id)`);
    },
  },
  {
    kind: 'duties', order: 8, title: 'Warden duties', target: 'hostel.staff_space_assignment, portal.user_role', source: 'Hostel_Duty', needs: ['hostels', 'zones', 'spaces', 'staff', 'roles'],
    note: 'Who is responsible for which hostel, floor or area. Add the written approval reference to give the matching role at the same time.', count: "select count(*)::int as n from hostel.staff_space_assignment where status = 'Active'",
    columns: [
      { key: 'staff_id', label: 'Employee ID', required: true, sample: 'E1042', aliases: ['employee id', 'emp id'] },
      { key: 'hostel_role', label: 'Duty', required: true, hint: 'Chief_Warden, Warden, Floor_Warden, Office_Staff, Security_Guard, Mess_Incharge, Maintenance_Supervisor…', sample: 'Floor_Warden', aliases: ['role', 'duty'] },
      { key: 'hostel_code', label: 'Hostel code', required: true, sample: 'BH2', aliases: ['hostel'] },
      { key: 'floor_no', label: 'Floor number', hint: 'Empty means the whole hostel', sample: '1', aliases: ['floor'] },
      { key: 'area', label: 'Area', hint: 'Room or area number, for a duty on one place', sample: '', aliases: ['room no', 'space'] },
      { key: 'shift', label: 'Shift', hint: 'General (default), Morning, Evening, Night', sample: 'General' },
      { key: 'show_on_qr', label: 'Show on door labels', hint: 'Yes or No', sample: 'Yes', aliases: ['show on labels'] },
      { key: 'approval_ref', label: 'Written approval', hint: 'File or letter number; when given, the role is granted too', sample: 'HO/2026/ROLES/12', aliases: ['approval'] },
    ],
    key: (c) => `${c.staff_id}|${c.hostel_role}|${c.facility_id}|${c.zone_id}|${c.space_id}|${c.shift}`,
    validate: (r, ctx) => {
      const id = need(r.staff_id, 'Employee ID'); if (!ctx.staff.has(id)) throw new Error('Employee ID is not in Staff and wardens; upload the staff first');
      const role = ctx.roles.get(norm(need(r.hostel_role, 'Duty'))); if (!role) throw new Error('Duty is not a known role code');
      const code = need(r.hostel_code, 'Hostel code').toUpperCase(); const fid = ctx.hostels.get(code); if (!fid) throw new Error('Hostel code is not in Hostel buildings');
      const zone = r.floor_no ? `${code}-F${whole(r.floor_no, 'Floor number', 1, 40)}` : null; if (zone && !ctx.zones.has(zone)) throw new Error('Floor does not exist in that hostel');
      const space = r.area ? `${code}-${r.area}` : null; if (space && !ctx.spaces.has(space)) throw new Error('Area does not exist in that hostel');
      if (r.approval_ref && id === ctx.user.id) throw new Error('A role cannot be given to oneself');
      return { staff_id: id, hostel_role: role, facility_id: fid, zone_id: zone, space_id: space, shift: oneOf(r.shift, 'Shift', ['General', 'Morning', 'Evening', 'Night'], {}, 'General'), show_on_qr: yes(r.show_on_qr, true), approval_ref: cut(r.approval_ref, 80) };
    },
    load: async (tx, rows, ctx) => {
      const x = sql`jsonb_to_recordset(${json(rows)}) as x(staff_id text, hostel_role text, facility_id text, zone_id text, space_id text, shift text, show_on_qr boolean, approval_ref text)`;
      await tx.execute(sql`insert into hostel.staff_space_assignment (staff_id, hostel_role, facility_id, zone_id, space_id, shift, show_on_qr, created_by)
        select x.staff_id, x.hostel_role, x.facility_id, x.zone_id, x.space_id, x.shift::hostel.shift, x.show_on_qr, ${ctx.user.id} from ${x}
        where not exists (select 1 from hostel.staff_space_assignment a where a.staff_id = x.staff_id and a.hostel_role = x.hostel_role and a.facility_id = x.facility_id
          and a.zone_id is not distinct from x.zone_id and a.space_id is not distinct from x.space_id and a.shift = x.shift::hostel.shift and a.status = 'Active')`);
      await tx.execute(sql`insert into portal.user_role (user_id, role_code, scope_dept, granted_by, approval_ref)
        select distinct u.user_id, x.hostel_role, 'HOSTELS', ${ctx.user.id}, x.approval_ref from ${x} join portal.app_user u on u.staff_id = x.staff_id where x.approval_ref is not null on conflict do nothing`);
    },
  },
  {
    kind: 'students', order: 9, title: 'Students', target: 'ref.student_master, hostel.student_contact, ref.student_address', source: 'ERP_Student', needs: [],
    note: 'The ERP student profile export uploads as it is. The Identity Number column (Aadhaar) is dropped in the browser and never stored. Parent mobile numbers become contacts, still to be verified by OTP.', count: 'select count(*)::int as n from ref.student_master',
    columns: [
      { key: 'student_id', label: 'University ID', required: true, sample: '2600040030', aliases: ['university id', 'id'] },
      { key: 'full_name', label: 'Student name', required: true, sample: 'ANIL KUMAR', aliases: ['studentname', 'name'] },
      { key: 'gender', label: 'Gender', required: true, hint: 'Decides which hostels are offered', sample: 'Male' },
      { key: 'student_type', label: 'Level', required: true, hint: 'UG, PG, PhD…', sample: 'UG', aliases: ['student type', 'level'] },
      { key: 'programme', label: 'Programme', required: true, sample: 'Btech CSE', aliases: ['degree'] },
      { key: 'date_of_birth', label: 'Date of birth', required: true, hint: 'DD-MM-YYYY', sample: '14-08-2007', aliases: ['dob'] },
      { key: 'personal_email', label: 'E-mail', required: true, sample: 'anil.kumar@example.com', aliases: ['email'] },
      { key: 'dept_code', label: 'Department', sample: 'CSE', aliases: ['department', 'dept'] },
      { key: 'father_name', label: "Father's name", sample: 'S KUMAR' },
      { key: 'mother_name', label: "Mother's name", sample: 'R LAKSHMI' },
      { key: 'father_mobile', label: 'Father mobile', hint: '10 digits', sample: '9440012345' },
      { key: 'mother_mobile', label: 'Mother mobile', sample: '' },
      { key: 'guardian_mobile', label: 'Guardian mobile', sample: '' },
      { key: 'contact_no', label: 'Contact numbers (ERP format)', hint: 'Mobile:Father-98480…|| Mobile:Self-…', sample: '' },
      { key: 'admission_type', label: 'Admission type', hint: 'Regular (default), Distance, Lateral Entry', sample: 'Regular' },
      { key: 'offering_mode', label: 'Mode', sample: 'Regular', aliases: ['degree offering mode'] },
      { key: 'regulation', label: 'Regulation', sample: 'R26' },
      { key: 'caste_category', label: 'Category', sample: 'OC', aliases: ['cast ctegory', 'caste category', 'category'] },
      { key: 'economic_status', label: 'Economic status', sample: '', aliases: ['economical status ebc non ebc'] },
      { key: 'family_income_band', label: 'Family income band', sample: '', aliases: ['family income 6 8 lpa 8 10 lpa above 10 lpa', 'family income'] },
      { key: 'nationality', label: 'Nationality', sample: 'Indian' },
      { key: 'religion', label: 'Religion', sample: '' },
      { key: 'blood_group', label: 'Blood group', sample: 'O+ve' },
      { key: 'disability', label: 'Disability', sample: 'NA' },
      { key: 'admission_date', label: 'Admission date', sample: '01-08-2026', aliases: ['admissiondate'] },
      { key: 'address', label: 'Address (ERP format)', hint: 'Hno:..|| Street:..|| City:..|| Pincode:..', sample: '' },
      { key: 'kleee_application_id', label: 'KLEEE application ID', sample: '' },
      { key: 'seat_status', label: 'Seat status', sample: '' },
    ],
    key: (c) => String(c.student_id),
    validate: (r) => {
      const id = need(r.student_id, 'University ID'); if (!/^[A-Za-z0-9]{5,20}$/.test(id)) throw new Error('University ID must be 5 to 20 letters or digits');
      const name = need(r.full_name, 'Student name').replace(/\s+/g, ' ').toUpperCase().slice(0, 160);
      const mail = email(r.personal_email); if (!mail) throw new Error('E-mail is missing or not an e-mail address');
      const contacts: { relation: string; name: string; mobile: string }[] = [];
      const add = (relation: string, nm: string | undefined, raw: string | undefined) => { const m = mobile(raw); if (m && !contacts.some((c) => c.relation === relation && c.mobile === m)) contacts.push({ relation, name: (nm || relation).slice(0, 120), mobile: m }); };
      add('Father', r.father_name, r.father_mobile); add('Mother', r.mother_name, r.mother_mobile); add('Guardian', 'Guardian', r.guardian_mobile);
      for (const part of (r.contact_no ?? '').split('||')) {
        const m = part.match(/^\s*[A-Za-z ]+:\s*([A-Za-z ]+)-\s*([\d +-]+)/); if (!m) continue;
        const rel = RELATION[m[1].trim().toLowerCase()] ?? 'Other';
        add(rel, rel === 'Father' ? r.father_name : rel === 'Mother' ? r.mother_name : rel === 'Self' ? name : rel, m[2]);
      }
      const addr: Record<string, string> = {};
      for (const part of (r.address ?? '').split('||')) { const i = part.indexOf(':'); if (i > 0) addr[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim(); }
      return {
        student_id: id, full_name: name, gender: oneOf(r.gender, 'Gender', ['Male', 'Female', 'Other'], GENDER),
        student_type: oneOf(r.student_type, 'Level', ['UG', 'PG', 'PhD', 'Certificate', 'Graduate_Diploma', 'PG_Diploma', 'PDF', 'JRF', 'SRF', 'Other'], {}, undefined),
        programme: need(r.programme, 'Programme').slice(0, 80), date_of_birth: isoDate(r.date_of_birth, 'Date of birth', true), personal_email: mail, dept_code: deptCode(r.dept_code),
        father_name: cut(r.father_name, 120), mother_name: cut(r.mother_name, 120),
        admission_type: oneOf(r.admission_type, 'Admission type', ['Regular', 'Distance', 'Lateral_Entry'], {}, 'Regular'),
        offering_mode: oneOf(r.offering_mode, 'Mode', ['Regular', 'Regular_PBL', 'Part_Time', 'Full_Time', 'Online', 'Distance'], { onlinemode: 'Online', distancemode: 'Distance' }, 'Regular'),
        regulation: cut(r.regulation, 10), caste_category: oneOf(r.caste_category, 'Category', ['OC', 'BC', 'Other_BC', 'General', 'SC', 'ST', 'EWS', 'NA'], {}, 'NA'),
        economic_status: cut(r.economic_status, 20), family_income_band: cut(r.family_income_band, 20), nationality: cut(r.nationality, 40), religion: cut(r.religion, 40),
        blood_group: oneOf(r.blood_group, 'Blood group', ['A+ve', 'A-ve', 'B+ve', 'B-ve', 'AB+ve', 'AB-ve', 'O+ve', 'O-ve', 'NA'], { apos: 'A+ve' }, 'NA'),
        disability: cut(r.disability, 60), admission_date: isoDate(r.admission_date, 'Admission date'), kleee_application_id: cut(r.kleee_application_id, 40), seat_status: cut(r.seat_status?.trim(), 20) || null,
        contacts, has_address: Object.keys(addr).length > 0, hno: cut(addr.hno, 80), street: cut(addr.street, 120), landmark: cut(addr.landmark, 160), district: cut(addr.district, 80), state: cut(addr.state, 80), city: cut(addr.city, 80), country: cut(addr.country, 60), pincode: cut(addr.pincode, 10),
      };
    },
    load: async (tx, rows, ctx, batchId) => {
      const x = sql`jsonb_to_recordset(${json(rows)}) as x(student_id text, full_name text, gender text, student_type text, programme text, date_of_birth date, personal_email text, dept_code text, father_name text, mother_name text,
        admission_type text, offering_mode text, regulation text, caste_category text, economic_status text, family_income_band text, nationality text, religion text, blood_group text, disability text, admission_date date,
        kleee_application_id text, seat_status text, contacts jsonb, has_address boolean, hno text, street text, landmark text, district text, state text, city text, country text, pincode text)`;
      await tx.execute(sql`insert into ref.department (dept_code, dept_name) select distinct x.dept_code, x.dept_code from ${x} where x.dept_code is not null on conflict (dept_code) do nothing`);
      await tx.execute(sql`insert into ref.student_master (student_id, full_name, gender, student_type, programme, date_of_birth, personal_email, dept_code, father_name, mother_name, admission_type, offering_mode, regulation, caste_category,
          economic_status, family_income_band, nationality, religion, blood_group, disability, admission_date, kleee_application_id, seat_status, synced_at, import_batch_id)
        select x.student_id, x.full_name, x.gender::ref.gender, x.student_type::ref.student_type, x.programme, x.date_of_birth, x.personal_email, x.dept_code, x.father_name, x.mother_name, x.admission_type::ref.admission_type, x.offering_mode::ref.offering_mode,
          x.regulation, x.caste_category::ref.caste_category, x.economic_status, x.family_income_band, coalesce(x.nationality, 'Indian'), x.religion, x.blood_group::ref.blood_group, x.disability, x.admission_date, x.kleee_application_id, x.seat_status, now(), ${batchId} from ${x}
        on conflict (student_id) do update set full_name = excluded.full_name, gender = excluded.gender, student_type = excluded.student_type, programme = excluded.programme, date_of_birth = excluded.date_of_birth, personal_email = excluded.personal_email,
          dept_code = coalesce(excluded.dept_code, ref.student_master.dept_code), father_name = excluded.father_name, mother_name = excluded.mother_name, admission_type = excluded.admission_type, offering_mode = excluded.offering_mode, regulation = excluded.regulation,
          caste_category = excluded.caste_category, economic_status = excluded.economic_status, family_income_band = excluded.family_income_band, nationality = excluded.nationality, religion = excluded.religion, blood_group = excluded.blood_group,
          disability = excluded.disability, admission_date = excluded.admission_date, kleee_application_id = excluded.kleee_application_id, seat_status = excluded.seat_status, synced_at = now(), import_batch_id = coalesce(excluded.import_batch_id, ref.student_master.import_batch_id)`);
      await tx.execute(sql`insert into hostel.student_contact (student_id, relation, contact_name, mobile_no, created_by)
        select x.student_id, (c->>'relation')::hostel.contact_relation, c->>'name', c->>'mobile', ${ctx.user.id} from ${x}, jsonb_array_elements(x.contacts) c on conflict (student_id, relation, mobile_no) do nothing`);
      await tx.execute(sql`insert into ref.student_address (student_id, address_type, seq_no, hno, street, landmark, district, state, city, country, pincode)
        select x.student_id, 'Permanent'::ref.address_type, 1, x.hno, x.street, x.landmark, x.district, x.state, x.city, x.country, x.pincode from ${x} where x.has_address
        on conflict (student_id, address_type, seq_no) do update set hno = excluded.hno, street = excluded.street, landmark = excluded.landmark, district = excluded.district, state = excluded.state, city = excluded.city, country = excluded.country, pincode = excluded.pincode`);
    },
  },
  {
    kind: 'bed_map', order: 10, title: 'Students in beds', target: 'hostel.hostel_registration, hostel.room_offer, hostel.hostel_allocation', source: 'Hostel_Bed_Map', needs: ['hostels', 'beds', 'students', 'years'],
    note: 'Students already living in the hostel: each row puts one student in one bed. The registration fee is marked waived and the fees as checked, so the stay starts at once. The bed must be vacant and the hostel must match the student\'s gender.',
    count: "select count(*)::int as n from hostel.hostel_allocation where status = 'Active' and occupant_type = 'Student'",
    columns: [
      { key: 'student_id', label: 'University ID', required: true, sample: '2600040011', aliases: ['university id', 'id'] },
      { key: 'hostel_code', label: 'Hostel code', required: true, sample: 'GH2', aliases: ['hostel'] },
      { key: 'room_no', label: 'Room number', required: true, sample: '101', aliases: ['room'] },
      { key: 'bed_no', label: 'Bed', required: true, hint: '1, 2, 3… or B1, B2', sample: '1', aliases: ['bed no', 'bed number'] },
      { key: 'key_no', label: 'Key number', sample: 'K-101-1', aliases: ['key'] },
      { key: 'check_in_date', label: 'Check-in date', hint: 'DD-MM-YYYY; empty means today', sample: '01-08-2026', aliases: ['from date', 'allotment date'] },
      { key: 'academic_year', label: 'Academic year', hint: 'Empty means the current year', sample: '', aliases: ['year'] },
    ],
    key: (c) => String(c.student_id),
    validate: (r, ctx) => {
      const id = need(r.student_id, 'University ID'); if (!ctx.students.has(id)) throw new Error('University ID is not in Students; upload the students first');
      if (ctx.housed.has(id)) throw new Error('Student already has a bed');
      const code = need(r.hostel_code, 'Hostel code').toUpperCase(); if (!ctx.hostels.has(code)) throw new Error('Hostel code is not in Hostel buildings');
      const g = ctx.genders.get(id), hg = ctx.hostelFor.get(code);
      if ((g === 'Male' && hg !== 'Boys') || (g === 'Female' && hg !== 'Girls')) throw new Error(`A ${g?.toLowerCase()} student cannot be put in a ${hg?.toLowerCase()} hostel`);
      const bedNo = need(r.bed_no, 'Bed').replace(/^b(ed)?[\s-]*/i, ''); if (!/^\d{1,2}$/.test(bedNo)) throw new Error('Bed must be a number such as 1 or B1');
      const bed = `${code}-${need(r.room_no, 'Room number')}-B${Number(bedNo)}`;
      const st = ctx.beds.get(bed); if (!st) throw new Error('No such bed in that room');
      if (st !== 'Vacant') throw new Error(`Bed is ${st.toLowerCase()}`);
      const year = r.academic_year ?? ctx.currentYear; if (!ctx.years.has(year)) throw new Error('Academic year is not in the master');
      return { student_id: id, subspace_id: bed, key_no: cut(r.key_no, 20), check_in_date: isoDate(r.check_in_date, 'Check-in date'), academic_year: year };
    },
    load: async (tx, rows, ctx) => {
      await tx.execute(sql`select hostel.fn_map_student_bed(x.student_id, x.subspace_id, x.academic_year, x.key_no, x.check_in_date, ${ctx.user.id})
        from jsonb_to_recordset(${json(rows)}) as x(student_id text, subspace_id text, key_no text, check_in_date date, academic_year text)`);
    },
  },
  {
    kind: 'opening_fees', order: 11, title: 'Fees already due and paid', target: 'hostel.fee_demand, hostel.fee_receipt', source: 'Opening_Fee', needs: ['students', 'years'],
    note: 'For going live: what each student owed and paid this year before the system. Each row makes one due and, when something was paid, one receipt. Deposits go in their own upload. Loading the same row again changes nothing.',
    count: "select count(*)::int as n from hostel.fee_demand where reference_type = 'opening_balance'",
    columns: [
      { key: 'student_id', label: 'University ID', required: true, sample: '2600040011', aliases: ['university id', 'id'] },
      { key: 'fee_head', label: 'Fee', required: true, hint: 'Hostel, Mess, Registration, Electricity, Meter charge, Damage, Fine', sample: 'Hostel', aliases: ['fee head', 'head'] },
      { key: 'instalment', label: 'Instalment', hint: '1 or 2 for the hostel fee; empty means 1', sample: '1', aliases: ['instalment no'] },
      { key: 'amount_due', label: 'Amount due', required: true, sample: '63000', aliases: ['due', 'amount'] },
      { key: 'amount_paid', label: 'Amount paid', hint: 'Empty means nothing paid yet', sample: '63000', aliases: ['paid'] },
      { key: 'due_date', label: 'Due date', required: true, hint: 'DD-MM-YYYY', sample: '10-08-2026' },
      { key: 'paid_on', label: 'Paid on', hint: 'DD-MM-YYYY', sample: '05-08-2026', aliases: ['payment date'] },
      { key: 'payment_mode', label: 'Paid by', hint: 'NEFT, RTGS, UPI, Card, Net banking, Cheque, DD, Cash', sample: 'NEFT', aliases: ['mode', 'payment mode'] },
      { key: 'reference', label: 'Reference', hint: 'UTR, transaction or cheque number; needed for UPI, card and net banking', sample: 'UTR2026080512345', aliases: ['utr', 'transaction id', 'receipt no'] },
    ],
    key: (c) => `${c.student_id}|${c.fee_head}|${c.instalment_no}|${c.due_date}`,
    validate: (r, ctx) => {
      const id = need(r.student_id, 'University ID'); if (!ctx.students.has(id)) throw new Error('University ID is not in Students; upload the students first');
      if (/deposit/i.test(r.fee_head ?? '')) throw new Error('Deposits go in the "Deposits already held" upload');
      const head = oneOf(r.fee_head, 'Fee', ['Hostel', 'Mess', 'Registration', 'Electricity', 'Meter_Charge', 'Damage', 'Fine'], { metercharge: 'Meter_Charge', meter: 'Meter_Charge', hostelfee: 'Hostel', messfee: 'Mess' });
      const inst = r.instalment ? whole(r.instalment, 'Instalment', 1, 2) : 1; if (inst === 2 && head !== 'Hostel') throw new Error('Only the hostel fee has a second instalment');
      const due = amount(r.amount_due, 'Amount due'), paid = r.amount_paid ? amount(r.amount_paid, 'Amount paid') : 0;
      if (paid > due) throw new Error('Amount paid is more than the amount due');
      const mode = paid > 0 ? oneOf(r.payment_mode, 'Paid by', ['NEFT', 'RTGS', 'UPI', 'Card', 'Net_Banking', 'Cheque', 'DD', 'Cash'], { netbanking: 'Net_Banking', bank: 'NEFT', imps: 'NEFT', online: 'Net_Banking' }) : null;
      if (mode && ['UPI', 'Card', 'Net_Banking'].includes(mode) && !r.reference) throw new Error('Reference is needed for UPI, card and net banking');
      return { student_id: id, fee_head: head, instalment_no: inst, amount_due: due, amount_paid: paid, due_date: isoDate(r.due_date, 'Due date', true),
        paid_on: paid > 0 ? (isoDate(r.paid_on, 'Paid on') ?? new Date().toISOString().slice(0, 10)) : null, payment_mode: mode, reference: cut(r.reference, 80) };
    },
    load: async (tx, rows, ctx) => {
      await tx.execute(sql`with x as (select * from jsonb_to_recordset(${json(rows)}) as x(student_id text, fee_head text, instalment_no int, amount_due numeric, amount_paid numeric, due_date date, paid_on date, payment_mode text, reference text)),
        d as (insert into hostel.fee_demand (student_id, fee_head, instalment_no, amount_due, due_date, reference_type, created_by)
              select x.student_id, x.fee_head::hostel.fee_head, x.instalment_no, x.amount_due, x.due_date, 'opening_balance', ${ctx.user.id} from x
              where not exists (select 1 from hostel.fee_demand e where e.student_id = x.student_id and e.fee_head::text = x.fee_head and e.instalment_no = x.instalment_no
                                  and e.due_date = x.due_date and e.reference_type = 'opening_balance')
              returning demand_id, student_id, fee_head::text as fee_head, instalment_no, due_date)
        insert into hostel.fee_receipt (demand_id, amount, paid_on, payment_mode, gateway_ref, gateway_status, collected_by, created_by)
        select d.demand_id, x.amount_paid, x.paid_on::timestamptz, x.payment_mode::hostel.payment_mode,
               case when x.payment_mode in ('UPI', 'Card', 'Net_Banking') then x.reference end, 'Success',
               case when x.payment_mode = 'Cash' then ${ctx.user.kind === 'staff' ? ctx.user.id : null} end, ${ctx.user.id}
        from d join x on x.student_id = d.student_id and x.fee_head = d.fee_head and x.instalment_no = d.instalment_no and x.due_date = d.due_date
        where x.amount_paid > 0`);
    },
  },
  {
    kind: 'opening_deposits', order: 12, title: 'Deposits already held', target: 'hostel.caution_entry', source: 'Opening_Deposit', needs: ['students'],
    note: 'For going live: the caution and electricity deposits the university already holds for each student. One line per student and deposit; a deposit already recorded is not added again.',
    count: "select count(*)::int as n from hostel.caution_entry where entry_type = 'Opening'",
    columns: [
      { key: 'student_id', label: 'University ID', required: true, sample: '2600040011', aliases: ['university id', 'id'] },
      { key: 'deposit', label: 'Deposit', hint: 'Caution or Electricity; empty means Caution', sample: 'Caution', aliases: ['deposit type', 'kind'] },
      { key: 'amount', label: 'Amount held', required: true, sample: '10000', aliases: ['amount', 'held'] },
      { key: 'paid_on', label: 'Paid on', hint: 'DD-MM-YYYY', sample: '01-08-2024', aliases: ['date', 'held since'] },
      { key: 'reference', label: 'Old receipt or ledger reference', sample: 'CD/2024/1123', aliases: ['receipt no', 'reference'] },
    ],
    key: (c) => `${c.student_id}|${c.kind}`,
    validate: (r, ctx) => {
      const id = need(r.student_id, 'University ID'); if (!ctx.students.has(id)) throw new Error('University ID is not in Students; upload the students first');
      const kind = oneOf(r.deposit, 'Deposit', ['Hostel', 'Electricity'], { caution: 'Hostel', cautiondeposit: 'Hostel', security: 'Hostel', electricitydeposit: 'Electricity', elec: 'Electricity' }, 'Hostel');
      const amt = amount(r.amount, 'Amount held'); if (amt <= 0) throw new Error('Amount held must be more than zero');
      const on = isoDate(r.paid_on, 'Paid on');
      return { student_id: id, kind, amount: amt, reason: `Held before the system${on ? ` since ${on}` : ''}${r.reference ? `, ref ${r.reference.slice(0, 40)}` : ''}` };
    },
    load: async (tx, rows, ctx) => {
      await tx.execute(sql`insert into hostel.caution_entry (student_id, entry_type, deposit_kind, amount, reason, created_by)
        select x.student_id, 'Opening', x.kind, x.amount, x.reason, ${ctx.user.id} from jsonb_to_recordset(${json(rows)}) as x(student_id text, kind text, amount numeric, reason text)
        where not exists (select 1 from hostel.caution_entry e where e.student_id = x.student_id and e.deposit_kind = x.kind and e.entry_type in ('Opening', 'Collected'))`);
    },
  },
  {
    kind: 'meter_readings', order: 13, title: 'Meter readings', target: 'hostel.meter_reading', source: 'Meter_Reading', needs: ['hostels', 'spaces', 'meterIds'],
    note: 'Each room meter\'s reading on the day the system starts (and any later manual readings). A reading lower than an earlier one of the same meter is refused.',
    count: 'select count(*)::int as n from hostel.meter_reading',
    columns: [
      { key: 'hostel_code', label: 'Hostel code', required: true, sample: 'BH2', aliases: ['hostel'] },
      { key: 'room_no', label: 'Room number', required: true, sample: '101', aliases: ['room'] },
      { key: 'reading_kwh', label: 'Reading (kWh)', required: true, sample: '1523.4', aliases: ['reading', 'kwh', 'units'] },
      { key: 'reading_date', label: 'Read on', required: true, hint: 'DD-MM-YYYY', sample: '01-11-2026', aliases: ['date', 'reading date'] },
    ],
    key: (c) => `${c.meter_id}|${c.reading_at}`,
    validate: (r, ctx) => {
      const code = need(r.hostel_code, 'Hostel code').toUpperCase(); if (!ctx.hostels.has(code)) throw new Error('Hostel code is not in Hostel buildings');
      const space = `${code}-${need(r.room_no, 'Room number')}`; if (!ctx.spaces.has(space)) throw new Error('Room is not in Rooms and beds');
      const meter = ctx.meterIds.get(space); if (!meter) throw new Error('This room has no meter; upload it in Room meters first');
      return { meter_id: meter, reading_kwh: amount(r.reading_kwh, 'Reading (kWh)'), reading_at: `${isoDate(r.reading_date, 'Read on', true)}T09:00:00+05:30` };
    },
    load: async (tx, rows, ctx) => {
      await tx.execute(sql`insert into hostel.meter_reading (meter_id, reading_at, reading_kwh, source, read_by, created_by)
        select x.meter_id, x.reading_at, x.reading_kwh, 'Manual', ${ctx.user.kind === 'staff' ? ctx.user.id : null}, ${ctx.user.id}
        from jsonb_to_recordset(${json(rows)}) as x(meter_id bigint, reading_at timestamptz, reading_kwh numeric)
        where not exists (select 1 from hostel.meter_reading m where m.meter_id = x.meter_id and m.reading_at = x.reading_at)
        order by x.reading_at`);
    },
  },
  {
    kind: 'mess_subscriptions', order: 14, title: 'Mess for each student', target: 'hostel.mess_subscription', source: 'Mess_Subscription', needs: ['students', 'messes', 'years'],
    note: 'Which mess each resident eats in, and their food: south or north Indian, veg or non-veg. Loading a student again moves them to the mess and food in the file. The mess fee itself goes in "Fees already due and paid".',
    count: "select count(*)::int as n from hostel.mess_subscription where status = 'Active'",
    columns: [
      { key: 'student_id', label: 'University ID', required: true, sample: '2600040011', aliases: ['university id', 'id'] },
      { key: 'mess', label: 'Mess', required: true, hint: 'Mess name as in Masters', sample: 'BH1 Mess', aliases: ['mess name'] },
      { key: 'region', label: 'South or North', hint: 'South or North; empty means South', sample: 'South', aliases: ['cuisine', 'food style'] },
      { key: 'diet', label: 'Veg or non-veg', hint: 'Veg or Non-veg; empty means Veg', sample: 'Non-veg', aliases: ['food', 'veg'] },
      { key: 'from_date', label: 'From', hint: 'DD-MM-YYYY; empty means today', sample: '01-08-2026', aliases: ['from date', 'start date'] },
      { key: 'academic_year', label: 'Academic year', hint: 'Empty means the current year', sample: '', aliases: ['year'] },
    ],
    key: (c) => `${c.student_id}|${c.academic_year}`,
    validate: (r, ctx) => {
      const id = need(r.student_id, 'University ID'); if (!ctx.students.has(id)) throw new Error('University ID is not in Students; upload the students first');
      const mess = ctx.messes.get(norm(need(r.mess, 'Mess'))); if (!mess) throw new Error('Mess is not in Masters');
      const region = oneOf(r.region, 'South or North', ['South', 'North'], { southindian: 'South', northindian: 'North' }, 'South');
      const diet = oneOf(r.diet, 'Veg or non-veg', ['Veg', 'Non_Veg'], { nonveg: 'Non_Veg', vegetarian: 'Veg', nonvegetarian: 'Non_Veg' }, 'Veg');
      const year = r.academic_year ?? ctx.currentYear; if (!ctx.years.has(year)) throw new Error('Academic year is not in the master');
      return { student_id: id, mess_id: mess, region, diet, cuisine: region === 'North' ? 'North_Indian' : 'South_Indian', from_date: isoDate(r.from_date, 'From'), academic_year: year };
    },
    load: async (tx, rows, ctx) => {
      const x = sql`jsonb_to_recordset(${json(rows)}) as x(student_id text, mess_id bigint, region text, diet text, cuisine text, from_date date, academic_year text)`;
      await tx.execute(sql`update hostel.mess_subscription s set mess_id = x.mess_id, region = x.region, diet = x.diet, cuisine = x.cuisine::hostel.cuisine, updated_by = ${ctx.user.id}
        from ${x} where s.student_id = x.student_id and s.academic_year = x.academic_year and s.status = 'Active'`);
      await tx.execute(sql`insert into hostel.mess_subscription (student_id, mess_id, academic_year, cuisine, region, diet, from_date, created_by)
        select x.student_id, x.mess_id, x.academic_year, x.cuisine::hostel.cuisine, x.region, x.diet, coalesce(x.from_date, current_date), ${ctx.user.id} from ${x}
        where not exists (select 1 from hostel.mess_subscription s where s.student_id = x.student_id and s.academic_year = x.academic_year and s.status = 'Active')`);
    },
  },
];
/** What to call a refused row in the report: an identifier, never personal data. */
const TAG: Record<string, (r: Row) => string | undefined> = {
  rooms: (r) => `${r.hostel_code ?? ''}-${r.room_no ?? ''}`, meter_readings: (r) => `${r.hostel_code ?? ''}-${r.room_no ?? ''}`, assets: (r) => r.asset_id, meters: (r) => r.meter_no, fees: (r) => `${r.hostel_code ?? ''} ${r.room_type ?? ''}`, room_types: (r) => r.type_name,
};
const STUDENT_LEVELS: Record<string, string> = { phd: 'PhD', graduatediploma: 'Graduate_Diploma', pgdiploma: 'PG_Diploma', srf: 'SRF', jrf: 'JRF', pdf: 'PDF' };

@Injectable()
export class ImportService {
  constructor(private dbs: DbService) {}
  private kind(k: string) { const d = KINDS.find((x) => x.kind === k); if (!d) throw new NotFoundException(`No upload for "${k}"`); return d; }

  /** The masters that can be uploaded, with their columns (used for the template and for dropping unknown columns in the browser). */
  async kinds(only?: string[]) {
    const out = [];
    for (const k of KINDS.filter((x) => !only || only.includes(x.kind))) {
      const [c] = await this.dbs.rows<{ n: number }>(sql.raw(k.count));
      const [last] = await this.dbs.rows(sql`select batch_id::int as batch_id, file_name, received_at, rows_total, rows_ok, rows_failed, status, processed_by from shared.import_batch where source = ${k.source}::shared.import_source order by batch_id desc limit 1`);
      out.push({ kind: k.kind, order: k.order, title: k.title, target: k.target, note: k.note, records: c?.n ?? 0, last: last ?? null,
        columns: k.columns.map((col) => ({ key: col.key, label: col.label, required: !!col.required, hint: col.hint ?? null, sample: col.sample, accepts: [col.key, col.label, ...(col.aliases ?? [])].map(norm) })) });
    }
    return out;
  }

  batches() {
    return this.dbs.rows(sql`select b.batch_id::int as batch_id, b.source, b.file_name, b.received_at, b.rows_total, b.rows_ok, b.rows_failed, b.status, b.processed_by, st.full_name as processed_by_name, b.error_report
      from shared.import_batch b left join ref.staff_master st on st.staff_id = b.processed_by order by b.batch_id desc limit 40`);
  }

  private async ctx(k: Kind, user: AuthUser): Promise<Ctx> {
    const c: Ctx = { hostels: new Map(), types: new Map(), spaces: new Set(), zones: new Set(), staff: new Set(), years: new Set(), roles: new Map(), metered: new Map(), user, beds: new Map(), students: new Set(), housed: new Set(), currentYear: '', genders: new Map(), hostelFor: new Map(), messes: new Map(), meterIds: new Map() };
    const has = (n: keyof Ctx) => k.needs.includes(n);
    if (has('hostels')) (await this.dbs.rows<{ hostel_code: string; facility_id: string }>(sql`select hostel_code, facility_id from hostel.hostel_profile`)).forEach((r) => c.hostels.set(r.hostel_code, r.facility_id));
    if (has('types')) (await this.dbs.rows<{ room_type_id: number; type_name: string; sharing_count: number; is_ac: boolean }>(sql`select room_type_id, type_name, sharing_count, is_ac from hostel.room_type`)).forEach((r) => c.types.set(norm(r.type_name), { id: r.room_type_id, sharing: r.sharing_count, is_ac: r.is_ac }));
    if (has('spaces')) (await this.dbs.rows<{ space_id: string }>(sql`select s.space_id from infra.space s join infra.zone z on z.zone_id = s.zone_id join hostel.hostel_profile hp on hp.facility_id = z.facility_id`)).forEach((r) => c.spaces.add(r.space_id));
    if (has('zones')) (await this.dbs.rows<{ zone_id: string }>(sql`select z.zone_id from infra.zone z join hostel.hostel_profile hp on hp.facility_id = z.facility_id`)).forEach((r) => c.zones.add(r.zone_id));
    if (has('staff')) (await this.dbs.rows<{ staff_id: string }>(sql`select staff_id from ref.staff_master`)).forEach((r) => c.staff.add(r.staff_id));
    if (has('years')) (await this.dbs.rows<{ academic_year: string }>(sql`select academic_year from hostel.academic_year`)).forEach((r) => c.years.add(r.academic_year));
    if (has('roles')) (await this.dbs.rows<{ role_code: string; name: string }>(sql`select role_code, name from portal.role where module = 'hostel'`)).forEach((r) => { c.roles.set(norm(r.role_code), r.role_code); });
    if (has('metered')) (await this.dbs.rows<{ space_id: string; meter_no: string }>(sql`select space_id, meter_no from hostel.room_meter where status = 'Active'`)).forEach((r) => c.metered.set(r.space_id, r.meter_no));
    if (has('beds')) (await this.dbs.rows<{ subspace_id: string; bed_status: string }>(sql`select subspace_id, bed_status::text as bed_status from hostel.v_bed`)).forEach((r) => c.beds.set(r.subspace_id, r.bed_status));
    if (has('students')) {
      (await this.dbs.rows<{ student_id: string; gender: string }>(sql`select student_id, gender::text as gender from ref.student_master`)).forEach((r) => { c.students.add(r.student_id); c.genders.set(r.student_id, r.gender); });
      (await this.dbs.rows<{ hostel_code: string; g: string }>(sql`select hostel_code, hostel_gender::text as g from hostel.hostel_profile`)).forEach((r) => c.hostelFor.set(r.hostel_code, r.g));
      (await this.dbs.rows<{ student_id: string }>(sql`select student_id from hostel.hostel_allocation where status = 'Active' and student_id is not null`)).forEach((r) => c.housed.add(r.student_id));
      c.currentYear = (await this.dbs.rows<{ y: string }>(sql`select academic_year as y from hostel.academic_year where is_current limit 1`))[0]?.y ?? '';
    }
    if (has('messes')) (await this.dbs.rows<{ mess_id: number; mess_name: string }>(sql`select mess_id::int as mess_id, mess_name from hostel.mess_master`)).forEach((r) => { c.messes.set(norm(r.mess_name), r.mess_id); c.messes.set(String(r.mess_id), r.mess_id); });
    if (has('meterIds')) (await this.dbs.rows<{ space_id: string; meter_id: number }>(sql`select space_id, meter_id::int as meter_id from hostel.room_meter where status = 'Active'`)).forEach((r) => c.meterIds.set(r.space_id, r.meter_id));
    if ((has('students') || has('messes')) && !c.currentYear) c.currentYear = (await this.dbs.rows<{ y: string }>(sql`select academic_year as y from hostel.academic_year where is_current limit 1`))[0]?.y ?? '';
    return c;
  }

  /** Map the headers of the file to the kind's columns, validate each row, and report what would be refused. */
  private prepare(k: Kind, raw: Record<string, unknown>[], offset: number, ctx: Ctx) {
    const accept = new Map<string, string>();
    k.columns.forEach((col) => [col.key, col.label, ...(col.aliases ?? [])].forEach((a) => accept.set(norm(a), col.key)));
    const clean: Clean[] = []; const errors: RowError[] = []; const seen = new Map<string, number>();
    raw.forEach((r, i) => {
      const row: Row = {};
      for (const [h, v] of Object.entries(r)) { const key = accept.get(norm(h)); if (key && v !== null && v !== undefined && String(v).trim() !== '') row[key] = String(v).trim(); }
      if (k.kind === 'students' && row.student_type) row.student_type = STUDENT_LEVELS[norm(row.student_type)] ?? row.student_type;
      const rowNo = offset + i + 2;   // row 1 of the file is the header
      try {
        const c = k.validate(row, ctx); const key = k.key(c);
        if (seen.has(key)) throw new Error(`Repeats row ${seen.get(key)} of this file`);
        seen.set(key, rowNo); clean.push(c);
      } catch (e) {
        errors.push({ row: rowNo, key: (TAG[k.kind]?.(row) ?? row[k.columns[0].key])?.slice(0, 28), message: e instanceof Error ? e.message : 'Not valid' });
      }
    });
    return { clean, errors };
  }

  /** One record from a form: the same checks and the same write as a file row, without an upload batch. */
  async save(user: AuthUser, kindName: string, row: Record<string, unknown>) {
    const k = this.kind(kindName); const ctx = await this.ctx(k, user);
    const { clean, errors } = this.prepare(k, [row], -1, ctx);
    if (errors.length) throw new UnprocessableEntityException(errors[0].message);
    await this.dbs.run(user, (tx) => k.load(tx, clean, ctx, null as unknown as number));
    return { ok: true, key: k.key(clean[0]) };
  }

  async check(user: AuthUser, kindName: string, rows: Record<string, unknown>[], offset: number) {
    const k = this.kind(kindName); const { clean, errors } = this.prepare(k, rows, offset, await this.ctx(k, user));
    return { ok: clean.length, failed: errors.length, errors: errors.slice(0, 50) };
  }

  async load(user: AuthUser, kindName: string, dto: { rows: Record<string, unknown>[]; offset: number; rows_total: number; file_name: string; batch_id?: number }) {
    const k = this.kind(kindName);
    if (!dto.rows.length) throw new BadRequestException('No rows in this chunk');
    const ctx = await this.ctx(k, user); const { clean, errors } = this.prepare(k, dto.rows, dto.offset, ctx);
    const last = dto.offset + dto.rows.length >= dto.rows_total;
    return this.dbs.run(user, async (tx) => {
      let batchId = dto.batch_id;
      if (!batchId) {
        const r = (await tx.execute(sql`insert into shared.import_batch (source, file_name, rows_total, rows_ok, rows_failed, status, processed_by) values (${k.source}::shared.import_source, ${dto.file_name.slice(0, 200)}, ${dto.rows_total}, 0, 0, 'Processing', ${user.id}) returning batch_id::int as batch_id`)) as unknown as { batch_id: number }[];
        batchId = r[0].batch_id;
      }
      if (clean.length) await k.load(tx, clean, ctx, batchId);
      const report = errors.slice(0, 40).map((e) => `row ${e.row}${e.key ? ` (${e.key})` : ''}: ${e.message}`).join('\n');
      await tx.execute(sql`update shared.import_batch set rows_ok = rows_ok + ${clean.length}, rows_failed = rows_failed + ${errors.length},
          error_report = left(coalesce(error_report || E'\n', '') || ${report}, 6000),
          status = case when ${last} then (case when rows_failed + ${errors.length} = 0 then 'Completed' when rows_ok + ${clean.length} = 0 then 'Failed' else 'Partially_Completed' end)::shared.import_status else status end
        where batch_id = ${batchId}`);
      return { batch_id: batchId, ok: clean.length, failed: errors.length, errors: errors.slice(0, 50), done: last };
    });
  }
}
