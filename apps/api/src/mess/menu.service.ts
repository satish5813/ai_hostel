import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

export type Kind = { hostel_gender: 'Boys' | 'Girls' | 'Any'; region: 'South' | 'North' | 'International'; country?: string | null; diet: 'Veg' | 'Non_Veg'; mess_id?: number | null };
type Cycle = { cycle_id: number; hostel_gender: string; region: string; country: string | null; diet: string; mess_id: number | null; mess_name: string | null; title: string; notes: string | null;
  status: string; effective_from: string; based_on: number | null; approved_by: string | null; approved_by_name: string | null; approved_on: string | null; updated_at: string | null; updated_by: string | null; eaters: number };

const CYCLE_COLS = sql`c.cycle_id::int as cycle_id, c.hostel_gender, c.region, c.country, c.diet, c.mess_id::int as mess_id, m.mess_name, c.title, c.notes, c.status, c.effective_from,
  c.based_on::int as based_on, c.approved_by, initcap(st.full_name) as approved_by_name, c.approved_on, c.updated_at, c.updated_by,
  (select count(*)::int from hostel.v_student_menu v where v.cycle_id = c.cycle_id) as eaters`;
const LABEL: Record<string, string> = { South: 'South Indian', North: 'North Indian' };
export const titleOf = (k: Kind) => `${k.hostel_gender === 'Any' ? 'All hostels' : k.hostel_gender} · ${k.region === 'International' ? k.country : LABEL[k.region]} · ${k.diet === 'Veg' ? 'Veg' : 'Non-veg'}`;

/**
 * MES-01 Routine menu. One week of four meals per kind of student (Boys or Girls hostel, South, North or a country's
 * food, Veg or Non-veg). The administrator prepares a draft (new, or a copy of the approved menu), the Chief Warden
 * approves it and the approved one it replaces is retired. Students see the approved menu that fits them
 * (hostel.v_student_menu) and choose their own food style and diet.
 */
@Injectable()
export class MenuService {
  constructor(private dbs: DbService) {}

  async cycles() {
    const rows = await this.dbs.rows<Cycle>(sql`select ${CYCLE_COLS} from hostel.menu_cycle c left join hostel.mess_master m on m.mess_id = c.mess_id
      left join ref.staff_master st on st.staff_id = c.approved_by where c.status <> 'Retired'
      order by c.region = 'International', c.region, c.country, c.hostel_gender, c.diet, c.status`);
    const residents = await this.dbs.rows<{ hostel_gender: string; is_foreign: boolean; region: string; country: string | null; diet: string; n: number; no_menu: number; next_week: number }>(sql`
      with now_ as (select hostel_gender, is_foreign, region, country, diet, count(*)::int as n, count(*) filter (where cycle_id is null)::int as no_menu from hostel.v_student_menu group by 1, 2, 3, 4, 5),
      next_ as (select hostel_gender, is_foreign, next_region as region, next_country as country, next_diet as diet, count(*)::int as next_week from hostel.v_student_menu group by 1, 2, 3, 4, 5)
      select coalesce(a.hostel_gender, b.hostel_gender) as hostel_gender, coalesce(a.is_foreign, b.is_foreign) as is_foreign, coalesce(a.region, b.region) as region,
             coalesce(a.country, b.country) as country, coalesce(a.diet, b.diet) as diet, coalesce(a.n, 0) as n, coalesce(a.no_menu, 0) as no_menu, coalesce(b.next_week, 0) as next_week
      from now_ a full join next_ b on a.hostel_gender = b.hostel_gender and a.is_foreign = b.is_foreign and a.region = b.region and a.country is not distinct from b.country and a.diet = b.diet`);
    const [{ pending }] = await this.dbs.rows<{ pending: number }>(sql`select count(*)::int as pending from hostel.food_choice_change where status = 'Pending'`);
    const messes = await this.dbs.rows(sql`select mess_id::int as mess_id, mess_name, facility_id from hostel.mess_master where status = 'Active' order by mess_name`);
    const hostels = await this.dbs.rows(sql`select hp.facility_id, hp.hostel_code, f.facility_name, hp.hostel_gender::text as hostel_gender, hp.accommodation_type,
      (select count(*)::int from hostel.v_student_menu v where v.facility_id = hp.facility_id) as residents
      from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id where hp.status = 'Active' and hp.hostel_gender <> 'Staff' order by hp.hostel_code`);
    return { cycles: rows, residents, messes, hostels, pending_changes: pending };
  }

  /** Apartments house overseas students, who may choose their own country's food. */
  async setAccommodation(user: AuthUser, facilityId: string, type: 'Hostel' | 'Apartment') {
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.hostel_profile set accommodation_type = ${type}, updated_by = ${user.id} where facility_id = ${facilityId} returning facility_id`)) as unknown as unknown[];
    if (!r.length) throw new NotFoundException('Hostel not found');
    return { facility_id: facilityId, accommodation_type: type };
  }

  async cycle(id: number) {
    const [c] = await this.dbs.rows<Cycle>(sql`select ${CYCLE_COLS} from hostel.menu_cycle c left join hostel.mess_master m on m.mess_id = c.mess_id
      left join ref.staff_master st on st.staff_id = c.approved_by where c.cycle_id = ${id}`);
    if (!c) throw new NotFoundException('Menu not found');
    const items = await this.items(id);
    // a draft shows what it changes against the approved menu it will replace
    const [live] = c.status === 'Draft' ? await this.dbs.rows<{ cycle_id: number }>(sql`select cycle_id::int as cycle_id from hostel.menu_cycle where status = 'Approved'
      and hostel_gender = ${c.hostel_gender} and region = ${c.region} and country is not distinct from ${c.country} and diet = ${c.diet} and mess_id is not distinct from ${c.mess_id}`) : [];
    const [draft] = c.status === 'Approved' ? await this.dbs.rows<{ cycle_id: number }>(sql`select cycle_id::int as cycle_id from hostel.menu_cycle where status = 'Draft'
      and hostel_gender = ${c.hostel_gender} and region = ${c.region} and country is not distinct from ${c.country} and diet = ${c.diet} and mess_id is not distinct from ${c.mess_id}`) : [];
    return { ...c, items, live_items: live ? await this.items(live.cycle_id) : null, live_id: live?.cycle_id ?? null, draft_id: draft?.cycle_id ?? null };
  }

  private items(id: number) {
    return this.dbs.rows<{ day_no: number; meal: string; dishes: string }>(sql`select day_no::int as day_no, meal::text as meal, dishes from hostel.menu_cycle_item where cycle_id = ${id} order by day_no, meal`);
  }

  /** A new draft: a copy of a menu (usually the approved one being changed), or an empty week for a new kind of student. */
  async draft(user: AuthUser, dto: Kind & { copy_from?: number }) {
    if (dto.region === 'International' && !dto.country?.trim()) throw new BadRequestException('Give the country for an international menu');
    const k: Kind = { ...dto, country: dto.region === 'International' ? dto.country!.trim() : null, mess_id: dto.mess_id ?? null };
    const [dup] = await this.dbs.rows<{ cycle_id: number }>(sql`select cycle_id::int as cycle_id from hostel.menu_cycle where status = 'Draft' and hostel_gender = ${k.hostel_gender}
      and region = ${k.region} and country is not distinct from ${k.country} and diet = ${k.diet} and mess_id is not distinct from ${k.mess_id}::bigint`);
    if (dup) return { cycle_id: dup.cycle_id, existing: true };
    const id = await this.dbs.run(user, async (tx) => {
      const [c] = (await tx.execute(sql`insert into hostel.menu_cycle (hostel_gender, region, country, diet, mess_id, title, based_on, created_by)
        values (${k.hostel_gender}, ${k.region}, ${k.country}, ${k.diet}, ${k.mess_id}::bigint, ${titleOf(k)}, ${dto.copy_from ?? null}::bigint, ${user.id}) returning cycle_id::int as cycle_id`)) as unknown as { cycle_id: number }[];
      if (dto.copy_from) await tx.execute(sql`insert into hostel.menu_cycle_item (cycle_id, day_no, meal, dishes) select ${c.cycle_id}, day_no, meal, dishes from hostel.menu_cycle_item where cycle_id = ${dto.copy_from}`);
      return c.cycle_id;
    });
    return { cycle_id: id, existing: false };
  }

  async setMeal(user: AuthUser, id: number, dto: { day_no: number; meal: string; dishes: string }) {
    const dishes = dto.dishes.split(',').map((x) => x.trim()).filter(Boolean).join(', ');
    if (!dishes) throw new BadRequestException('Write at least one dish');
    await this.dbs.run(user, async (tx) => {
      // the database guard sees changes to existing meals; a new meal on an approved menu is refused here
      const [c] = (await tx.execute(sql`select status from hostel.menu_cycle where cycle_id = ${id} for update`)) as unknown as { status: string }[];
      if (!c) throw new NotFoundException('Menu not found');
      if (c.status !== 'Draft') throw new UnprocessableEntityException('Only a draft can be changed');
      await tx.execute(sql`insert into hostel.menu_cycle_item (cycle_id, day_no, meal, dishes, updated_by)
        values (${id}, ${dto.day_no}, ${dto.meal}::hostel.meal_slot, ${dishes}, ${user.id})
        on conflict (cycle_id, day_no, meal) do update set dishes = excluded.dishes, updated_by = excluded.updated_by`);
    });
    return { day_no: dto.day_no, meal: dto.meal, dishes };
  }

  async setNotes(user: AuthUser, id: number, dto: { notes?: string | null; effective_from?: string }) {
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.menu_cycle set notes = coalesce(${dto.notes ?? null}, notes), effective_from = coalesce(${dto.effective_from ?? null}::date, effective_from),
      updated_by = ${user.id} where cycle_id = ${id} and status = 'Draft' returning cycle_id`)) as unknown as unknown[];
    if (!r.length) throw new UnprocessableEntityException('Only a draft can be changed');
    return { ok: true };
  }

  /** The Chief Warden approves a draft; the database retires the menu it replaces. */
  async approve(user: AuthUser, id: number) {
    if (!user.roles.some((r) => r === 'Chief_Warden' || r === 'Director_Hostels')) throw new ForbiddenException('Only the Chief Warden approves a menu');
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.menu_cycle set status = 'Approved', approved_by = ${user.id}, approved_on = now(), updated_by = ${user.id}
      where cycle_id = ${id} and status = 'Draft' returning cycle_id`)) as unknown as unknown[];
    if (!r.length) throw new UnprocessableEntityException('Only a draft can be approved');
    return { ok: true };
  }

  async discard(user: AuthUser, id: number) {
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`delete from hostel.menu_cycle where cycle_id = ${id} and status = 'Draft' returning cycle_id`)) as unknown as unknown[];
    if (!r.length) throw new UnprocessableEntityException('Only a draft can be discarded');
    return { ok: true };
  }

  /* ---------------------------------------------------------------- student */

  /**
   * The student's group (Boys or Girls hostel, local or foreign), food choice and this week's menu; a change asked for
   * this week, with next week's menu, until it applies on Monday. Foreign students may choose their own country's food.
   */
  async mine(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const [me] = await this.dbs.rows<{ facility_id: string; hostel_code: string; hostel_gender: string; accommodation_type: string; mess_id: number | null; mess_name: string | null; subscription_id: number | null;
      region: string; diet: string; country: string | null; nationality: string | null; is_foreign: boolean; cycle_id: number | null; menu_title: string | null;
      pending_change_id: number | null; change_from: string | null; next_region: string; next_diet: string; next_country: string | null; next_cycle_id: number | null; next_title: string | null }>(sql`
      select v.facility_id, v.hostel_code, v.hostel_gender, v.accommodation_type, v.mess_id::int as mess_id, m.mess_name, v.subscription_id::int as subscription_id, v.region, v.diet, v.country,
             v.nationality, v.is_foreign, v.cycle_id::int as cycle_id, v.menu_title, v.pending_change_id::int as pending_change_id, v.change_from,
             v.next_region, v.next_diet, v.next_country, v.next_cycle_id::int as next_cycle_id, nc.title as next_title
      from hostel.v_student_menu v left join hostel.mess_master m on m.mess_id = v.mess_id left join hostel.menu_cycle nc on nc.cycle_id = v.next_cycle_id
      where v.student_id = ${user.id}`);
    if (!me) return { me: null, items: [], next_items: [], countries: [], today: null, next_monday: null };
    const countries = await this.dbs.rows<{ country: string }>(sql`select distinct country from hostel.menu_cycle where status = 'Approved' and country is not null order by 1`);
    const [{ today, next_monday }] = await this.dbs.rows<{ today: number; next_monday: string }>(sql`
      select extract(isodow from now() at time zone 'Asia/Kolkata')::int as today,
             to_char((now() at time zone 'Asia/Kolkata')::date + (8 - extract(isodow from now() at time zone 'Asia/Kolkata'))::int, 'YYYY-MM-DD') as next_monday`);
    return {
      me: { ...me, international_allowed: me.is_foreign || me.region === 'International' },
      items: me.cycle_id ? await this.items(me.cycle_id) : [],
      next_items: me.pending_change_id && me.next_cycle_id ? await this.items(me.next_cycle_id) : [],
      countries: countries.map((c) => c.country),
      today, next_monday,
    };
  }

  /**
   * A change of food or diet applies from next Monday, so the mess can plan the week's numbers. Asking again before then
   * replaces the change; asking for what the student already eats withdraws it.
   */
  async setFood(user: AuthUser, dto: { region: 'South' | 'North' | 'International'; diet: 'Veg' | 'Non_Veg'; country?: string | null }) {
    const m = await this.mine(user);
    if (!m.me) throw new UnprocessableEntityException('Your food choice is set once you live in a hostel');
    if (!m.me.subscription_id) throw new UnprocessableEntityException('You have no mess subscription yet; choose the mess with your fee plan first');
    if (dto.region === 'International' && !m.me.international_allowed) throw new ForbiddenException('Food by country is for foreign students');
    if (dto.region === 'International' && !dto.country) throw new BadRequestException('Choose the country');
    const country = dto.region === 'International' ? dto.country! : null;
    const same = dto.region === m.me.region && dto.diet === m.me.diet && country === (m.me.region === 'International' ? m.me.country : null);
    await this.dbs.run(user, async (tx) => {
      await tx.execute(sql`update hostel.food_choice_change set status = 'Withdrawn' where student_id = ${user.id} and status = 'Pending'`);
      if (!same) await tx.execute(sql`insert into hostel.food_choice_change (student_id, region, diet, country, effective_from, created_by)
        values (${user.id}, ${dto.region}, ${dto.diet}, ${country}, ${m.next_monday}::date, ${user.id})`);
    });
    return this.mine(user);
  }

  async withdrawFood(user: AuthUser) {
    await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.food_choice_change set status = 'Withdrawn' where student_id = ${user.id} and status = 'Pending'`));
    return this.mine(user);
  }
}
