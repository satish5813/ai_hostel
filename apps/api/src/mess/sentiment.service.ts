import { BadRequestException, ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

export type Filter = { from: string; to: string; mess_id?: number; gender?: 'All' | 'Boys' | 'Girls' };
export type Grain = 'day' | 'week' | 'month';
type Meal = 'Breakfast' | 'Lunch' | 'Evening_Snacks' | 'Dinner';

/** When each meal has been served (India time), so a student rates only what they have eaten. */
const SERVED_BY: Record<Meal, string> = { Breakfast: '07:30', Lunch: '12:30', Evening_Snacks: '16:30', Dinner: '19:30' };
const COUNTS = sql`count(*)::int as ratings, count(distinct r.student_id)::int as raters, round(avg(r.rating), 2)::float as avg_rating, round(avg(r.score), 3)::float as score,
  count(*) filter (where r.sentiment = 'Positive')::int as positive, count(*) filter (where r.sentiment = 'Neutral')::int as neutral,
  count(*) filter (where r.sentiment = 'Negative')::int as negative`;

/**
 * RPT-12 Mess sentiment and MES-02 Rate my meals. Students give each dish they ate one to five stars and, if they
 * like, a comment; the database scores each rating from the stars and the words (hostel.fn_text_sentiment) as
 * Positive, Neutral or Negative. The dashboard reads it by meal, dish, day, week and month, for boys and girls, with
 * how often each dish is chosen when offered. Counts and comments only: no student's name is shown.
 */
@Injectable()
export class SentimentService {
  constructor(private dbs: DbService) {}

  private where(f: Filter, alias = sql`r`): SQL {
    if (f.from > f.to) throw new BadRequestException('The start date is after the end date');
    const parts = [sql`${alias}.meal_date between ${f.from}::date and ${f.to}::date`];
    if (f.mess_id) parts.push(sql`${alias}.mess_id = ${f.mess_id}`);
    if (f.gender && f.gender !== 'All') parts.push(sql`${alias}.gender_group = ${f.gender}`);
    return sql.join(parts, sql` and `);
  }

  async dashboard(f: Filter) {
    const w = this.where(f);
    const days = Math.round((Date.parse(f.to) - Date.parse(f.from)) / 86_400_000) + 1;
    const prevTo = new Date(Date.parse(f.from) - 86_400_000).toISOString().slice(0, 10);
    const prevFrom = new Date(Date.parse(f.from) - days * 86_400_000).toISOString().slice(0, 10);
    const [kpi] = await this.dbs.rows(sql`select ${COUNTS}, count(r.comment)::int as comments from hostel.meal_rating r where ${w}`);
    const [prev] = await this.dbs.rows(sql`select ${COUNTS} from hostel.meal_rating r where ${this.where({ ...f, from: prevFrom, to: prevTo })}`);
    const [{ residents }] = await this.dbs.rows<{ residents: number }>(sql`select count(*)::int as residents from hostel.v_mess_resident v join ref.student_master sm using (student_id)
      where ${f.mess_id ? sql`v.mess_id = ${f.mess_id}` : sql`true`}
        and ${f.gender && f.gender !== 'All' ? sql`(case when sm.gender::text in ('Female', 'F') then 'Girls' else 'Boys' end) = ${f.gender}` : sql`true`}`);
    // by meal for each group, whatever the gender filter, so boys and girls can be set side by side
    const byMeal = await this.dbs.rows(sql`select r.meal::text as meal, r.gender_group as grp, ${COUNTS} from hostel.meal_rating r
      where ${this.where({ ...f, gender: 'All' })} group by grouping sets ((r.meal, r.gender_group), (r.meal)) order by 1, 2`);
    const trend = await this.dbs.rows(sql`select to_char(r.meal_date, 'YYYY-MM-DD') as date, ${COUNTS} from hostel.meal_rating r where ${w} group by r.meal_date order by r.meal_date`);
    const dishes = await this.dbs.rows(sql`
      with rt as (select r.meal::text as meal, r.dish, max(r.cuisine) as cuisine, max(r.diet) as diet, bool_or(r.course_code is null) as fixed, ${COUNTS},
                    round(avg(r.score) filter (where r.gender_group = 'Boys'), 3)::float as boys_score, round(avg(r.score) filter (where r.gender_group = 'Girls'), 3)::float as girls_score,
                    count(*) filter (where r.gender_group = 'Boys')::int as boys_n, count(*) filter (where r.gender_group = 'Girls')::int as girls_n
                  from hostel.meal_rating r where ${w} group by 1, 2),
      -- how often the dish is picked when it is on offer: choices for it / all answers to the course it was offered in
      pop as (select o.meal::text as meal, o.dish, sum(n.chosen)::int as chosen, sum(n.answered)::int as answered
                from hostel.weekly_menu_option o join hostel.weekly_menu wk on wk.week_id = o.week_id
                cross join lateral (select count(*) filter (where c.option_id = o.option_id) as chosen, count(*) as answered
                  from hostel.weekly_menu_choice c join ref.student_master sm on sm.student_id = c.student_id
                  where c.week_id = o.week_id and c.day_no = o.day_no and c.meal = o.meal and c.course_code = o.course_code
                    and ${f.gender && f.gender !== 'All' ? sql`(case when sm.gender::text in ('Female', 'F') then 'Girls' else 'Boys' end) = ${f.gender}` : sql`true`}) n
               where wk.week_start + o.day_no - 1 between ${f.from}::date and ${f.to}::date and ${f.mess_id ? sql`wk.mess_id = ${f.mess_id}` : sql`true`}
               group by 1, 2)
      select rt.*, pop.chosen, pop.answered, case when pop.answered > 0 then round(pop.chosen::numeric / pop.answered, 3)::float end as popularity
      from rt left join pop using (meal, dish) order by rt.score desc, rt.ratings desc`);
    const comments = await this.dbs.rows(sql`select to_char(r.meal_date, 'YYYY-MM-DD') as date, r.meal::text as meal, r.dish, r.rating, r.comment, r.sentiment, r.gender_group as grp
      from hostel.meal_rating r where ${w} and r.comment is not null order by r.meal_date desc, r.rated_at desc limit 40`);
    const words = await this.dbs.rows(sql`select sw.word, sw.weight, sw.note, count(*)::int as n from hostel.meal_rating r
      cross join lateral regexp_split_to_table(lower(r.comment), '[^a-z]+') t(w) join hostel.sentiment_word sw on sw.word = t.w
      where ${w} and r.comment is not null group by 1, 2, 3 order by n desc limit 24`);
    const messes = await this.dbs.rows(sql`select mess_id::int as mess_id, mess_name from hostel.mess_master where status = 'Active' order by mess_name`);
    return { filter: f, residents, kpi, prev: { ...prev, from: prevFrom, to: prevTo }, by_meal: byMeal, trend, dishes, comments, words, messes };
  }

  /** Rows for the download: one per period (day, week or month), meal, dish and group. */
  async export(f: Filter, grain: Grain) {
    const period = grain === 'day' ? sql`to_char(r.meal_date, 'YYYY-MM-DD')`
      : grain === 'week' ? sql`to_char(date_trunc('week', r.meal_date), 'YYYY-MM-DD')` : sql`to_char(r.meal_date, 'YYYY-MM')`;
    return this.dbs.rows(sql`select ${period} as period, m.mess_name, r.meal::text as meal, r.dish, coalesce(r.cuisine, '') as cuisine, coalesce(r.diet, '') as diet, r.gender_group as grp, ${COUNTS},
        count(r.comment)::int as comments
      from hostel.meal_rating r join hostel.mess_master m on m.mess_id = r.mess_id where ${this.where(f)}
      group by 1, 2, 3, 4, 5, 6, 7 order by 1, 2, array_position(array['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner'], r.meal::text), 4, 7`);
  }

  /* ---------------------------------------------------------------- student */

  /** The last four days' meals the student has been served, each dish with the student's stars and comment. */
  async mine(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const rows = await this.dbs.rows<{ date: string; meal: Meal; dish: string; course_code: string | null; option_id: number | null; diet: string | null; cuisine: string | null;
      rating: number | null; comment: string | null; sentiment: string | null }>(sql`
      with now_ as (select (now() at time zone 'Asia/Kolkata') as t)
      select distinct on (s.meal_date, s.meal, s.dish) to_char(s.meal_date, 'YYYY-MM-DD') as date, s.meal::text as meal, s.dish, s.course_code, s.option_id::int as option_id, s.diet, s.cuisine,
             r.rating::int as rating, r.comment, r.sentiment
      from hostel.v_meal_served s cross join now_
      left join hostel.meal_rating r on r.student_id = s.student_id and r.meal_date = s.meal_date and r.meal = s.meal and r.dish = s.dish
      where s.student_id = ${user.id} and s.meal_date between now_.t::date - 3 and now_.t::date
        and s.meal_date + (case s.meal when 'Breakfast' then ${SERVED_BY.Breakfast} when 'Lunch' then ${SERVED_BY.Lunch}
                                       when 'Evening_Snacks' then ${SERVED_BY.Evening_Snacks} else ${SERVED_BY.Dinner} end)::time <= now_.t
      order by s.meal_date desc, s.meal, s.dish, s.course_code nulls last`);
    const days = new Map<string, Map<Meal, typeof rows>>();
    for (const r of rows) {
      const d = days.get(r.date) ?? new Map<Meal, typeof rows>(); days.set(r.date, d);
      d.set(r.meal, [...(d.get(r.meal) ?? []), r]);
    }
    const order: Meal[] = ['Dinner', 'Evening_Snacks', 'Lunch', 'Breakfast'];
    return {
      days: [...days.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, meals]) => ({
        date, meals: order.filter((m) => meals.has(m)).map((meal) => ({ meal, dishes: meals.get(meal)!.sort((a, b) => Number(!!b.option_id) - Number(!!a.option_id) || a.dish.localeCompare(b.dish)) })),   // chosen dishes first, then daily items
      })),
    };
  }

  async rate(user: AuthUser, dto: { meal_date: string; meal: Meal; dish: string; rating: number; comment?: string | null }) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const [s] = await this.dbs.rows<{ mess_id: number; course_code: string | null; option_id: number | null; diet: string | null; cuisine: string | null }>(sql`
      select mess_id::int as mess_id, course_code, option_id::int as option_id, diet, cuisine from hostel.v_meal_served
      where student_id = ${user.id} and meal_date = ${dto.meal_date}::date and meal = ${dto.meal}::hostel.meal_slot and dish = ${dto.dish}
      order by course_code nulls last limit 1`);
    if (!s) throw new UnprocessableEntityException('You can rate only a dish you were served');
    const [r] = await this.dbs.run(user, (tx) => tx.execute(sql`
      insert into hostel.meal_rating (student_id, mess_id, meal_date, meal, dish, course_code, option_id, diet, cuisine, rating, comment, score, sentiment)
      values (${user.id}, ${s.mess_id}, ${dto.meal_date}::date, ${dto.meal}::hostel.meal_slot, ${dto.dish}, ${s.course_code}, ${s.option_id}, ${s.diet}, ${s.cuisine}, ${dto.rating}, ${dto.comment ?? null}, 0, 'Neutral')
      on conflict (student_id, meal_date, meal, dish) do update set rating = excluded.rating, comment = excluded.comment
      returning rating::int as rating, comment, sentiment`)) as unknown as { rating: number; comment: string | null; sentiment: string }[];
    return r;
  }
}
