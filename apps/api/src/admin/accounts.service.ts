import { BadRequestException, ForbiddenException, HttpException, Injectable, Logger, NotFoundException, ServiceUnavailableException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { sql } from 'drizzle-orm';
import nodemailer, { type Transporter } from 'nodemailer';
import { DbService } from '../db/db.service.js';
import { PortalService } from './portal.service.js';
import { LOGIN_ROLES } from '../auth/auth.guard.js';
import { signLocal } from '../auth/local-token.js';
import type { AuthUser } from '../auth/auth.types.js';

/** The roles that sign in, in the order used to pick a person's main role, with what each is responsible for. */
export const ROLE_INFO: { code: string; label: string; group: string; hostel: boolean; does: string }[] = [
  { code: 'admin', label: 'Administrator', group: 'Administration', hostel: false, does: 'Masters, room builder, file uploads, logins and roles, approval rules, audit log' },
  { code: 'Chief_Warden', label: 'Chief Manager', group: 'Managers', hostel: true, does: 'Final approval of receipts, beds, outings, sick leave and room changes; the only editor of a student\'s hostel record' },
  { code: 'Director_Hostels', label: 'Director, Hostels', group: 'Managers', hostel: false, does: 'Everything a Chief Manager does, across all hostels' },
  { code: 'Warden', label: 'Warden', group: 'Managers', hostel: true, does: 'Day-to-day running of one hostel: indents, repairs, attendance, discipline' },
  { code: 'Floor_Warden', label: 'Floor Manager', group: 'Managers', hostel: true, does: 'First check of receipts, outings, sick leave and repairs; roll call; key and room handover' },
  { code: 'Room_Allotment', label: 'Room Allotment (hostel office)', group: 'Office', hostel: true, does: 'Fee checks, bed offers, check-in and handover, renewals, vacating' },
  { code: 'Accounts_Section', label: 'Accounts', group: 'Office', hostel: false, does: 'Fees, receipts, deposits and refunds, electricity bills' },
  { code: 'Mess_Incharge', label: 'Mess In-charge', group: 'Mess', hostel: false, does: 'Writes and publishes the weekly menu; replies to meal complaints' },
  { code: 'Mess_Manager', label: 'Mess Manager', group: 'Mess', hostel: false, does: 'Runs the mess: menus, stock and staff' },
  { code: 'Chief_Chef', label: 'Chief Chef', group: 'Mess', hostel: false, does: 'Weekly menu, choices entered for students, what students like' },
  { code: 'Mess_Supervisor', label: 'Mess Supervisor', group: 'Mess', hostel: false, does: 'Ratings and complaints dashboard' },
  { code: 'Mess_Storekeeper', label: 'Mess Storekeeper', group: 'Mess', hostel: false, does: 'Goods received, issues to the kitchen, stock' },
  { code: 'Cook', label: 'Cook', group: 'Mess', hostel: false, does: 'Sees the day\'s menu and the counts to cook for' },
  { code: 'Maintenance_Supervisor', label: 'Maintenance Supervisor', group: 'Maintenance', hostel: false, does: 'Assigns and closes repair tickets; fits meters' },
  { code: 'Technician', label: 'Technician', group: 'Maintenance', hostel: false, does: 'Works the repair tickets given to them' },
  { code: 'Electrician', label: 'Electrician', group: 'Maintenance', hostel: false, does: 'Electrical repair tickets and meter readings' },
  { code: 'Gym_Manager', label: 'Gym Manager', group: 'Facilities', hostel: false, does: 'Gym slots and attendance' },
  { code: 'Dean_Students_Affairs', label: 'Dean, Students Affairs', group: 'Management', hostel: false, does: 'Reports: absence, discipline, weekly floors; long outings' },
  { code: 'Pro_VC_Finance', label: 'Pro-VC, Finance', group: 'Management', hostel: false, does: 'Fee and dues dashboards' },
  { code: 'Pro_VC_Academics', label: 'Pro-VC, Academics', group: 'Management', hostel: false, does: 'Academic and attendance dashboards' },
  { code: 'Pro_VC', label: 'Pro-VC', group: 'Management', hostel: false, does: 'Executive dashboard' },
  { code: 'Vice_Chancellor', label: 'Vice-Chancellor', group: 'Management', hostel: false, does: 'Executive dashboard' },
  { code: 'Vice_President', label: 'Vice-President', group: 'Management', hostel: false, does: 'Executive dashboard' },
  { code: 'President', label: 'President', group: 'Management', hostel: false, does: 'Executive dashboard' },
  { code: 'Senior_Management', label: 'Senior management', group: 'Management', hostel: false, does: 'Executive dashboard, read-only' },
  { code: 'Ladies_Hostels_Head', label: 'Head, Ladies Hostels', group: 'Management', hostel: true, does: 'Executive dashboard of the hostels given to the login' },
  { code: 'Boys_Hostels_Head', label: 'Head, Boys Hostels', group: 'Management', hostel: true, does: 'Executive dashboard of the hostels given to the login' },
];
const STAFF_ROLES = ROLE_INFO.map((r) => r.code);
const INVITE_DAYS = 7, MAX_FAILS = 5, LOCK_MINUTES = 15;
const REG_CODE_MINUTES = 10, REG_MAX_TRIES = 5, REG_MAX_SENDS = 6;   // a student's own login (migration 131)
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const webUrl = () => (process.env.PUBLIC_WEB_URL ?? 'http://localhost:5180').replace(/\/$/, '');

type Account = { account_id: number; username: string; kind: 'student' | 'staff'; user_ref: string; email: string | null; status: string; token_version: number; full_name: string | null };

/**
 * Password logins (migration 128): the administrator makes them, one or many; each person is e-mailed a one-time
 * link and sets their own password. Sign-in answers with a token this API signs. What a staff login may do is the
 * roles in portal.user_role and the hostels in hostel.staff_space_assignment, as before.
 */
@Injectable()
export class AccountsService {
  private log = new Logger('Accounts');
  private smtp: Transporter | null = process.env.SMTP_HOST
    ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === '1',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined })
    : null;
  private draining = false;
  constructor(private dbs: DbService, private portal: PortalService) {}

  /* ---------------------------------------------------------------- signing in */

  private async rolesOf(a: { kind: string; user_ref: string }) {
    if (a.kind === 'student') return ['Student'];
    const held = await this.dbs.rows<{ role_code: string }>(sql`select distinct ur.role_code from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id where u.staff_id = ${a.user_ref} and u.active`);
    const codes = held.map((h) => h.role_code).filter((r) => LOGIN_ROLES.has(r));
    return [...STAFF_ROLES.filter((r) => codes.includes(r)), ...codes.filter((r) => !STAFF_ROLES.includes(r))];   // main role first
  }

  async login(username: string, password: string) {
    const [a] = await this.dbs.rows<Account & { ok: boolean | null; locked: boolean; minutes: number }>(sql`
      select a.account_id::int as account_id, a.username, a.kind, a.user_ref, a.status, a.token_version,
             (a.password_hash is not null and a.password_hash = crypt(${password}, a.password_hash)) as ok,
             coalesce(a.locked_until > now(), false) as locked, greatest(1, ceil(extract(epoch from a.locked_until - now()) / 60))::int as minutes,
             coalesce(sm.full_name, st.full_name) as full_name
      from portal.login_account a left join ref.student_master sm on a.kind = 'student' and sm.student_id = a.user_ref
      left join ref.staff_master st on a.kind = 'staff' and st.staff_id = a.user_ref
      where lower(a.username) = lower(${username})`);
    // one message for a wrong name, a wrong password and a login not yet set up, so none can be told apart from outside
    const wrong = new UnauthorizedException('The username or password is not right');
    if (!a || a.status !== 'Active') throw wrong;
    if (a.locked) throw new UnauthorizedException(`Too many wrong attempts. Try again in ${a.minutes} minute${a.minutes === 1 ? '' : 's'}.`);
    if (!a.ok) {
      await this.dbs.rows(sql`update portal.login_account set failed_count = case when failed_count + 1 >= ${MAX_FAILS} then 0 else failed_count + 1 end,
        locked_until = case when failed_count + 1 >= ${MAX_FAILS} then now() + make_interval(mins => ${LOCK_MINUTES}) else locked_until end where account_id = ${a.account_id}`);
      throw wrong;
    }
    const roles = await this.rolesOf(a);
    if (!roles.length) throw new ForbiddenException('This login has no role yet. Ask the hostel administrator.');
    await this.dbs.rows(sql`update portal.login_account set failed_count = 0, locked_until = null, last_login = now() where account_id = ${a.account_id}`);
    const token = await signLocal({ sub: a.user_ref, acc: a.account_id, ver: a.token_version, kind: a.kind, roles, name: a.full_name ?? undefined });
    return { id: a.user_ref, role: roles[0], roles, name: a.full_name, kind: a.kind, token };
  }

  /** Who a one-time link belongs to, for the "set your password" page. */
  async invite(token: string) {
    const [a] = await this.dbs.rows<{ username: string; kind: string; full_name: string | null }>(sql`
      select a.username, a.kind, initcap(coalesce(sm.full_name, st.full_name)) as full_name
      from portal.login_account a left join ref.student_master sm on a.kind = 'student' and sm.student_id = a.user_ref
      left join ref.staff_master st on a.kind = 'staff' and st.staff_id = a.user_ref
      where a.invite_hash = ${sha(token)} and a.invite_expires > now() and a.status <> 'Disabled'`);
    if (!a) throw new NotFoundException('This link has been used or has expired. Ask the hostel office to send a new one.');
    return a;
  }

  async setPassword(token: string, password: string) {
    const who = await this.invite(token);
    if (password.toLowerCase().includes(who.username.toLowerCase())) throw new BadRequestException('The password must not contain your username');
    await this.dbs.rows(sql`update portal.login_account set password_hash = crypt(${password}, gen_salt('bf', 10)), status = 'Active', invite_hash = null, invite_expires = null,
      token_version = token_version + 1, failed_count = 0, locked_until = null, password_set_on = now(), updated_at = now() where invite_hash = ${sha(token)}`);
    return { ok: true, username: who.username, kind: who.kind };
  }

  async changePassword(user: AuthUser, current: string, next: string) {
    const [a] = await this.dbs.rows<{ account_id: number; username: string; ok: boolean }>(sql`
      select account_id::int as account_id, username, (password_hash is not null and password_hash = crypt(${current}, password_hash)) as ok
      from portal.login_account where kind = ${user.kind} and user_ref = ${user.id} and status = 'Active'`);
    if (!a) throw new NotFoundException('This sign-in has no password to change');
    if (!a.ok) throw new UnauthorizedException('The current password is not right');
    if (next.toLowerCase().includes(a.username.toLowerCase())) throw new BadRequestException('The password must not contain your username');
    await this.dbs.rows(sql`update portal.login_account set password_hash = crypt(${next}, gen_salt('bf', 10)), token_version = token_version + 1, password_set_on = now(), updated_at = now(), updated_by = ${user.id} where account_id = ${a.account_id}`);
    return { ok: true, sign_in_again: true };
  }

  /* ---------------------------------------------------------------- a student creates their own login (migration 131) */

  /**
   * Step 1: e-mail a 6-digit code to <id>@kluniversity.in, if the ID is a current resident. The answer is the same
   * either way (it names the address the code would go to), so the page cannot be used to find out who lives here.
   */
  async registerStart(rawId: string) {
    const id = rawId.trim().toUpperCase();
    const to = `${id.toLowerCase()}@${process.env.STUDENT_MAIL_DOMAIN ?? 'kluniversity.in'}`;
    const answer = { sent_to: to, minutes: REG_CODE_MINUTES };
    if (!this.smtp && process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('Creating a login by e-mail is not switched on yet. Ask the residency office.');
    const [s] = await this.dbs.rows<{ disabled: boolean }>(sql`
      select exists (select 1 from portal.login_account a where a.kind = 'student' and a.user_ref = sm.student_id and a.status = 'Disabled') as disabled
      from ref.student_master sm where upper(sm.student_id) = ${id} and sm.status::text = 'Active'
        and exists (select 1 from hostel.hostel_allocation ha where ha.student_id = sm.student_id and ha.status = 'Active' and ha.occupant_type::text = 'Student')`);
    if (!s || s.disabled) return answer;
    const [prev] = await this.dbs.rows<{ wait: number; sends: number }>(sql`
      select greatest(0, ceil(extract(epoch from last_sent_at + interval '60 seconds' - now())))::int as wait,
             case when sent_on = current_date then sends_today else 0 end::int as sends
      from portal.register_code where student_id = ${id}`);
    if (prev?.wait) throw new HttpException({ statusCode: 429, message: `Please wait ${prev.wait} seconds before asking for a new code.` }, 429);
    if (prev && prev.sends >= REG_MAX_SENDS) throw new HttpException({ statusCode: 429, message: 'Too many codes today. Try again tomorrow, or ask the residency office.' }, 429);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.dbs.rows(sql`
      insert into portal.register_code as r (student_id, code_hash, sent_to, expires_at)
      values (${id}, ${sha(`${id}:${code}`)}, ${to}, now() + make_interval(mins => ${REG_CODE_MINUTES}))
      on conflict (student_id) do update set code_hash = excluded.code_hash, sent_to = excluded.sent_to, expires_at = excluded.expires_at, attempts = 0, used_at = null,
        sends_today = case when r.sent_on = current_date then r.sends_today + 1 else 1 end, sent_on = current_date, last_sent_at = now()`);
    if (!this.smtp) { this.log.warn(`no SMTP (development): registration code for ${id} is ${code}`); return answer; }
    try {
      await this.smtp.sendMail({ from: process.env.MAIL_FROM ?? 'KL Residencies <hostels@kluniversity.in>', to,
        subject: `${code} is your KL Residencies code`,
        text: `Your KL Residencies code is ${code}\n\nType it on the "Create my login" page within ${REG_CODE_MINUTES} minutes to choose your password.\nYour username is ${id}.\n\nIf you did not ask for this, ignore this e-mail. Nobody from the residency office will ask for this code or your password.`,
        html: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;color:#1a2433"><p>Your KL Residencies code is</p><p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:6px 0 14px">${code}</p><p>Type it on the <b>Create my login</b> page within ${REG_CODE_MINUTES} minutes to choose your password. Your username is <b>${id}</b>.</p><p style="color:#667085;font-size:13px">If you did not ask for this, ignore this e-mail. Nobody from the residency office will ask for this code or your password.</p></div>` });
    } catch (e) {
      this.log.error(`registration mail to ${to} failed: ${e instanceof Error ? e.message : e}`);
      await this.dbs.rows(sql`update portal.register_code set last_sent_at = now() - interval '60 seconds' where student_id = ${id}`);
      throw new ServiceUnavailableException('The e-mail could not be sent just now. Try again in a few minutes.');
    }
    return answer;
  }

  /** Step 2: the code and a new password make (or reset) the student's login and sign them in. */
  async registerFinish(rawId: string, code: string, password: string) {
    const id = rawId.trim().toUpperCase();
    const wrong = new BadRequestException('The code is not right or has expired. Ask for a new code.');
    const [r] = await this.dbs.rows<{ ok: boolean; live: boolean; attempts: number }>(sql`
      select code_hash = ${sha(`${id}:${code.trim()}`)} as ok, (expires_at > now() and used_at is null) as live, attempts::int as attempts
      from portal.register_code where student_id = ${id}`);
    if (!r || !r.live || r.attempts >= REG_MAX_TRIES) throw wrong;
    if (!r.ok) { await this.dbs.rows(sql`update portal.register_code set attempts = attempts + 1 where student_id = ${id}`); throw wrong; }
    if (password.toLowerCase().includes(id.toLowerCase())) throw new BadRequestException('The password must not contain your university ID');
    const [sm] = await this.dbs.rows<{ student_id: string }>(sql`select student_id from ref.student_master where upper(student_id) = ${id}`);
    if (!sm) throw wrong;
    const [acc] = await this.dbs.rows<{ status: string }>(sql`select status from portal.login_account where kind = 'student' and user_ref = ${sm.student_id}`);
    if (acc?.status === 'Disabled') throw new ForbiddenException('This login is switched off. Ask the residency office.');
    await this.dbs.rows(sql`update portal.register_code set used_at = now() where student_id = ${id}`);
    const [{ email }] = await this.dbs.rows<{ email: string }>(sql`select sent_to as email from portal.register_code where student_id = ${id}`);
    await this.dbs.rows(sql`
      insert into portal.login_account (username, kind, user_ref, email, password_hash, status, mail_status, password_set_on, created_by)
      values (${sm.student_id}, 'student', ${sm.student_id}, ${email}, crypt(${password}, gen_salt('bf', 10)), 'Active', 'No_Email', now(), ${sm.student_id})
      on conflict (kind, user_ref) do update set password_hash = excluded.password_hash, status = 'Active', email = coalesce(portal.login_account.email, excluded.email),
        invite_hash = null, invite_expires = null, token_version = portal.login_account.token_version + 1, failed_count = 0, locked_until = null,
        password_set_on = now(), updated_at = now(), updated_by = ${sm.student_id}`);
    return this.login(sm.student_id, password);
  }

  /* ---------------------------------------------------------------- the administrator's list */

  roles() { return ROLE_INFO; }

  list(q: { kind?: string; status?: string; search?: string; role?: string; mail?: string }) {
    const like = q.search?.trim() ? `%${q.search.trim().toLowerCase()}%` : null;
    return this.dbs.rows(sql`
      select a.account_id::int as account_id, a.username, a.kind, a.user_ref, coalesce(a.email, sm.personal_email, st.official_email) as email, a.status, a.mail_status, a.mail_error, a.mailed_on, a.last_login, a.password_set_on,
             a.invite_expires, coalesce(a.locked_until > now(), false) as locked, a.created_at, initcap(coalesce(sm.full_name, st.full_name)) as full_name,
             case when a.kind = 'student' then sm.programme else st.designation end as detail,
             case when a.kind = 'student' then array['Student'] else coalesce((select array_agg(distinct ur.role_code order by ur.role_code) from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id where u.staff_id = a.user_ref and u.active), '{}') end as roles,
             case when a.kind = 'student' then (select array[b.hostel_code] from hostel.fn_student_stay(a.user_ref) s join hostel.v_bed b on b.subspace_id = s.subspace_id)
                  else coalesce((select array_agg(distinct hp.hostel_code order by hp.hostel_code) from hostel.staff_space_assignment x join hostel.hostel_profile hp on hp.facility_id = x.facility_id where x.staff_id = a.user_ref and x.status = 'Active'), '{}') end as hostels
      from portal.login_account a left join ref.student_master sm on a.kind = 'student' and sm.student_id = a.user_ref
      left join ref.staff_master st on a.kind = 'staff' and st.staff_id = a.user_ref
      where (${q.kind ?? null}::text is null or a.kind = ${q.kind ?? null}) and (${q.status ?? null}::text is null or a.status = ${q.status ?? null})
        and (${q.mail ?? null}::text is null or a.mail_status = ${q.mail ?? null})
        and (${like}::text is null or lower(a.username) like ${like} or lower(coalesce(sm.full_name, st.full_name, '')) like ${like} or lower(coalesce(a.email, '')) like ${like})
        and (${q.role ?? null}::text is null or (${q.role ?? null} = 'Student' and a.kind = 'student')
             or exists (select 1 from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id where u.staff_id = a.user_ref and ur.role_code = ${q.role ?? null}))
      order by a.created_at desc, a.username limit 500`);
  }

  /** How many logins there are and how many are still to make: the numbers at the top of the page. */
  async summary() {
    const [n] = await this.dbs.rows<Record<string, number>>(sql`select
      (select count(*)::int from ref.student_master) as students,
      (select count(*)::int from portal.login_account where kind = 'student') as student_logins,
      (select count(distinct s.student_id)::int from ref.student_master s where exists (select 1 from hostel.hostel_allocation h where h.student_id = s.student_id and h.status = 'Active')) as residents,
      (select count(distinct u.staff_id)::int from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id where u.active and u.staff_id is not null and ur.role_code = any(string_to_array(${STAFF_ROLES.join(',')}, ','))) as staff_with_role,
      (select count(*)::int from portal.login_account where kind = 'staff') as staff_logins,
      (select count(*)::int from portal.login_account where status = 'Active') as active,
      (select count(*)::int from portal.login_account where status = 'Invited') as invited,
      (select count(*)::int from portal.login_account where status = 'Disabled') as disabled,
      (select count(*)::int from portal.login_account where mail_status = 'Queued') as mail_queued,
      (select count(*)::int from portal.login_account where mail_status = 'Failed') as mail_failed,
      (select count(*)::int from portal.login_account where mail_status = 'No_Email') as no_email`);
    const by = await this.dbs.rows<{ role_code: string; people: number; logins: number }>(sql`
      select ur.role_code, count(distinct u.staff_id)::int as people, count(distinct a.user_ref)::int as logins
      from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id and u.active and u.staff_id is not null
      left join portal.login_account a on a.kind = 'staff' and a.user_ref = u.staff_id
      where ur.role_code = any(string_to_array(${STAFF_ROLES.join(',')}, ',')) group by 1`);
    const roles = [{ code: 'Student', label: 'Student', group: 'Students', people: n.students, logins: n.student_logins },
      ...ROLE_INFO.map((r) => ({ code: r.code, label: r.label, group: r.group, people: by.find((b) => b.role_code === r.code)?.people ?? 0, logins: by.find((b) => b.role_code === r.code)?.logins ?? 0 }))];
    return { ...n, roles, mail_configured: !!this.smtp, mail_from: process.env.MAIL_FROM ?? null, web_url: webUrl(), invite_days: INVITE_DAYS };
  }

  /* ---------------------------------------------------------------- making logins */

  /** One login. For a staff member a role may be given at the same time, with the hostels it covers and the written approval. */
  async create(user: AuthUser, dto: { kind: 'student' | 'staff'; user_ref: string; email?: string | null; role?: string; facility_ids?: string[]; approval_ref?: string; send?: boolean }) {
    const ref = dto.user_ref.trim();
    const [p] = dto.kind === 'student'
      ? await this.dbs.rows<{ email: string | null }>(sql`select personal_email as email from ref.student_master where student_id = ${ref}`)
      : await this.dbs.rows<{ email: string | null }>(sql`select official_email as email from ref.staff_master where staff_id = ${ref}`);
    if (!p) throw new NotFoundException(dto.kind === 'student' ? `No student ${ref}. Load the student first (upload 9).` : `No staff member ${ref}. Load the staff first (upload 7).`);
    if (dto.kind === 'staff' && dto.role) {
      if (!STAFF_ROLES.includes(dto.role)) throw new BadRequestException(`${dto.role} does not sign in`);
      if (!dto.approval_ref?.trim()) throw new BadRequestException('Give the written approval (file or letter number) for the role');
      const info = ROLE_INFO.find((r) => r.code === dto.role)!;
      await this.portal.saveLogin(user, { staff_id: ref, role: dto.role as never, facility_ids: info.hostel ? dto.facility_ids ?? [] : [], approval_ref: dto.approval_ref.trim() });
    }
    if (dto.kind === 'staff' && !(await this.rolesOf({ kind: 'staff', user_ref: ref })).length) throw new UnprocessableEntityException('Give this staff member a role first: a login without a role cannot open anything');
    const email = dto.email?.trim() || null;
    const [a] = await this.dbs.run(user, (tx) => tx.execute(sql`
      insert into portal.login_account (username, kind, user_ref, email, mail_status, created_by)
      values (${ref}, ${dto.kind}, ${ref}, ${email}, ${email ?? p.email ? 'Not_Sent' : 'No_Email'}, ${user.id})
      on conflict (kind, user_ref) do update set email = coalesce(excluded.email, portal.login_account.email), updated_at = now(), updated_by = ${user.id}
      returning account_id::int as account_id, status`)) as unknown as { account_id: number; status: string }[];
    if (dto.send !== false && a.status !== 'Active') await this.queue([a.account_id]);
    return { account_id: a.account_id, status: a.status };
  }

  /** Many logins at once: every student or resident without one, every staff member who holds a role, or a list of IDs. */
  async bulk(user: AuthUser, dto: { scope: 'students' | 'residents' | 'staff' | 'list'; ids?: string[]; facility_id?: string; send?: boolean }) {
    const fac = dto.facility_id ?? null;
    let made: { account_id: number }[] = [], unknown: string[] = [];
    if (dto.scope === 'list') {
      const ids = [...new Set((dto.ids ?? []).map((i) => i.trim()).filter(Boolean))];
      if (!ids.length) throw new BadRequestException('Give at least one ID');
      if (ids.length > 20000) throw new BadRequestException('At most 20,000 IDs at a time');
      const lit = `{${ids.map((i) => `"${i.replace(/["\\]/g, '')}"`).join(',')}}`;
      const known = await this.dbs.rows<{ id: string; kind: string }>(sql`
        select student_id as id, 'student' as kind from ref.student_master where student_id = any(${lit}::text[])
        union all select st.staff_id, 'staff' from ref.staff_master st where st.staff_id = any(${lit}::text[])
          and exists (select 1 from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id where u.staff_id = st.staff_id and u.active)`);
      unknown = ids.filter((i) => !known.some((k) => k.id === i));
      made = await this.dbs.run(user, (tx) => tx.execute(sql`
        insert into portal.login_account (username, kind, user_ref, mail_status, created_by)
        select x.id, x.kind, x.id, case when x.email is null then 'No_Email' else 'Not_Sent' end, ${user.id} from (
          select student_id as id, 'student' as kind, personal_email as email from ref.student_master where student_id = any(${lit}::text[])
          union all select st.staff_id, 'staff', st.official_email from ref.staff_master st where st.staff_id = any(${lit}::text[])
            and exists (select 1 from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id where u.staff_id = st.staff_id and u.active)) x
        on conflict (kind, user_ref) do nothing returning account_id::int as account_id`)) as unknown as { account_id: number }[];
    } else if (dto.scope === 'staff') {
      made = await this.dbs.run(user, (tx) => tx.execute(sql`
        insert into portal.login_account (username, kind, user_ref, mail_status, created_by)
        select st.staff_id, 'staff', st.staff_id, case when st.official_email is null then 'No_Email' else 'Not_Sent' end, ${user.id} from ref.staff_master st
        where exists (select 1 from portal.user_role ur join portal.app_user u on u.user_id = ur.user_id where u.staff_id = st.staff_id and u.active and ur.role_code = any(string_to_array(${STAFF_ROLES.join(',')}, ',')))
          and (${fac}::text is null or exists (select 1 from hostel.staff_space_assignment x where x.staff_id = st.staff_id and x.status = 'Active' and x.facility_id = ${fac}))
        on conflict (kind, user_ref) do nothing returning account_id::int as account_id`)) as unknown as { account_id: number }[];
    } else {
      made = await this.dbs.run(user, (tx) => tx.execute(sql`
        insert into portal.login_account (username, kind, user_ref, mail_status, created_by)
        select s.student_id, 'student', s.student_id, case when s.personal_email is null then 'No_Email' else 'Not_Sent' end, ${user.id} from ref.student_master s
        where (${dto.scope} = 'students' and ${fac}::text is null)
           or exists (select 1 from hostel.hostel_allocation h join hostel.v_bed b on b.subspace_id = h.subspace_id where h.student_id = s.student_id and h.status = 'Active' and (${fac}::text is null or b.facility_id = ${fac}))
           or (${dto.scope} = 'students' and exists (select 1 from hostel.hostel_registration r where r.student_id = s.student_id and r.facility_id = ${fac} and r.status not in ('Cancelled', 'Vacated')))
        on conflict (kind, user_ref) do nothing returning account_id::int as account_id`)) as unknown as { account_id: number }[];
    }
    const ids = made.map((m) => m.account_id);
    const queued = dto.send !== false ? await this.queue(ids) : 0;
    return { created: ids.length, queued, unknown };
  }

  /* ---------------------------------------------------------------- e-mail with the one-time link */

  /** Mark logins to be mailed and start sending. Those with no address stay "No_Email": give them the link by hand. */
  private async queue(ids: number[]) {
    if (!ids.length) return 0;
    const q = await this.dbs.rows(sql`update portal.login_account a set mail_status = 'Queued', mail_error = null
      where a.account_id = any(${`{${ids.join(',')}}`}::bigint[]) and a.status <> 'Disabled' and a.mail_status <> 'No_Email' returning 1`);
    void this.drain();
    return q.length;
  }

  /** A fresh one-time link for one login; the old one stops working. */
  private async freshLink(accountId: number) {
    const token = randomBytes(32).toString('hex');
    await this.dbs.rows(sql`update portal.login_account set invite_hash = ${sha(token)}, invite_expires = now() + make_interval(days => ${INVITE_DAYS}), updated_at = now() where account_id = ${accountId}`);
    return `${webUrl()}/set-password?token=${token}`;
  }

  /** Send the queued invitations one after another. Without SMTP settings they wait in the queue.
   *  ponytail: one sender in this process, about five a second; move to a mail queue service if tens of thousands go out at once. */
  async drain() {
    if (this.draining || !this.smtp) return;
    this.draining = true;
    try {
      for (;;) {
        const batch = await this.dbs.rows<{ account_id: number; username: string; kind: string; user_ref: string; email: string | null; full_name: string | null }>(sql`
          select a.account_id::int as account_id, a.username, a.kind, a.user_ref, coalesce(a.email, sm.personal_email, st.official_email) as email, initcap(coalesce(sm.full_name, st.full_name)) as full_name
          from portal.login_account a left join ref.student_master sm on a.kind = 'student' and sm.student_id = a.user_ref
          left join ref.staff_master st on a.kind = 'staff' and st.staff_id = a.user_ref
          where a.mail_status = 'Queued' and a.status <> 'Disabled' order by a.account_id limit 50`);
        if (!batch.length) break;
        for (const a of batch) {
          if (!a.email) { await this.dbs.rows(sql`update portal.login_account set mail_status = 'No_Email' where account_id = ${a.account_id}`); continue; }
          try {
            const link = await this.freshLink(a.account_id);
            await this.smtp.sendMail({ from: process.env.MAIL_FROM ?? 'KL Residencies <hostels@kluniversity.in>', to: a.email, ...(await this.letter(a, link)) });
            await this.dbs.rows(sql`update portal.login_account set mail_status = 'Sent', mailed_on = now(), mail_error = null where account_id = ${a.account_id}`);
          } catch (e) {
            const why = (e instanceof Error ? e.message : String(e)).slice(0, 290);
            await this.dbs.rows(sql`update portal.login_account set mail_status = 'Failed', mail_error = ${why} where account_id = ${a.account_id}`);
            this.log.warn(`mail to ${a.username}: ${why}`);
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    } finally { this.draining = false; }
  }

  /** The e-mail: who it is for, the username, the link, and where to sign in. Staff are told their role and hostels. */
  async letter(a: { username: string; kind: string; user_ref: string; full_name: string | null }, link: string) {
    const staff = a.kind === 'staff';
    const roles = staff ? await this.rolesOf(a) : [];
    const hostels = staff ? (await this.dbs.rows<{ hostel_name: string }>(sql`select distinct hp.hostel_code as hostel_name from hostel.staff_space_assignment x join hostel.hostel_profile hp on hp.facility_id = x.facility_id where x.staff_id = ${a.user_ref} and x.status = 'Active' order by 1`)).map((h) => h.hostel_name) : [];
    const roleLine = roles.length ? `Your role: ${roles.map((r) => ROLE_INFO.find((i) => i.code === r)?.label ?? r.replace(/_/g, ' ')).join(', ')}${hostels.length ? ` (${hostels.join(', ')})` : ''}.` : '';
    const where = staff ? `Then sign in on the hostel portal: ${webUrl()}` : 'Then sign in with your university ID in the KL Residencies app on your phone, or on the hostel portal.';
    const lines = [`Dear ${a.full_name ?? a.username},`, '', 'Your login for the KL Residencies system is ready.', '', `Username: ${a.username}`, ...(roleLine ? [roleLine] : []), '',
      `Set your password with this link (it works once, for ${INVITE_DAYS} days):`, link, '', where, '', 'Nobody from the hostel office will ask for your password. If you did not expect this e-mail, ignore it.', '', 'KL Residencies'];
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const html = `<div style="font:15px/1.55 Arial,sans-serif;color:#10201E;max-width:560px"><p>Dear ${esc(a.full_name ?? a.username)},</p><p>Your login for the <b>KL Residencies</b> system is ready.</p>
<table style="border-collapse:collapse;margin:12px 0"><tr><td style="padding:4px 14px 4px 0;color:#4B5D5A">Username</td><td style="padding:4px 0"><b>${esc(a.username)}</b></td></tr>${roleLine ? `<tr><td style="padding:4px 14px 4px 0;color:#4B5D5A">Role</td><td style="padding:4px 0">${esc(roleLine.replace(/^Your role: /, '').replace(/\.$/, ''))}</td></tr>` : ''}</table>
<p><a href="${link}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#0B7A71;color:#fff;text-decoration:none;font-weight:bold">Set my password</a></p>
<p style="color:#4B5D5A;font-size:13px">The link works once, for ${INVITE_DAYS} days. ${esc(where)}</p><p style="color:#4B5D5A;font-size:13px">Nobody from the hostel office will ask for your password. If you did not expect this e-mail, ignore it.</p></div>`;
    return { subject: 'KL Residencies: your login is ready', text: lines.join('\n'), html };
  }

  /** Send the invitation again, or hand back the link to give in person (when there is no e-mail address or no mail server). */
  async reinvite(user: AuthUser, accountId: number, mode: 'mail' | 'link') {
    const [a] = await this.dbs.rows<{ status: string; mail_status: string }>(sql`select status, mail_status from portal.login_account where account_id = ${accountId}`);
    if (!a) throw new NotFoundException('Login not found');
    if (a.status === 'Disabled') throw new UnprocessableEntityException('This login is disabled. Enable it first.');
    if (mode === 'link') {
      const link = await this.freshLink(accountId);
      this.log.log(`one-time link for login ${accountId} made by ${user.id}`);
      return { link, expires_in_days: INVITE_DAYS };
    }
    if (a.mail_status === 'No_Email') throw new UnprocessableEntityException('No e-mail address on record. Add one, or copy the link and give it in person.');
    const queued = await this.queue([accountId]);
    return { queued, mail_configured: !!this.smtp };
  }

  async sendQueued() { void this.drain(); const [n] = await this.dbs.rows<{ n: number }>(sql`select count(*)::int as n from portal.login_account where mail_status = 'Queued'`); return { queued: n.n, mail_configured: !!this.smtp }; }

  /** Failed and never-sent invitations go back in the queue. */
  async requeue(_user: AuthUser) {
    const r = await this.dbs.rows(sql`update portal.login_account set mail_status = 'Queued', mail_error = null where status = 'Invited' and mail_status in ('Failed', 'Not_Sent') returning 1`);
    void this.drain();
    return { queued: r.length, mail_configured: !!this.smtp };
  }

  async setEmail(user: AuthUser, accountId: number, email: string) {
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`update portal.login_account set email = ${email}, mail_status = case when mail_status = 'No_Email' then 'Not_Sent' else mail_status end, updated_at = now(), updated_by = ${user.id}
      where account_id = ${accountId} returning 1`)) as unknown as unknown[];
    if (!r.length) throw new NotFoundException('Login not found');
    return { ok: true };
  }

  /** Disable signs the person out everywhere within half a minute; enable lets them in again with the same password. */
  async setActive(user: AuthUser, accountId: number, active: boolean) {
    const [a] = await this.dbs.rows<{ user_ref: string; kind: string; has_pw: boolean }>(sql`select user_ref, kind, password_hash is not null as has_pw from portal.login_account where account_id = ${accountId}`);
    if (!a) throw new NotFoundException('Login not found');
    if (!active && a.kind === user.kind && a.user_ref === user.id) throw new ForbiddenException('You cannot disable your own login');
    await this.dbs.run(user, (tx) => tx.execute(sql`update portal.login_account set status = ${active ? (a.has_pw ? 'Active' : 'Invited') : 'Disabled'}, token_version = token_version + 1,
      invite_hash = case when ${active} then invite_hash else null end, updated_at = now(), updated_by = ${user.id} where account_id = ${accountId}`));
    return { ok: true };
  }
}
