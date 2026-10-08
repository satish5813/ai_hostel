import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';

/** People who map students to beds and staff to floors (Mapping centre). They may use only the mapping lists and files. */
export const MAPPERS = ['Chief_Warden', 'Director_Hostels', 'Hostel_Incharge', 'Warden', 'Office_Staff', 'Housekeeping_Supervisor'];
export const MAPPING_KINDS = ['duties', 'bed_map'];
export const isAdmin = (u: AuthUser) => u.role === 'admin' || u.roles?.includes('admin');
/** Lists the mapping forms need to read (hostel and room type pickers, staff look-up). */
const READ_KINDS = ['hostels', 'room_types', 'staff'];
export const allowKind = (u: AuthUser, kind: string, read = false) => {
  if (!isAdmin(u) && !MAPPING_KINDS.includes(kind) && !(read && READ_KINDS.includes(kind))) throw new ForbiddenException('Only the Data Administrator works on this master');
  return kind;
};
