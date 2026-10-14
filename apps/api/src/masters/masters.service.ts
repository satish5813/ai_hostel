import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { t } from '@klu/db';
import { DbService } from '../db/db.service.js';
import { assertScope, facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

const KYC_FULL = ['Chief_Warden', 'Director_Hostels', 'admin'];
export type KycDto = { aadhaar_no?: string | null; aadhaar_photo?: string | null; blood_group?: string | null; hno?: string | null; street?: string | null; landmark?: string | null; city?: string | null; district?: string | null; state?: string | null; pincode?: string | null;
  father_name?: string | null; father_mobile?: string | null; mother_name?: string | null; mother_mobile?: string | null; guardian_name?: string | null; guardian_mobile?: string | null; guardian_relation?: string | null;
  emergency_name?: string | null; emergency_mobile?: string | null; medical_notes?: string | null };

@Injectable()
export class MastersService {
  constructor(private dbs: DbService) {}
  private get db() { return this.dbs.db; }

  hostels(scope: string[] | null = null) {
    return this.db.select({
      facility_id: t.hostelProfile.facility_id, hostel_code: t.hostelProfile.hostel_code, hostel_gender: t.hostelProfile.hostel_gender,
      facility_name: t.facility.facility_name, campus_id: t.facility.campus_id, no_of_floors: t.facility.no_of_floors,
      gate_close_time: t.hostelProfile.gate_close_time, status: t.hostelProfile.status,
    }).from(t.hostelProfile).innerJoin(t.facility, eq(t.facility.facility_id, t.hostelProfile.facility_id))
      .where(scope ? inArray(t.hostelProfile.facility_id, scope.length ? scope : ['-']) : undefined).orderBy(t.hostelProfile.hostel_code);
  }

  async currentYear() {
    const [y] = await this.db.select().from(t.academicYear).where(eq(t.academicYear.is_current, true));
    if (!y) throw new NotFoundException('No current academic year');
    return y;
  }
  academicYears() { return this.db.select().from(t.academicYear).orderBy(t.academicYear.start_date); }
  roomTypes() { return this.db.select().from(t.roomType).where(eq(t.roomType.status, 'Active')); }

  /** room types offered in a hostel this year, with fee and live vacancy */
  async hostelRoomTypes(facilityId: string) {
    const y = await this.currentYear();
    return this.dbs.rows(sql`
      select f.fee_id, f.room_type_id, rt.type_name, rt.sharing_count, rt.is_ac, rt.attached_bath,
             f.registration_fee, f.hostel_fee, f.instalment_1_pct, f.instalment_2_due_date,
             coalesce(v.vacant_beds,0) as vacant_beds, coalesce(v.held_beds,0) as held_beds, coalesce(v.occupied_beds,0) as occupied_beds
      from hostel.room_type_fee f
      join hostel.room_type rt on rt.room_type_id = f.room_type_id
      left join hostel.v_vacancy v on v.facility_id = f.facility_id and v.room_type_id = f.room_type_id
      where f.facility_id = ${facilityId} and f.academic_year = ${y.academic_year}
      order by rt.sharing_count, rt.is_ac desc`);
  }

  vacancy(facilityId?: string) {
    return facilityId ? this.db.select().from(t.vVacancy).where(eq(t.vVacancy.facility_id, facilityId)) : this.db.select().from(t.vVacancy);
  }

  beds(q: { facility_id?: string; zone_id?: string; bed_status?: string }) {
    const conds = [];
    if (q.facility_id) conds.push(eq(t.vBed.facility_id, q.facility_id));
    if (q.zone_id) conds.push(eq(t.vBed.zone_id, q.zone_id));
    if (q.bed_status) conds.push(eq(t.vBed.bed_status, q.bed_status as never));
    return this.db.select().from(t.vBed).where(conds.length ? and(...conds) : undefined).orderBy(t.vBed.floor_no, t.vBed.room_code, t.vBed.bed_code);
  }

  async student(studentId: string, user: AuthUser) {
    if (user.kind === 'student' && user.id !== studentId) throw new ForbiddenException('Own profile only');
    const [s] = await this.dbs.rows<Record<string, unknown>>(sql`
      select sm.student_id, sm.full_name, sm.gender, sm.programme, sm.student_type, sm.admission_type, sm.offering_mode, sm.regulation, sm.year_semester,
             sm.date_of_birth, sm.blood_group, sm.disability, sm.nationality, sm.personal_email, sm.admission_date, sm.father_name, sm.mother_name,
             sm.dept_code, d.dept_name, sm.counsellor_id, cs.full_name as counsellor_name, cs.mobile_no as counsellor_mobile,
             sm.is_hosteller, sm.status, sm.photo_object_key, coalesce((select p.image from hostel.student_photo p where p.student_id = sm.student_id), sm.photo) as photo,
             (select jsonb_agg(jsonb_build_object('hno', a.hno, 'street', a.street, 'landmark', a.landmark, 'city', a.city, 'district', a.district, 'state', a.state, 'pincode', a.pincode, 'type', a.address_type)) from ref.student_address a where a.student_id = sm.student_id) as addresses
      from ref.student_master sm left join ref.department d on d.dept_code = sm.dept_code left join ref.staff_master cs on cs.staff_id = sm.counsellor_id
      where sm.student_id = ${studentId}`);
    if (!s) throw new NotFoundException('Student not found');
    const contacts = await this.db.select().from(t.studentContact).where(eq(t.studentContact.student_id, studentId));
    const [stay] = await this.dbs.rows(sql`select * from hostel.fn_student_stay(${studentId})`);
    return { ...s, contacts, stay: stay?.hostel_alloc_id ? stay : null };
  }

  /**
   * The student's own photo, as a small JPEG, PNG or WebP data URL (the browser shrinks it to 320 px first), kept in
   * hostel.student_photo and shown on the profile and in the menu instead of the ERP's photo. null removes it.
   */
  /** The hostel record (migration 126). The full Aadhaar number only for the Chief Manager and admin; others see the last four digits. */
  async kyc(studentId: string, user: AuthUser) {
    if (user.kind === 'student' && user.id !== studentId) throw new ForbiddenException('Own record only');
    const full = user.roles.some((r) => KYC_FULL.includes(r));
    const [k] = await this.dbs.rows<Record<string, unknown>>(sql`select * from hostel.student_kyc where student_id = ${studentId}`);
    if (!k) return { student_id: studentId, submitted_on: null, locked: false, can_edit: user.kind === 'student' || full };
    const aad = k.aadhaar_no as string | null;
    return { ...k, aadhaar_no: full || !aad ? aad : `XXXX XXXX ${aad.slice(-4)}`, aadhaar_photo: full || user.kind === 'student' ? k.aadhaar_photo : null, locked: !!k.submitted_on, can_edit: full || (user.kind === 'student' && !k.submitted_on) };
  }

  /** The student submits it once; after that only the Chief Manager changes it. */
  async submitKyc(user: AuthUser, dto: KycDto) {
    if (user.kind !== 'student') throw new ForbiddenException('Students submit their own record');
    const [k] = await this.dbs.rows<{ submitted_on: string | null }>(sql`select submitted_on from hostel.student_kyc where student_id = ${user.id}`);
    if (k?.submitted_on) throw new UnprocessableEntityException('Your record is submitted. Ask the Chief Manager to change anything on it.');
    await this.writeKyc(user, user.id, dto, true);
    return this.kyc(user.id, user);
  }

  async updateKyc(user: AuthUser, studentId: string, dto: KycDto) {
    await this.writeKyc(user, studentId, dto, false);
    return this.kyc(studentId, user);
  }

  private writeKyc(user: AuthUser, studentId: string, d: KycDto, submit: boolean) {
    return this.dbs.run(user, (tx) => tx.execute(sql`
      insert into hostel.student_kyc (student_id, aadhaar_no, aadhaar_photo, blood_group, hno, street, landmark, city, district, state, pincode, father_name, father_mobile, mother_name, mother_mobile,
        guardian_name, guardian_mobile, guardian_relation, emergency_name, emergency_mobile, medical_notes, submitted_on, updated_by)
      values (${studentId}, ${d.aadhaar_no ?? null}, ${d.aadhaar_photo ?? null}, ${d.blood_group ?? null}, ${d.hno ?? null}, ${d.street ?? null}, ${d.landmark ?? null}, ${d.city ?? null}, ${d.district ?? null}, ${d.state ?? null}, ${d.pincode ?? null},
        ${d.father_name ?? null}, ${d.father_mobile ?? null}, ${d.mother_name ?? null}, ${d.mother_mobile ?? null}, ${d.guardian_name ?? null}, ${d.guardian_mobile ?? null}, ${d.guardian_relation ?? null},
        ${d.emergency_name ?? null}, ${d.emergency_mobile ?? null}, ${d.medical_notes ?? null}, ${submit ? sql`now()` : sql`null`}, ${user.id})
      on conflict (student_id) do update set aadhaar_no = coalesce(excluded.aadhaar_no, hostel.student_kyc.aadhaar_no), aadhaar_photo = coalesce(excluded.aadhaar_photo, hostel.student_kyc.aadhaar_photo),
        blood_group = excluded.blood_group, hno = excluded.hno, street = excluded.street, landmark = excluded.landmark, city = excluded.city, district = excluded.district, state = excluded.state, pincode = excluded.pincode,
        father_name = excluded.father_name, father_mobile = excluded.father_mobile, mother_name = excluded.mother_name, mother_mobile = excluded.mother_mobile,
        guardian_name = excluded.guardian_name, guardian_mobile = excluded.guardian_mobile, guardian_relation = excluded.guardian_relation, emergency_name = excluded.emergency_name, emergency_mobile = excluded.emergency_mobile,
        medical_notes = excluded.medical_notes, submitted_on = coalesce(hostel.student_kyc.submitted_on, excluded.submitted_on), updated_by = excluded.updated_by, updated_at = now()`));
  }

  async setPhoto(user: AuthUser, photo: string | null) {
    if (user.kind !== 'student') throw new ForbiddenException('Students set their own photo');
    if (photo && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)) throw new BadRequestException('Send a JPEG, PNG or WebP image');
    if (photo && photo.length > 300_000) throw new BadRequestException('The photo is too large; use a smaller picture');
    await this.dbs.run(user, (tx) => tx.execute(photo
      ? sql`insert into hostel.student_photo (student_id, image) values (${user.id}, ${photo}) on conflict (student_id) do update set image = excluded.image, updated_at = now()`
      : sql`delete from hostel.student_photo where student_id = ${user.id}`));
    return { ok: true };
  }

  /** The student's own room: bed, room type, roommates, the people to call, key and mess (student home). */
  async myRoom(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const [r] = await this.dbs.rows<Record<string, unknown>>(sql`
      select b.bed_label, b.hostel_name, b.hostel_code, b.floor_name, b.room_code, b.bed_code, b.type_name, b.is_ac, b.sharing_count::int as sharing_count,
             a.key_no, a.allocation_date, a.hostel_alloc_id::int as hostel_alloc_id, b.space_id, b.facility_id, b.zone_id
      from hostel.hostel_allocation a join hostel.v_bed b on b.subspace_id = a.subspace_id
      where a.student_id = ${user.id} and a.status = 'Active'`);
    if (!r) return null;
    const mates = await this.dbs.rows(sql`select b.bed_code, b.student_id, initcap(sm.full_name) as full_name, sm.programme, b.staff_id, initcap(st.full_name) as staff_name
      from hostel.v_bed b left join ref.student_master sm on sm.student_id = b.student_id left join ref.staff_master st on st.staff_id = b.staff_id
      where b.space_id = ${r.space_id} order by b.bed_code`);
    const people = await this.dbs.rows(sql`select distinct on (a.hostel_role) a.hostel_role, initcap(st.full_name) as full_name, st.mobile_no
      from hostel.staff_space_assignment a join ref.staff_master st on st.staff_id = a.staff_id
      where a.status = 'Active' and a.facility_id = ${r.facility_id} and a.hostel_role in ('Floor_Warden', 'Chief_Warden', 'Sweeper', 'Scavenger')
        and (a.hostel_role = 'Chief_Warden' or a.zone_id = ${r.zone_id})
      order by a.hostel_role, a.from_date desc`);
    const [mess] = await this.dbs.rows(sql`select m.mess_name, s.cuisine::text as cuisine from hostel.mess_subscription s join hostel.mess_master m on m.mess_id = s.mess_id
      where s.student_id = ${user.id} and s.status = 'Active' limit 1`);
    return { ...r, mates, people, mess: mess ?? null };
  }

  addContact(user: AuthUser, studentId: string, c: { relation: string; contact_name: string; mobile_no: string; is_outpass_approver?: boolean }) {
    if (user.kind === 'student' && user.id !== studentId) throw new ForbiddenException('Own contacts only');
    return this.dbs.run(user, (tx) => tx.insert(t.studentContact).values({
      student_id: studentId, relation: c.relation as never, contact_name: c.contact_name, mobile_no: c.mobile_no,
      is_outpass_approver: c.is_outpass_approver ?? false, created_by: user.id,
    }).returning());
  }

  /** OTP verification. Sending is the notification worker's job; in development the code 000000 is accepted. */
  async verifyContact(user: AuthUser, contactId: number, otp: string) {
    // the SMS provider is not wired yet: in development 000000 is accepted; in production only an explicitly set code is
    if (process.env.NODE_ENV === 'production' && !process.env.OTP_DEV_CODE) throw new ForbiddenException('OTP verification is not available yet: the SMS service is not connected');
    const accepted = process.env.OTP_DEV_CODE ? otp === process.env.OTP_DEV_CODE : otp === '000000';
    if (!accepted) throw new ForbiddenException('Wrong OTP');
    const [row] = await this.dbs.run(user, (tx) => tx.update(t.studentContact)
      .set({ is_verified: true, verified_on: new Date().toISOString(), updated_by: user.id })
      .where(eq(t.studentContact.contact_id, contactId)).returning());
    if (!row) throw new NotFoundException('Contact not found');
    return row;
  }

  setOutpassApprover(user: AuthUser, contactId: number) {
    return this.dbs.run(user, async (tx) => {
      const [c] = await tx.select().from(t.studentContact).where(eq(t.studentContact.contact_id, contactId));
      if (!c) throw new NotFoundException('Contact not found');
      if (user.kind === 'student' && user.id !== c.student_id) throw new ForbiddenException('Own contacts only');
      await tx.update(t.studentContact).set({ is_outpass_approver: false, updated_by: user.id }).where(eq(t.studentContact.student_id, c.student_id));
      const [row] = await tx.update(t.studentContact).set({ is_outpass_approver: true, updated_by: user.id }).where(eq(t.studentContact.contact_id, contactId)).returning();
      return row;
    });
  }

  async setBedStatus(user: AuthUser, subspaceId: string, status: 'Vacant' | 'Damaged', reason: string) {
    const [bed] = await this.db.select().from(t.subspace).where(eq(t.subspace.subspace_id, subspaceId));
    if (!bed) throw new NotFoundException('Bed not found');
    if (bed.status === 'Occupied' || bed.status === 'Held') throw new ForbiddenException(`Bed is ${bed.status}; it is released by the workflow, not by hand`);
    await this.dbs.run(user, async (tx) => {
      await tx.update(t.subspace).set({ status }).where(eq(t.subspace.subspace_id, subspaceId));
      await tx.execute(sql`insert into shared.audit_log (kind, outcome, actor, role_code, table_name, row_key, detail) values ('bed status', 'allowed', ${user.id}, ${user.role}, 'infra.subspace', ${subspaceId}, ${JSON.stringify({ status, reason })}::jsonb)`);
    });
    return { subspace_id: subspaceId, status };
  }

  async setRoomStatus(user: AuthUser, spaceId: string, status: 'Available' | 'Under_Maintenance', reason: string) {
    const [room] = await this.db.select().from(t.space).where(eq(t.space.space_id, spaceId));
    if (!room) throw new NotFoundException('Room not found');
    await this.dbs.run(user, async (tx) => {
      await tx.update(t.space).set({ status }).where(eq(t.space.space_id, spaceId));
      await tx.execute(sql`insert into shared.audit_log (kind, outcome, actor, role_code, table_name, row_key, detail) values ('room status', 'allowed', ${user.id}, ${user.role}, 'infra.space', ${spaceId}, ${JSON.stringify({ status, reason })}::jsonb)`);
    });
    return { space_id: spaceId, status };
  }

  async setRoomProfile(user: AuthUser, spaceId: string, dto: { room_type_id: number; reserved_for: 'None' | 'Staff' | 'Guest' | 'Medical'; is_accessible: boolean; approved_by?: string }) {
    const [row] = await this.dbs.run(user, (tx) => tx.insert(t.roomProfile).values({ space_id: spaceId, room_type_id: dto.room_type_id, reserved_for: dto.reserved_for, is_accessible: dto.is_accessible, created_by: user.id })
      .onConflictDoUpdate({ target: t.roomProfile.space_id, set: { room_type_id: dto.room_type_id, reserved_for: dto.reserved_for, is_accessible: dto.is_accessible, updated_by: user.id } }).returning());
    return row;
  }

  staffAllocations(facilityId?: string, user?: AuthUser) {
    return this.dbs.rows(sql`select a.hostel_alloc_id::int as hostel_alloc_id, a.staff_id, st.full_name, st.designation, st.dept_code, a.subspace_id, b.room_code, b.floor_name, b.hostel_name, b.facility_id,
        a.allocation_date, a.vacate_date, a.key_no, a.approved_by, a.status, a.remarks
      from hostel.hostel_allocation a join ref.staff_master st on st.staff_id = a.staff_id join hostel.v_bed b on b.subspace_id = a.subspace_id
      where a.occupant_type = 'Staff' and ${facWhere('b.facility_id', facilityId, user)} order by a.status, a.allocation_date desc`);
  }

  /** A staff room needs the Chief Manager of that hostel: a Chief Manager allotting is the approver; anyone else names one, who is checked. */
  async staffAllocate(user: AuthUser, dto: { staff_id: string; subspace_id: string; key_no: string; approved_by: string; remarks?: string }) {
    const [bed] = await this.dbs.rows<{ facility_id: string; hostel_code: string }>(sql`select facility_id, hostel_code from hostel.v_bed where subspace_id = ${dto.subspace_id}`);
    if (!bed) throw new NotFoundException('Bed not found');
    assertScope(user, bed.facility_id);
    const isCw = user.roles.includes('Chief_Warden') || user.roles.includes('Director_Hostels');
    if (!isCw) throw new ForbiddenException('Send the staff room to the Chief Manager: Exceptions, New request, Staff room');
    const approver = user.id;
    const [ok] = await this.dbs.rows<{ ok: boolean }>(sql`select hostel.fn_staff_has_role(${approver}, 'Chief_Warden', ${bed.facility_id}) or exists (select 1 from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id where u.staff_id = ${approver} and ur.role_code = 'Director_Hostels') as ok`);
    if (!ok?.ok) throw new UnprocessableEntityException(`${approver || 'The approver'} is not the Chief Manager of ${bed.hostel_code}`);
    dto = { ...dto, approved_by: approver };
    return this.dbs.run(user, async (tx) => {
      const [row] = await tx.insert(t.allocation).values({ occupant_type: 'Staff', staff_id: dto.staff_id, subspace_id: dto.subspace_id, academic_year: sql`(select academic_year from hostel.academic_year where is_current limit 1)` as never,
        key_no: dto.key_no, checked_in_by: user.id, approved_by: dto.approved_by, remarks: dto.remarks ?? null, created_by: user.id }).returning();
      return row;
    });
  }

  staffVacate(user: AuthUser, allocId: number) {
    return this.dbs.run(user, (tx) => tx.update(t.allocation).set({ status: 'Vacated', vacate_date: sql`current_date` as never, updated_by: user.id })
      .where(and(eq(t.allocation.hostel_alloc_id, allocId), eq(t.allocation.occupant_type, 'Staff'))).returning());
  }

  staff(q?: string) {
    return this.dbs.rows(sql`select staff_id, full_name, designation, dept_code, staff_type, mobile_no from ref.staff_master
      where status = 'Active' ${q ? sql`and (staff_id ilike ${'%' + q + '%'} or full_name ilike ${'%' + q + '%'})` : sql``} order by full_name limit 50`);
  }

  roomAssets(spaceId: string) {
    return this.db.select().from(t.asset).where(and(eq(t.asset.space_id, spaceId), eq(t.asset.status, 'Active')));
  }
}
