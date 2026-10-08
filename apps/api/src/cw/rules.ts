import { sql } from 'drizzle-orm';
import type { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

export type ExceptionKind = 'Blocked_Room' | 'Reserved_Room' | 'Other_Room_Type' | 'Waitlist_Jump' | 'Transfer' | 'Staff_Room';
export const isChiefWarden = (u: AuthUser) => u.roles.includes('Chief_Warden') || u.roles.includes('Director_Hostels');

/**
 * Is this bed outside the allotment rules for this registration? The first rule broken is the one asked about:
 * a blocked room, a reserved room, another room type, or students who have waited longer for this room type.
 */
export async function exceptionNeeded(dbs: DbService, registrationId: number, subspaceId: string): Promise<{ kind: ExceptionKind; text: string } | null> {
  const [x] = await dbs.rows<{ is_blocked: boolean; block_reason: string | null; reserved_for: string | null; same_type: boolean; bed_type: string | null; applied_type: string | null; ahead: number; bed_label: string }>(sql`
    select b.is_blocked, b.block_reason::text as block_reason, b.reserved_for::text as reserved_for, b.room_type_id = r.room_type_id as same_type,
           b.type_name as bed_type, rt.type_name as applied_type, b.bed_label,
           (select count(*)::int from hostel.hostel_registration w where w.facility_id = r.facility_id and w.room_type_id = b.room_type_id and w.academic_year = r.academic_year
              and w.status = 'Waitlisted' and w.registration_id <> r.registration_id and (r.waitlist_no is null or w.waitlist_no < r.waitlist_no)) as ahead
    from hostel.v_bed b, hostel.hostel_registration r left join hostel.room_type rt on rt.room_type_id = r.room_type_id
    where b.subspace_id = ${subspaceId} and r.registration_id = ${registrationId}`);
  if (!x) return null;
  if (x.is_blocked) return { kind: 'Blocked_Room', text: `room ${x.bed_label.replace(/-[A-H]$/, '')} is blocked (${(x.block_reason ?? '').replace(/_/g, ' ').toLowerCase()})` };
  if (x.reserved_for && x.reserved_for !== 'None') return { kind: 'Reserved_Room', text: `the room is kept for ${x.reserved_for.toLowerCase()}` };
  if (!x.same_type) return { kind: 'Other_Room_Type', text: `the student applied for ${x.applied_type ?? 'another type'}, this bed is ${x.bed_type ?? 'untyped'}` };
  if (x.ahead > 0) return { kind: 'Waitlist_Jump', text: `${x.ahead} student${x.ahead > 1 ? 's have' : ' has'} waited longer for ${x.bed_type}` };
  return null;
}
