import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthUser } from './auth.types.js';

export const IS_PUBLIC = 'isPublic';
export const ROLES_KEY = 'roles';

/** Route needs no sign-in (QR pages, payment webhooks). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Route needs one of these roles (portal.role codes). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
/** The signed-in user. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);

export const WARDENS = ['Chief_Warden', 'Warden', 'Assistant_Warden', 'Floor_Warden', 'Hostel_Incharge', 'Director_Hostels'];
/** Senior management that only reads and approves (Roles document, section 9). */
export const MANAGEMENT = ['Dean_Students_Affairs', 'Dean_Students_Progression', 'Pro_VC_Finance', 'Pro_VC_Academics', 'Vice_Chancellor', 'Vice_President', 'President'];
export const OFFICE = ['Office_Staff', 'Room_Allotment', ...WARDENS];
export const ACCOUNTS = ['Accounts_Section', 'accounts', 'Chief_Warden', 'Director_Hostels'];
export const SECURITY = ['Security_Guard', 'Security_Officer', ...WARDENS];
