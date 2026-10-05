import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Request } from 'express';
import { IS_PUBLIC } from './decorators.js';
import type { AuthUser } from './auth.types.js';

/** This release has four logins (docs/flow-a-to-f.html), plus the mess (weekly menu, Chief Chef), management (dashboards), Accounts (electricity
 *  bills), and the wardens and maintenance staff who check and repair students' tickets (Workflow H).
 *  Everyone else acts through links or devices. */
export const LOGIN_ROLES = new Set(['admin', 'Chief_Warden', 'Director_Hostels', 'Room_Allotment', 'Office_Staff', 'Dean_Students_Affairs', 'Student', 'system',
  'Mess_Incharge', 'Mess_Manager', 'Cook', 'Pro_VC_Finance', 'Chief_Chef', 'Mess_Supervisor', 'President', 'Vice_President', 'Pro_VC', 'Pro_VC_Academics', 'Vice_Chancellor', 'Accounts_Section',
  'Floor_Warden', 'Warden', 'Maintenance_Supervisor', 'Technician', 'Electrician', 'Gym_Manager', 'Mess_Storekeeper']);
/** The Room Allotment login is the hostel office: it also carries Office_Staff. */
export const expandRoles = (roles: string[]) => (roles.includes('Room_Allotment') && !roles.includes('Office_Staff') ? [...roles, 'Office_Staff'] : roles);

/**
 * Bearer-token authentication against the university Keycloak realm (OIDC_ISSUER).
 * When OIDC_ISSUER is empty (local development) the caller identifies itself with headers:
 *   x-dev-user: 2600040010 | S-CW      x-dev-role: Student | Chief_Warden | Floor_Warden | ...
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private jwks = process.env.OIDC_ISSUER
    ? createRemoteJWKSet(new URL(`${process.env.OIDC_ISSUER}/protocol/openid-connect/certs`))
    : null;

  constructor(private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization;

    if (this.jwks && header?.startsWith('Bearer ')) {
      const { payload } = await jwtVerify(header.slice(7), this.jwks, {
        issuer: process.env.OIDC_ISSUER,
        audience: process.env.OIDC_AUDIENCE ?? 'klu-hostel',
      });
      req.user = AuthGuard.fromClaims(payload);
      return true;
    }
    if (!this.jwks) {
      const id = req.header('x-dev-user');
      const role = req.header('x-dev-role') ?? 'Student';
      if (id) {
        const roles = role.split(',');
        if (process.env.DEV_ALL_ROLES !== '1' && !roles.every((r) => LOGIN_ROLES.has(r))) throw new UnauthorizedException('This role does not sign in to this release; it acts through links or devices');
        req.user = { id, role, roles: expandRoles(roles), kind: role === 'Student' ? 'student' : 'staff' };
        return true;
      }
    }
    throw new UnauthorizedException('Sign in required');
  }

  static fromClaims(p: JWTPayload): AuthUser {
    const roles = ((p['realm_access'] as { roles?: string[] } | undefined)?.roles ?? []).filter((r) => /^[A-Z]/.test(r));
    const id = (p['uni_id'] as string | undefined) ?? (p['preferred_username'] as string | undefined) ?? p.sub ?? '';
    const role = roles[0] ?? 'Student';
    return { id, role, roles: expandRoles(roles), name: p['name'] as string | undefined, kind: role === 'Student' ? 'student' : role === 'Parent' ? 'parent' : 'staff' };
  }
}
