import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { t } from '@klu/db';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Workflow D — consent > scan or camera event > current status > alert > action by Floor Warden or Security. */
@Injectable()
export class TrackingService {
  constructor(private dbs: DbService) {}
  private get db() { return this.dbs.db; }

  async consent(user: AuthUser, dto: { student_id?: string; given_by: 'Student' | 'Parent'; contact_id?: number }) {
    const studentId = user.kind === 'student' ? user.id : dto.student_id;
    if (!studentId) throw new UnprocessableEntityException('student_id required');
    const [[s], [v]] = await Promise.all([
      this.db.select({ dob: t.student.date_of_birth }).from(t.student).where(eq(t.student.student_id, studentId)),
      this.db.select({ value_text: t.policySetting.value_text }).from(t.policySetting).where(eq(t.policySetting.setting_key, 'tracking_policy_version')),
    ]);
    if (!s) throw new NotFoundException('Student not found');
    const age = (Date.now() - new Date(s.dob).getTime()) / (365.25 * 864e5);
    if (age < 18 && dto.given_by !== 'Parent') throw new UnprocessableEntityException('Students under 18 need parent consent');
    return this.dbs.run(user, async (tx) => {
      await tx.update(t.trackingConsent).set({ withdrawn_on: new Date().toISOString(), updated_by: user.id }).where(and(eq(t.trackingConsent.student_id, studentId), sql`withdrawn_on is null`));
      const [row] = await tx.insert(t.trackingConsent).values({
        student_id: studentId, given_by: dto.given_by, contact_id: dto.contact_id ?? null, policy_version: v?.value_text ?? 'v1',
        recorded_by: user.kind === 'staff' ? user.id : null, created_by: user.id,
      }).returning();
      return row;
    });
  }

  withdraw(user: AuthUser, consentId: number) {
    return this.dbs.run(user, (tx) => tx.update(t.trackingConsent).set({ withdrawn_on: new Date().toISOString(), updated_by: user.id }).where(eq(t.trackingConsent.consent_id, consentId)).returning());
  }

  consents(studentId: string) { return this.db.select().from(t.trackingConsent).where(eq(t.trackingConsent.student_id, studentId)).orderBy(desc(t.trackingConsent.given_on)); }

  capturePoints(facilityId?: string) {
    return this.db.select().from(t.capturePoint).where(facilityId ? eq(t.capturePoint.facility_id, facilityId) : undefined).orderBy(t.capturePoint.point_type, t.capturePoint.point_name);
  }
  addCapturePoint(user: AuthUser, dto: { point_name: string; point_type: string; facility_id: string; zone_id?: string; space_id?: string; device_type: string; device_ref?: string }) {
    return this.dbs.run(user, (tx) => tx.insert(t.capturePoint).values({
      point_name: dto.point_name, point_type: dto.point_type as never, facility_id: dto.facility_id, zone_id: dto.zone_id ?? null, space_id: dto.space_id ?? null,
      device_type: dto.device_type as never, device_ref: dto.device_ref ?? null, created_by: user.id,
    }).returning());
  }

  /**
   * Gate / corridor event. Devices send student_id; the gate scanner may send the outpass QR token instead.
   * The DB refuses the row without consent and raises the No_Pass_Exit / Pass_Overdue alerts itself.
   */
  async movement(user: AuthUser, dto: { student_id?: string; qr_token?: string; point_id: number; direction: 'In' | 'Out'; source?: 'Scan' | 'Camera' | 'Manual'; match_confidence?: number; event_at?: string }) {
    let studentId = dto.student_id;
    let outpass: { outpass_id: number; status: string; student_id: string } | undefined;
    if (dto.qr_token) {
      [outpass] = await this.db.select({ outpass_id: t.outpass.outpass_id, status: t.outpass.status, student_id: t.outpass.student_id }).from(t.outpass).where(eq(t.outpass.qr_token, dto.qr_token));
      if (!outpass) throw new NotFoundException('Unknown pass');
      if (!['Approved', 'Out', 'Overdue'].includes(outpass.status)) throw new UnprocessableEntityException(`Pass is ${outpass.status}`);
      studentId = outpass.student_id;
    }
    if (!studentId) throw new UnprocessableEntityException('student_id or qr_token required');
    const source = dto.source ?? (user.kind === 'system' ? 'Camera' : 'Scan');
    const [row] = await this.dbs.run(user, (tx) => tx.execute(sql`
      insert into hostel.movement_event (student_id, point_id, direction, event_at, source, match_confidence, outpass_id, recorded_by)
      values (${studentId}, ${dto.point_id}, ${dto.direction}::hostel.direction, ${dto.event_at ?? new Date().toISOString()}::timestamptz, ${source}::hostel.event_source,
              ${dto.match_confidence ?? null}, ${outpass?.outpass_id ?? null}, ${source === 'Manual' ? user.id : null})
      returning event_id, event_at`)) as unknown as { event_id: number; event_at: string }[];
    const [status] = await this.db.select().from(t.currentStatus).where(eq(t.currentStatus.student_id, studentId));
    return { event: row, status };
  }

  /** Where a student is — every call is written to Location_Access_Log (who looked, why). */
  async locate(user: AuthUser, studentId: string, purpose: 'Routine' | 'Alert' | 'Parent_Query' | 'Emergency', alertId?: number) {
    if (user.kind !== 'staff') throw new ForbiddenException('Authorised wardens and Security only');
    return this.dbs.run(user, async (tx) => {
      await tx.insert(t.locationAccessLog).values({ viewer_staff_id: user.id, student_id: studentId, purpose, alert_id: alertId ?? null });
      const [loc] = await tx.select().from(t.vStudentLocation).where(eq(t.vStudentLocation.student_id, studentId));
      if (!loc) throw new NotFoundException('Not a current hosteller');
      const recent = await tx.execute(sql`select e.event_id, e.event_at, e.direction, e.source, p.point_name, p.point_type from hostel.movement_event e join hostel.capture_point p using (point_id)
        where e.student_id = ${studentId} order by e.event_at desc limit 20`);
      return { ...loc, recent };
    });
  }

  /** Floor / hostel board. Logs one access row per student shown (purpose Routine). */
  async board(user: AuthUser, facilityId: string, zoneId?: string) {
    if (user.kind !== 'staff') throw new ForbiddenException('Staff only');
    return this.dbs.run(user, async (tx) => {
      const rows = await tx.select().from(t.vStudentLocation).where(zoneId ? and(eq(t.vStudentLocation.facility_id, facilityId), eq(t.vStudentLocation.zone_id, zoneId)) : eq(t.vStudentLocation.facility_id, facilityId));
      if (rows.length) await tx.insert(t.locationAccessLog).values(rows.map((r) => ({ viewer_staff_id: user.id, student_id: r.student_id!, purpose: 'Routine' as const })));
      return rows;
    });
  }

  alerts(q: { facility_id?: string; status?: string; alert_type?: string; assigned_to?: string }, scope: string[] | null = null) {
    const conds = [];
    if (q.facility_id) conds.push(eq(t.alert.facility_id, q.facility_id));
    else if (scope) conds.push(inArray(t.alert.facility_id, scope.length ? scope : ['-']));
    if (q.status) conds.push(eq(t.alert.status, q.status as never));
    if (q.alert_type) conds.push(eq(t.alert.alert_type, q.alert_type as never));
    if (q.assigned_to) conds.push(eq(t.alert.assigned_to, q.assigned_to));
    return this.db.select({ alert: t.alert, student_name: t.student.full_name }).from(t.alert).leftJoin(t.student, eq(t.student.student_id, t.alert.student_id))
      .where(conds.length ? and(...conds) : undefined).orderBy(desc(t.alert.raised_at)).limit(300)
      .then((rows) => rows.map((r) => ({ ...r.alert, student_name: r.student_name })));
  }

  updateAlert(user: AuthUser, alertId: number, dto: { status: 'Acknowledged' | 'Closed'; action_taken?: string; parent_informed?: boolean }) {
    return this.dbs.run(user, (tx) => tx.update(t.alert).set({
      status: dto.status, action_taken: dto.action_taken, parent_informed: dto.parent_informed,
      acknowledged_at: sql`coalesce(acknowledged_at, now())`, updated_by: user.id,
    }).where(eq(t.alert.alert_id, alertId)).returning());
  }

  accessLog(studentId?: string, viewer?: string) {
    return this.dbs.rows(sql`select l.log_id::int as log_id, l.viewer_staff_id, st.full_name as viewer_name, st.designation as viewer_designation, l.student_id, sm.full_name as student_name, l.viewed_at, l.purpose, l.alert_id::int as alert_id
      from hostel.location_access_log l left join ref.staff_master st on st.staff_id = l.viewer_staff_id left join ref.student_master sm on sm.student_id = l.student_id
      where ${studentId ? sql`l.student_id = ${studentId}` : sql`true`} and ${viewer ? sql`l.viewer_staff_id = ${viewer}` : sql`true`} order by l.viewed_at desc limit 500`);
  }
}
