import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { MANAGEMENT } from './decorators.js';
import type { AuthUser } from './auth.types.js';

/** Hostel roles whose login covers only the hostels of the person's active assignments (decision D7). */
export const SCOPED = new Set(['Chief_Warden', 'Warden', 'Assistant_Warden', 'Hostel_Incharge', 'Floor_Warden', 'Office_Staff', 'Room_Allotment', 'Ladies_Hostels_Head']);
const UNRESTRICTED = new Set(['admin', 'system', 'Director_Hostels', ...MANAGEMENT]);

/** null: every hostel; otherwise the facility ids the login may see (possibly none). */
export const scopeOf = (u?: AuthUser): string[] | null => u?.scope ?? null;

export function assertScope(u: AuthUser | undefined, facilityId: string | null | undefined) {
  const s = scopeOf(u);
  if (s && facilityId && !s.includes(facilityId)) throw new ForbiddenException(`Your login does not cover hostel ${facilityId.replace(/^H-/, '')}`);
}

/**
 * `col = f` when a hostel is asked for, else `col` within the login's hostels, else true.
 * `col` is a trusted column reference written in the service (never user input).
 */
export function facWhere(col: string, f: string | null | undefined, u?: AuthUser): SQL {
  const c = sql.raw(col);
  if (f) return sql`${c} = ${f}`;
  const s = scopeOf(u);
  return s ? sql`${c} = any(string_to_array(${s.join(',')}, ','))` : sql`true`;
}

/**
 * Runs after AuthGuard and RolesGuard. Works out the login's hostels once per request and refuses a request that names
 * another hostel in `facility_id` (query or body). Lists without a hostel are narrowed in the services with facWhere.
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private dbs: DbService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthUser; query?: Record<string, unknown>; body?: Record<string, unknown> }>();
    const u = req.user;
    if (!u) return true;
    if (u.kind !== 'staff' || u.roles.some((r) => UNRESTRICTED.has(r)) || !u.roles.some((r) => SCOPED.has(r))) { u.scope = null; return true; }
    const [r] = await this.dbs.rows<{ f: string[] | null }>(sql`select hostel.fn_staff_facilities(${u.id}) as f`);
    u.scope = r?.f ?? [];
    const asked = req.query?.facility_id ?? (req.body && typeof req.body === 'object' ? req.body.facility_id : undefined);
    if (typeof asked === 'string') assertScope(u, asked);
    return true;
  }
}
