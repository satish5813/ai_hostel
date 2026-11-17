import { Controller, ForbiddenException, Get, Module, NotFoundException, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { CurrentUser, MANAGEMENT, OFFICE, Roles } from '../auth/decorators.js';
import { assertScope } from '../auth/scope.js';
import { EXECUTIVES } from '../exec/exec.controller.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Who may open any student's timetable: the hostel staff (within their hostels), management and the leadership. */
const VIEW = [...new Set([...OFFICE, ...MANAGEMENT, ...EXECUTIVES])];
const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Row = { day_no: number; hour_no: number; course_code: string; course_name: string | null; ltps: string; section: string | null; class_room: string | null; start_time: string | null; end_time: string | null };
export type ClassBlock = { from_hour: number; to_hour: number; start_time: string | null; end_time: string | null; course_code: string; course_name: string | null; ltps: string; section: string | null; class_room: string | null };

/** Back-to-back hours of the same course, component and room become one block ("Hours 3–4"). */
function blocks(rows: Row[]): ClassBlock[] {
  const out: ClassBlock[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.to_hour + 1 === r.hour_no && last.course_code === r.course_code && last.ltps === r.ltps && last.class_room === r.class_room) {
      last.to_hour = r.hour_no; last.end_time = r.end_time; continue;
    }
    out.push({ from_hour: r.hour_no, to_hour: r.hour_no, start_time: r.start_time, end_time: r.end_time, course_code: r.course_code, course_name: r.course_name, ltps: r.ltps, section: r.section, class_room: r.class_room });
  }
  return out;
}

/**
 * ACA-04 Class timetable. Floor managers, wardens and the chief manager type a university ID and see the student's week;
 * a student sees their own week, and today's classes on the home screen (`me/classes`).
 */
@ApiTags('L · class timetable')
@ApiBearerAuth()
@Controller()
export class TimetableController {
  constructor(private dbs: DbService) {}

  @Roles('Student', ...VIEW) @Get('timetable/students/:id')
  async student(@Param('id') raw: string, @CurrentUser() u: AuthUser) {
    const id = raw.trim();
    if (u.kind === 'student' && u.id !== id) throw new ForbiddenException('Own timetable only');
    if (u.kind === 'parent') throw new ForbiddenException('Not available to parents');
    const [st] = await this.dbs.rows<{ student_id: string; full_name: string; programme: string | null; year_semester: string | null; facility_id: string | null; hostel_name: string | null; floor_name: string | null; room_code: string | null; bed_code: string | null }>(sql`
      select sm.student_id, sm.full_name, sm.programme, sm.year_semester, b.facility_id, b.hostel_name, b.floor_name, b.room_code, b.bed_code
      from ref.student_master sm
      left join hostel.hostel_allocation a on a.student_id = sm.student_id and a.status = 'Active'
      left join hostel.v_bed b on b.subspace_id = a.subspace_id
      where sm.student_id = ${id}`);
    if (!st) throw new NotFoundException(`No student with university ID ${id}`);
    if (u.kind === 'staff' && u.scope) {
      if (!st.facility_id) throw new ForbiddenException('This student has no room in your hostels');
      assertScope(u, st.facility_id);
    }
    return { student: { ...st, facility_id: undefined }, ...(await this.week(id)) };
  }

  /** The signed-in student's classes today and the next one still to come (the home screen's daily class alert). */
  @Roles('Student') @Get('me/classes')
  async mine(@CurrentUser() u: AuthUser) {
    const w = await this.week(u.id);
    const today = w.days.find((d) => d.day_no === w.today_no);
    return { academic_year: w.academic_year, term: w.term, today_no: w.today_no, today_name: DAYS[w.today_no], classes: today?.classes ?? [], times_known: w.times_known, next_day: w.days.find((d) => d.day_no > w.today_no && d.classes.length) ?? w.days.find((d) => d.classes.length) ?? null };
  }

  private async week(id: string) {
    const [now] = await this.dbs.rows<{ today_no: number }>(sql`select extract(isodow from now() at time zone 'Asia/Kolkata')::int as today_no`);
    const [term] = await this.dbs.rows<{ academic_year: string; term: string }>(sql`
      select academic_year, term from acad.class_timetable where student_id = ${id} group by 1, 2 order by max(loaded_at) desc limit 1`);
    const rows = term ? await this.dbs.rows<Row>(sql`
      select t.day_no::int as day_no, t.hour_no::int as hour_no, t.course_code, n.course_name, t.ltps, t.section, t.class_room,
        to_char(h.start_time, 'HH24:MI') as start_time, to_char(h.end_time, 'HH24:MI') as end_time
      from acad.class_timetable t
      left join acad.class_hour h on h.hour_no = t.hour_no
      left join lateral (select c.course_name from acad.course_attendance c where c.course_code = t.course_code and c.course_name is not null limit 1) n on true
      where t.student_id = ${id} and t.academic_year = ${term.academic_year} and t.term = ${term.term}
      order by t.day_no, t.hour_no`) : [];
    const days = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ day_no: d, day_name: DAYS[d], classes: blocks(rows.filter((r) => r.day_no === d)) })).filter((d) => d.day_no < 7 || d.classes.length);
    return { academic_year: term?.academic_year ?? null, term: term?.term ?? null, today_no: now.today_no, times_known: rows.some((r) => r.start_time), hours_a_week: rows.length, days };
  }
}

@Module({ controllers: [TimetableController] })
export class TimetableModule {}
