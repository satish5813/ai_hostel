import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { t } from '@klu/db';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/** Workflow B — wardens to hostels, Floor Wardens to floors, cleaners and in-charges to areas, QR labels. */
@Injectable()
export class MappingService {
  constructor(private dbs: DbService) {}
  private get db() { return this.dbs.db; }

  assignments(facilityId?: string, activeOnly = true) {
    const conds = [];
    if (facilityId) conds.push(eq(t.staffSpaceAssignment.facility_id, facilityId));
    if (activeOnly) conds.push(eq(t.staffSpaceAssignment.status, 'Active'));
    return this.db.select({
      assignment_id: t.staffSpaceAssignment.assignment_id, staff_id: t.staffSpaceAssignment.staff_id, full_name: t.staff.full_name, mobile_no: t.staff.mobile_no,
      hostel_role: t.staffSpaceAssignment.hostel_role, facility_id: t.staffSpaceAssignment.facility_id, zone_id: t.staffSpaceAssignment.zone_id,
      space_id: t.staffSpaceAssignment.space_id, shift: t.staffSpaceAssignment.shift, from_date: t.staffSpaceAssignment.from_date, to_date: t.staffSpaceAssignment.to_date,
      show_on_qr: t.staffSpaceAssignment.show_on_qr, status: t.staffSpaceAssignment.status,
    }).from(t.staffSpaceAssignment).innerJoin(t.staff, eq(t.staff.staff_id, t.staffSpaceAssignment.staff_id))
      .where(conds.length ? and(...conds) : undefined).orderBy(t.staffSpaceAssignment.facility_id, t.staffSpaceAssignment.zone_id, t.staffSpaceAssignment.hostel_role);
  }

  assign(user: AuthUser, dto: { staff_id: string; hostel_role: string; facility_id: string; zone_id?: string; space_id?: string; shift?: string; from_date?: string; show_on_qr?: boolean }) {
    return this.dbs.run(user, async (tx) => {
      const [row] = await tx.insert(t.staffSpaceAssignment).values({
        staff_id: dto.staff_id, hostel_role: dto.hostel_role, facility_id: dto.facility_id, zone_id: dto.zone_id ?? null, space_id: dto.space_id ?? null,
        shift: (dto.shift ?? 'General') as never, from_date: dto.from_date ?? new Date().toISOString().slice(0, 10), show_on_qr: dto.show_on_qr ?? false, created_by: user.id,
      }).returning();
      return row;
    });
  }

  async end(user: AuthUser, id: number, toDate?: string) {
    const [row] = await this.dbs.run(user, (tx) => tx.update(t.staffSpaceAssignment)
      .set({ status: 'Ended', to_date: toDate ?? new Date().toISOString().slice(0, 10), updated_by: user.id })
      .where(eq(t.staffSpaceAssignment.assignment_id, id)).returning());
    if (!row) throw new NotFoundException('Assignment not found');
    return row;
  }

  /** Issue a new label for a space; the previous Active label is marked Replaced (one Active per space). */
  generateQr(user: AuthUser, spaceId: string) {
    return this.dbs.run(user, async (tx) => {
      await tx.update(t.spaceQr).set({ status: 'Replaced', updated_by: user.id }).where(and(eq(t.spaceQr.space_id, spaceId), eq(t.spaceQr.status, 'Active')));
      const [row] = await tx.insert(t.spaceQr).values({ space_id: spaceId, created_by: user.id }).returning();
      return row;
    });
  }

  async label(spaceId: string, baseUrl: string) {
    const [q] = await this.db.select().from(t.spaceQr).where(and(eq(t.spaceQr.space_id, spaceId), eq(t.spaceQr.status, 'Active')));
    if (!q) throw new NotFoundException('No active QR label for this space');
    const url = `${baseUrl}/qr/${q.qr_token}`;
    return { qr_id: q.qr_id, space_id: spaceId, url, png_data_url: await QRCode.toDataURL(url, { margin: 1, width: 320 }) };
  }

  markPrinted(user: AuthUser, qrId: number) {
    return this.dbs.run(user, (tx) => tx.update(t.spaceQr).set({ printed_on: new Date().toISOString(), updated_by: user.id }).where(eq(t.spaceQr.qr_id, qrId)).returning());
  }

  /** Public QR page: the space and the responsible people with phone numbers. */
  async qrPage(token: string) {
    const rows = await this.db.select().from(t.vSpaceQrPage).where(eq(t.vSpaceQrPage.qr_token, token));
    if (!rows.length) {
      const [q] = await this.db.select({ space_id: t.spaceQr.space_id, status: t.spaceQr.status }).from(t.spaceQr).where(eq(t.spaceQr.qr_token, token));
      if (!q) throw new NotFoundException('Unknown label');
      const [s] = await this.db.select().from(t.space).where(eq(t.space.space_id, q.space_id));
      return { space: s, status: q.status, people: [] };
    }
    const { space_id, space_code, space_name, space_category, zone_name, facility_name } = rows[0];
    return { space: { space_id, space_code, space_name, space_category, zone_name, facility_name }, status: 'Active', people: rows.map((r) => ({ role: r.hostel_role, name: r.full_name, mobile: r.mobile_no, shift: r.shift })) };
  }

  floorsWithoutWarden() { return this.db.select().from(t.vFloorsWithoutWarden); }

}
