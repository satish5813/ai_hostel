import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import QRCode from 'qrcode';
import { t } from '@klu/db';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Workflow E — apply > parent recommends > L1 Floor Warden > L2 Chief Warden > L3 Dean (a day or more) > QR pass > gate out > gate in. */
@Injectable()
export class OutpassService {
  constructor(private dbs: DbService) {}
  private get db() { return this.dbs.db; }

  async apply(user: AuthUser, dto: { reason: string; destination: string; leave_from: string; return_by: string; contact_during_leave: string }) {
    if (user.kind !== 'student') throw new ForbiddenException('Students apply for their own outpass');
    const [row] = await this.dbs.run(user, (tx) => tx.insert(t.outpass).values({
      student_id: user.id, reason: dto.reason, destination: dto.destination, leave_from: dto.leave_from, return_by: dto.return_by,
      contact_during_leave: dto.contact_during_leave, outing_category: 'Same_Day', levels_required: 2, created_by: user.id,
    }).returning());
    return this.get(row.outpass_id, user);
  }

  async get(id: number, user: AuthUser) {
    const [o] = await this.db.select().from(t.vOutpass).where(eq(t.vOutpass.outpass_id, id));
    if (!o) throw new NotFoundException('Outpass not found');
    if (user.kind === 'student' && o.student_id !== user.id) throw new ForbiddenException('Own outpass only');
    return o;
  }

  /** Own outings; a parent sees the child's (OUT-02 history). */
  mine(user: AuthUser) {
    const sid = user.kind === 'parent' ? sql`(select student_id from hostel.student_contact where contact_id = ${Number(user.id.replace('contact:', ''))})` : sql`${user.id}`;
    return this.db.select().from(t.vOutpass).where(sql`${t.vOutpass.student_id} = ${sid}`).orderBy(desc(t.vOutpass.applied_on));
  }

  list(q: { facility_id?: string; status?: string }, scope: string[] | null = null) {
    const conds = [];
    if (q.facility_id) conds.push(eq(t.vOutpass.facility_id, q.facility_id));
    else if (scope) conds.push(inArray(t.vOutpass.facility_id, scope.length ? scope : ['-']));
    if (q.status) conds.push(eq(t.vOutpass.status, q.status as never));
    return this.db.select().from(t.vOutpass).where(conds.length ? and(...conds) : undefined).orderBy(desc(t.vOutpass.applied_on)).limit(500);
  }

  async cancel(user: AuthUser, id: number) {
    const o = await this.get(id, user);
    if (!['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved', 'Approved'].includes(o.status!)) throw new UnprocessableEntityException(`Cannot cancel a pass that is ${o.status}`);
    return this.dbs.run(user, async (tx) => {
      await tx.update(t.approvalStep).set({ decision: 'Skipped', decided_on: new Date().toISOString() }).where(and(eq(t.approvalStep.request_type, 'Outpass'), eq(t.approvalStep.request_id, id), eq(t.approvalStep.decision, 'Pending')));
      const [row] = await tx.update(t.outpass).set({ status: 'Cancelled', qr_token: null, updated_by: user.id }).where(eq(t.outpass.outpass_id, id)).returning();
      return row;
    });
  }

  /** The QR the student shows at the gate (only once Approved). */
  async qr(user: AuthUser, id: number) {
    const o = await this.get(id, user);
    if (!o.qr_token) throw new UnprocessableEntityException('Pass is not approved yet');
    return { outpass_no: o.outpass_no, status: o.status, leave_from: o.leave_from, return_by: o.return_by, png_data_url: await QRCode.toDataURL(o.qr_token, { margin: 1, width: 280 }) };
  }

  /** Gate: what the guard sees when a pass is scanned (then POST /movements with the token to record out/in). */
  async verify(token: string) {
    const [o] = await this.db.select().from(t.vOutpass).where(eq(t.vOutpass.qr_token, token));
    if (!o) throw new NotFoundException('Unknown pass');
    const [s] = await this.db.select({ full_name: t.student.full_name, programme: t.student.programme, photo_object_key: t.student.photo_object_key }).from(t.student).where(eq(t.student.student_id, o.student_id!));
    const [bed] = await this.dbs.rows(sql`select b.hostel_name, b.floor_name, b.room_code from hostel.fn_student_stay(${o.student_id}) st join hostel.v_bed b on b.subspace_id = st.subspace_id`);
    const now = Date.now();
    const valid = o.status === 'Approved' && now <= new Date(o.return_by!).getTime() && now >= new Date(o.leave_from!).getTime() - 2 * 3600e3;
    return { ...o, student: s, bed, can_exit: valid, can_enter: ['Out', 'Overdue'].includes(o.status!) };
  }
}
