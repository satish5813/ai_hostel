import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

export const PUBLISHERS = ['Mess_Incharge', 'Mess_Manager'];
/** Who may enter a student's choices for them (paper slips, no phone): the Chief Chef and the Mess In-charge. */
export const ENTERERS = ['Chief_Chef', ...PUBLISHERS];
type Meal = 'Breakfast' | 'Lunch' | 'Evening_Snacks' | 'Dinner';
export type OptionDto = { day_no: number; meal: Meal; course_code: string; dish: string; cuisine: 'South' | 'North' | 'Both'; diet: 'Veg' | 'Non_Veg' };
type Week = { week_id: number; mess_id: number; mess_name: string; week_start: string; status: string; choices_close_at: string; is_open: boolean; notes: string | null;
  prepared_by_name: string | null; published_by_name: string | null; published_at: string | null; closed_at: string | null; updated_at: string | null };

const WEEK_COLS = sql`w.week_id::int as week_id, w.mess_id::int as mess_id, m.mess_name, to_char(w.week_start, 'YYYY-MM-DD') as week_start, w.status,
  w.choices_close_at, (w.status = 'Published' and now() < w.choices_close_at) as is_open, w.notes,
  initcap(p.full_name) as prepared_by_name, initcap(b.full_name) as published_by_name, w.published_at, w.closed_at, w.updated_at`;
const WEEK_FROM = sql`hostel.weekly_menu w join hostel.mess_master m on m.mess_id = w.mess_id
  left join ref.staff_master p on p.staff_id = w.prepared_by left join ref.staff_master b on b.staff_id = w.published_by`;

/**
 * MES-08 Weekly menu and MES-09 Choose my meals. The Mess In-charge or the Chef writes a mess's menu for one week:
 * fixed items by food style (idli or poha; white rice and curd; pulka ...) and, for each course, the dishes a
 * student may choose (each North or South Indian and Veg or Non-veg). The Mess In-charge publishes it; students
 * choose until the Friday before the week; the database closes the week and fills in what was not chosen.
 */
@Injectable()
export class WeeklyMenuService {
  constructor(private dbs: DbService) {}

  private courses() {
    return this.dbs.rows<{ course_code: string; course_name: string; meals: string[]; can_skip: boolean; default_on_close: string; min_options: number; max_options: number | null; hint: string | null }>(sql`
      select course_code, course_name, meals::text[] as meals, can_skip, default_on_close, min_options::int as min_options, max_options::int as max_options, hint
      from hostel.menu_course where active order by sort_no`);
  }

  /** The first week still open for choice: the Monday whose Friday before has not begun. */
  private async nextWeek() {
    const [r] = await this.dbs.rows<{ week_start: string; close_at: string }>(sql`
      with t as (select (now() at time zone 'Asia/Kolkata')::date as d),
      n as (select d + (8 - extract(isodow from d))::int as ws, d from t)
      select to_char(case when ws - 3 <= d then ws + 7 else ws end, 'YYYY-MM-DD') as week_start,
             ((case when ws - 3 <= d then ws + 7 else ws end) - 3)::timestamp at time zone 'Asia/Kolkata' as close_at from n`);
    return r;
  }

  private async week(id: number) {
    const [w] = await this.dbs.rows<Week>(sql`select ${WEEK_COLS} from ${WEEK_FROM} where w.week_id = ${id}`);
    if (!w) throw new NotFoundException('Weekly menu not found');
    return w;
  }

  private fixed(id: number) {
    return this.dbs.rows<{ meal: string; cuisine: string; items: string }>(sql`select meal::text as meal, cuisine, items from hostel.weekly_menu_fixed where week_id = ${id} order by meal, cuisine desc`);
  }

  private options(id: number) {
    return this.dbs.rows<{ option_id: number; day_no: number; meal: string; course_code: string; dish: string; cuisine: string; diet: string; chosen: number; defaulted: number; plates: number }>(sql`
      select option_id::int as option_id, day_no::int as day_no, meal::text as meal, course_code, dish, cuisine, diet, chosen, defaulted, plates
      from hostel.v_weekly_menu_dish_count d where week_id = ${id}
      order by day_no, meal, course_sort, (select sort_no from hostel.weekly_menu_option o where o.option_id = d.option_id), option_id`);
  }

  /* ---------------------------------------------------------------- staff */

  async list() {
    const weeks = await this.dbs.rows<Week & { dishes: number; residents: number; choosers: number }>(sql`
      select ${WEEK_COLS}, (select count(*)::int from hostel.weekly_menu_option o where o.week_id = w.week_id) as dishes,
        (select count(*)::int from hostel.v_mess_resident r where r.mess_id = w.mess_id) as residents,
        (select count(distinct student_id)::int from hostel.weekly_menu_choice c where c.week_id = w.week_id and c.source = 'Student') as choosers
      from ${WEEK_FROM} order by w.week_start desc, m.mess_name limit 60`);
    const messes = await this.dbs.rows(sql`select m.mess_id::int as mess_id, m.mess_name, (select count(*)::int from hostel.v_mess_resident r where r.mess_id = m.mess_id) as residents
      from hostel.mess_master m where m.status = 'Active' order by m.mess_name`);
    const fixed = await this.dbs.rows(sql`select meal::text as meal, cuisine, items from hostel.menu_fixed_item order by meal, cuisine desc`);
    return { weeks, messes, courses: await this.courses(), fixed_defaults: fixed, next: await this.nextWeek() };
  }

  async detail(id: number) {
    const w = await this.week(id);
    const [{ residents }] = await this.dbs.rows<{ residents: number }>(sql`select count(*)::int as residents from hostel.v_mess_resident where mess_id = ${w.mess_id}`);
    return { ...w, residents, courses: await this.courses(), fixed: await this.fixed(id), options: await this.options(id) };
  }

  /** A new week for a mess: fixed items from the masters, dishes copied from another week (day by day) if asked. */
  async create(user: AuthUser, dto: { mess_id: number; week_start: string; copy_from?: number }) {
    const [dup] = await this.dbs.rows<{ week_id: number }>(sql`select week_id::int as week_id from hostel.weekly_menu where mess_id = ${dto.mess_id} and week_start = ${dto.week_start}::date`);
    if (dup) return { week_id: dup.week_id, existing: true };
    const id = await this.dbs.run(user, async (tx) => {
      const [w] = (await tx.execute(sql`insert into hostel.weekly_menu (mess_id, week_start, choices_close_at, prepared_by, created_by)
        values (${dto.mess_id}, ${dto.week_start}::date, (${dto.week_start}::date - 3)::timestamp at time zone 'Asia/Kolkata', ${user.id}, ${user.id})
        returning week_id::int as week_id`)) as unknown as { week_id: number }[];
      if (dto.copy_from) {
        await tx.execute(sql`insert into hostel.weekly_menu_fixed (week_id, meal, cuisine, items) select ${w.week_id}, meal, cuisine, items from hostel.weekly_menu_fixed where week_id = ${dto.copy_from}`);
        await tx.execute(sql`insert into hostel.weekly_menu_option (week_id, day_no, meal, course_code, dish, cuisine, diet, sort_no, created_by)
          select ${w.week_id}, day_no, meal, course_code, dish, cuisine, diet, sort_no, ${user.id} from hostel.weekly_menu_option o
          where week_id = ${dto.copy_from} and exists (select 1 from hostel.menu_course c where c.course_code = o.course_code and c.active) order by option_id`);
      }
      await tx.execute(sql`insert into hostel.weekly_menu_fixed (week_id, meal, cuisine, items) select ${w.week_id}, meal, cuisine, items from hostel.menu_fixed_item on conflict do nothing`);
      return w.week_id;
    });
    return { week_id: id, existing: false };
  }

  async update(user: AuthUser, id: number, dto: { choices_close_at?: string; notes?: string | null }) {
    await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.weekly_menu set choices_close_at = coalesce(${dto.choices_close_at ?? null}::timestamptz, choices_close_at),
      notes = case when ${dto.notes !== undefined} then ${dto.notes ?? null} else notes end, updated_by = ${user.id} where week_id = ${id}`));
    return this.week(id);
  }

  async setFixed(user: AuthUser, id: number, dto: { meal: Meal; cuisine: 'South' | 'North'; items: string }) {
    const items = tidy(dto.items);
    if (!items) throw new BadRequestException('Write at least one item');
    await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.weekly_menu_fixed (week_id, meal, cuisine, items) values (${id}, ${dto.meal}::hostel.meal_slot, ${dto.cuisine}, ${items})
      on conflict (week_id, meal, cuisine) do update set items = excluded.items`));
    return { meal: dto.meal, cuisine: dto.cuisine, items };
  }

  async addOption(user: AuthUser, id: number, dto: OptionDto) {
    const dish = dto.dish.trim().replace(/\s+/g, ' ');
    const [r] = await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.weekly_menu_option (week_id, day_no, meal, course_code, dish, cuisine, diet, sort_no, created_by)
      values (${id}, ${dto.day_no}, ${dto.meal}::hostel.meal_slot, ${dto.course_code}, ${dish}, ${dto.cuisine}, ${dto.diet},
        (select coalesce(max(sort_no), 0) + 1 from hostel.weekly_menu_option where week_id = ${id} and day_no = ${dto.day_no} and meal = ${dto.meal}::hostel.meal_slot and course_code = ${dto.course_code}), ${user.id})
      returning option_id::int as option_id`)) as unknown as { option_id: number }[];
    return r;
  }

  async editOption(user: AuthUser, optionId: number, dto: Pick<OptionDto, 'dish' | 'cuisine' | 'diet'>) {
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.weekly_menu_option set dish = ${dto.dish.trim().replace(/\s+/g, ' ')}, cuisine = ${dto.cuisine}, diet = ${dto.diet}, updated_by = ${user.id}
      where option_id = ${optionId} returning option_id`)) as unknown as unknown[];
    if (!r.length) throw new NotFoundException('Dish not found');
    return { ok: true };
  }

  async removeOption(user: AuthUser, optionId: number) {
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`delete from hostel.weekly_menu_option where option_id = ${optionId} returning option_id`)) as unknown as unknown[];
    if (!r.length) throw new NotFoundException('Dish not found');
    return { ok: true };
  }

  /** Copy one day's dishes to other days, for the courses those days do not have yet. */
  async copyDay(user: AuthUser, id: number, dto: { from_day: number; to_days: number[] }) {
    const to = dto.to_days.filter((d) => d !== dto.from_day);
    if (!to.length) throw new BadRequestException('Choose the days to copy to');
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.weekly_menu_option (week_id, day_no, meal, course_code, dish, cuisine, diet, sort_no, created_by)
      select o.week_id, t.d, o.meal, o.course_code, o.dish, o.cuisine, o.diet, o.sort_no, ${user.id}
      from hostel.weekly_menu_option o cross join unnest(${`{${to.join(',')}}`}::int[]) t(d)
      where o.week_id = ${id} and o.day_no = ${dto.from_day}
        and not exists (select 1 from hostel.weekly_menu_option x where x.week_id = o.week_id and x.day_no = t.d and x.meal = o.meal and x.course_code = o.course_code)
      order by t.d, o.option_id returning option_id`)) as unknown as unknown[];
    return { added: r.length };
  }

  /** The Mess In-charge publishes; every resident of the mess is told the week is open for choice. */
  async publish(user: AuthUser, id: number) {
    if (!user.roles.some((r) => PUBLISHERS.includes(r))) throw new ForbiddenException('The Mess In-charge publishes the weekly menu');
    await this.dbs.run(user, async (tx) => {
      const r = (await tx.execute(sql`update hostel.weekly_menu set status = 'Published', published_by = ${user.id}, updated_by = ${user.id}
        where week_id = ${id} and status = 'Draft' returning week_id`)) as unknown as unknown[];
      if (!r.length) throw new UnprocessableEntityException('Only a draft can be published');
      await tx.execute(sql`insert into shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
        select 'Student', r.student_id, 'In_App', 'MEAL_CHOICE_OPEN', 'Choose next week''s meals',
          'The ' || m.mess_name || ' menu for the week from ' || to_char(w.week_start, 'DD Mon') || ' is out. Choose your curry, fry, dal and live-counter breakfast by '
          || to_char(w.choices_close_at at time zone 'Asia/Kolkata' - interval '1 minute', 'Dy DD Mon, HH12:MI AM') || '.',
          'weekly_menu', w.week_id::text
        from hostel.weekly_menu w join hostel.mess_master m on m.mess_id = w.mess_id join hostel.v_mess_resident r on r.mess_id = w.mess_id where w.week_id = ${id}`);
    });
    return this.week(id);
  }

  async discard(user: AuthUser, id: number) {
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`delete from hostel.weekly_menu where week_id = ${id} and status = 'Draft' returning week_id`)) as unknown as unknown[];
    if (!r.length) throw new UnprocessableEntityException('Only a draft can be discarded');
    return { ok: true };
  }

  /** RPT-11 Weekly meal choices: plates per dish, who chose, skips, veg and non-veg by meal. */
  async report(id: number) {
    const w = await this.week(id);
    const [part] = await this.dbs.rows<{ residents: number; slots: number; chose_all: number; chose_some: number; chose_none: number }>(sql`
      with sl as (select count(*)::int as n from hostel.v_weekly_menu_slot where week_id = ${id}),
      per as (select r.student_id, (select count(*) from hostel.weekly_menu_choice c where c.week_id = ${id} and c.student_id = r.student_id and c.source = 'Student')::int as n
              from hostel.v_mess_resident r where r.mess_id = ${w.mess_id})
      select (select count(*)::int from per) as residents, sl.n as slots,
        (select count(*)::int from per where per.n >= sl.n and sl.n > 0) as chose_all,
        (select count(*)::int from per where per.n > 0 and per.n < sl.n) as chose_some,
        (select count(*)::int from per where per.n = 0) as chose_none from sl`);
    const slots = await this.dbs.rows<{ day_no: number; meal: string; course_code: string; skipped: number; skipped_default: number; answered: number }>(sql`
      select s.day_no::int as day_no, s.meal::text as meal, s.course_code,
        count(c.student_id) filter (where c.option_id is null and c.source = 'Student')::int as skipped,
        count(c.student_id) filter (where c.option_id is null and c.source = 'Default')::int as skipped_default,
        count(c.student_id)::int as answered
      from hostel.v_weekly_menu_slot s left join hostel.weekly_menu_choice c on c.week_id = s.week_id and c.day_no = s.day_no and c.meal = s.meal and c.course_code = s.course_code
      where s.week_id = ${id} group by 1, 2, 3`);
    const diet = await this.dbs.rows<{ day_no: number; meal: string; non_veg: number; veg: number; north: number; south: number }>(sql`
      with st as (select c.day_no, c.meal, c.student_id, bool_or(o.diet = 'Non_Veg') as nv,
                    mode() within group (order by case o.cuisine when 'Both' then null else o.cuisine end) as cz
                  from hostel.weekly_menu_choice c join hostel.weekly_menu_option o on o.option_id = c.option_id where c.week_id = ${id} group by 1, 2, 3)
      select day_no::int as day_no, meal::text as meal, count(*) filter (where nv)::int as non_veg, count(*) filter (where not nv)::int as veg,
        count(*) filter (where cz = 'North')::int as north, count(*) filter (where cz = 'South')::int as south
      from st group by 1, 2`);
    return { ...w, participation: part, courses: await this.courses(), dishes: await this.options(id), slots, diet };
  }

  /* ------------------------------------------------- choices entered by the Chief Chef */

  /** Residents of the week's mess with how much of the week each has chosen, and by whom. */
  async residents(id: number) {
    const w = await this.week(id);
    const students = await this.dbs.rows(sql`
      select r.student_id, initcap(sm.full_name) as name, r.hostel_code, r.cuisine, r.diet,
        case when sm.gender::text in ('Female', 'F') then 'Girls' else 'Boys' end as grp,
        count(c.*) filter (where c.source = 'Student')::int as by_student, count(c.*) filter (where c.source = 'Staff')::int as by_staff,
        count(c.*) filter (where c.source = 'Default')::int as by_default
      from hostel.v_mess_resident r join ref.student_master sm on sm.student_id = r.student_id
      left join hostel.weekly_menu_choice c on c.week_id = ${id} and c.student_id = r.student_id
      where r.mess_id = ${w.mess_id} group by 1, 2, 3, 4, 5, 6 order by 2`);
    const [{ slots, can_enter }] = await this.dbs.rows<{ slots: number; can_enter: boolean }>(sql`
      select (select count(*)::int from hostel.v_weekly_menu_slot where week_id = ${id}) as slots,
             (${w.status} <> 'Draft' and now() < (${w.week_start}::date::timestamp at time zone 'Asia/Kolkata')) as can_enter`);
    return { ...w, slots, can_enter, students };
  }

  /** One student's choices for the week, with the menu, for the Chief Chef to fill in. */
  async studentWeek(id: number, studentId: string) {
    const w = await this.week(id);
    const [st] = await this.dbs.rows<{ student_id: string; name: string; hostel_code: string; cuisine: string; diet: string; mess_id: number }>(sql`
      select r.student_id, initcap(sm.full_name) as name, r.hostel_code, r.cuisine, r.diet, r.mess_id::int as mess_id
      from hostel.v_mess_resident r join ref.student_master sm on sm.student_id = r.student_id where r.student_id = ${studentId}`);
    if (!st || st.mess_id !== w.mess_id) throw new NotFoundException(`${studentId} does not eat at ${w.mess_name}`);
    const choices = await this.dbs.rows(sql`select day_no::int as day_no, meal::text as meal, course_code, option_id::int as option_id, source
      from hostel.weekly_menu_choice where week_id = ${id} and student_id = ${studentId}`);
    const options = (await this.options(id)).map(({ chosen: _c, defaulted: _d, plates: _p, ...o }) => o);
    return { student: st, week: { ...w, fixed: await this.fixed(id), options, choices }, courses: await this.courses() };
  }

  async enterChoice(user: AuthUser, id: number, studentId: string, dto: { day_no: number; meal: Meal; course_code: string; option_id: number | null }) {
    if (!user.roles.some((r) => ENTERERS.includes(r))) throw new ForbiddenException('The Chief Chef enters choices for students');
    await this.studentWeek(id, studentId);
    await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.weekly_menu_choice (week_id, student_id, day_no, meal, course_code, option_id, source, entered_by)
      values (${id}, ${studentId}, ${dto.day_no}, ${dto.meal}::hostel.meal_slot, ${dto.course_code}, ${dto.option_id}, 'Staff', ${user.id})
      on conflict (week_id, student_id, day_no, meal, course_code) do update set option_id = excluded.option_id, source = 'Staff', entered_by = excluded.entered_by, chosen_at = now()`));
    return { ...dto };
  }

  /* ---------------------------------------------------------------- student */

  private async resident(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const [me] = await this.dbs.rows<{ mess_id: number; mess_name: string; region: string; diet: string; cuisine: string; hostel_code: string }>(sql`
      select r.mess_id::int as mess_id, m.mess_name, r.region, r.diet, r.cuisine, r.hostel_code from hostel.v_mess_resident r join hostel.mess_master m on m.mess_id = r.mess_id
      where r.student_id = ${user.id}`);
    return me ?? null;
  }

  /** The week being eaten now and the weeks open for choice, each with the student's choices. */
  async mine(user: AuthUser) {
    const me = await this.resident(user);
    if (!me) return { me: null, courses: [], weeks: [] };
    const weeks = await this.dbs.rows<Week>(sql`select ${WEEK_COLS} from ${WEEK_FROM}
      where w.mess_id = ${me.mess_id} and w.status <> 'Draft' and w.week_start + 6 >= (now() at time zone 'Asia/Kolkata')::date order by w.week_start limit 3`);
    const out = [];
    for (const w of weeks) {
      const choices = await this.dbs.rows<{ day_no: number; meal: string; course_code: string; option_id: number | null; source: string }>(sql`
        select day_no::int as day_no, meal::text as meal, course_code, option_id::int as option_id, source from hostel.weekly_menu_choice where week_id = ${w.week_id} and student_id = ${user.id}`);
      const options = (await this.options(w.week_id)).map(({ chosen: _c, defaulted: _d, plates: _p, ...o }) => o);
      out.push({ ...w, fixed: await this.fixed(w.week_id), options, choices });
    }
    const [{ today }] = await this.dbs.rows<{ today: string }>(sql`select to_char((now() at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD') as today`);
    return { me, today, courses: await this.courses(), weeks: out, next: await this.nextWeek() };
  }

  private async openWeekOf(user: AuthUser, weekId: number) {
    const me = await this.resident(user);
    if (!me) throw new UnprocessableEntityException('You choose meals once you live in a hostel');
    const w = await this.week(weekId);
    if (w.mess_id !== me.mess_id) throw new ForbiddenException(`This menu is for ${w.mess_name}; you eat at ${me.mess_name}`);
    return { me, w };
  }

  async choose(user: AuthUser, weekId: number, dto: { day_no: number; meal: Meal; course_code: string; option_id: number | null }) {
    await this.openWeekOf(user, weekId);
    if (dto.option_id != null) {
      const [o] = await this.dbs.rows(sql`select 1 from hostel.weekly_menu_option where option_id = ${dto.option_id} and week_id = ${weekId} and day_no = ${dto.day_no}
        and meal = ${dto.meal}::hostel.meal_slot and course_code = ${dto.course_code}`);
      if (!o) throw new BadRequestException('That dish is not on the menu for this meal');
    }
    await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.weekly_menu_choice (week_id, student_id, day_no, meal, course_code, option_id, source)
      values (${weekId}, ${user.id}, ${dto.day_no}, ${dto.meal}::hostel.meal_slot, ${dto.course_code}, ${dto.option_id}, 'Student')
      on conflict (week_id, student_id, day_no, meal, course_code) do update set option_id = excluded.option_id, source = 'Student', entered_by = null, chosen_at = now()`));
    return { ...dto };
  }

  /**
   * Fill the week with the dishes that fit a food style and diet. Live-counter items are made to order, so they are
   * left for the student to pick. Without `overwrite` only what is not chosen yet is filled.
   */
  async fill(user: AuthUser, weekId: number, dto: { cuisine: 'South' | 'North'; diet: 'Veg' | 'Non_Veg'; overwrite?: boolean }) {
    await this.openWeekOf(user, weekId);
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.weekly_menu_choice (week_id, student_id, day_no, meal, course_code, option_id, source)
      select s.week_id, ${user.id}, s.day_no, s.meal, s.course_code, hostel.fn_default_option(s.week_id, s.day_no, s.meal, s.course_code, ${dto.cuisine}, ${dto.diet}), 'Student'
      from hostel.v_weekly_menu_slot s
      where s.week_id = ${weekId} and s.default_on_close = 'Match'
        and hostel.fn_default_option(s.week_id, s.day_no, s.meal, s.course_code, ${dto.cuisine}, ${dto.diet}) is not null
      on conflict (week_id, student_id, day_no, meal, course_code) do update set option_id = excluded.option_id, source = 'Student', entered_by = null, chosen_at = now()
        where ${!!dto.overwrite}
      returning 1`)) as unknown as unknown[];
    return { filled: r.length };
  }
}

const tidy = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean).join(', ');
