import { GoneException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

type Link = {
  link_id: number; step_id: number; contact_id: number | null; staff_id: string | null; expires_at: string; used_at: string | null;
  level: number; approver_role: string; decision: string; request_id: number;
};

/**
 * One-time links for the two people in the outing flow who have no login (decisions D2 and D3):
 * the parent recommends, and the Dean approves an outing of a day or more. The token is the only secret;
 * it works once, before it expires, and only while its step is still pending. The database still applies every rule.
 */
@Injectable()
export class LinksService {
  constructor(private dbs: DbService) {}

  private async link(token: string) {
    if (!/^[a-f0-9]{48}$/.test(token)) throw new NotFoundException('This link is not valid');
    const [l] = await this.dbs.rows<Link>(sql`
      select l.link_id::int as link_id, l.step_id::int as step_id, l.contact_id::int as contact_id, l.staff_id, l.expires_at, l.used_at,
             s.level, s.approver_role, s.decision::text as decision, s.request_id::int as request_id
      from shared.approval_link l join shared.approval_step s on s.step_id = l.step_id
      where l.token = ${token} and s.request_type = 'Outpass'`);
    if (!l) throw new NotFoundException('This link is not valid');
    return l;
  }

  private state(l: Link) {
    if (l.decision !== 'Pending') return 'decided';
    if (l.used_at) return 'used';
    if (new Date(l.expires_at) < new Date()) return 'expired';
    return 'open';
  }

  async view(token: string) {
    const l = await this.link(token);
    const [o] = await this.dbs.rows(sql`
      select o.outpass_no, o.student_id, initcap(sm.full_name) as full_name, sm.programme, o.reason, o.destination, o.leave_from, o.return_by,
             o.outing_category::text as outing_category, o.contact_during_leave, o.status::text as status, b.hostel_name, b.room_code
      from hostel.outpass o join ref.student_master sm on sm.student_id = o.student_id
      left join hostel.fn_student_stay(o.student_id) st on true left join hostel.v_bed b on b.subspace_id = st.subspace_id
      where o.outpass_id = ${l.request_id}`);
    const steps = await this.dbs.rows(sql`
      select s.level, s.approver_role, s.decision::text as decision, s.decided_on, s.remarks,
             coalesce(initcap(st.full_name), c.contact_name) as acted_by_name
      from shared.approval_step s left join ref.staff_master st on st.staff_id = s.acted_by left join hostel.student_contact c on c.contact_id = s.acted_by_contact
      where s.request_type = 'Outpass' and s.request_id = ${l.request_id} and s.decision <> 'Skipped' order by s.level`);
    const [who] = l.contact_id
      ? await this.dbs.rows<{ name: string; relation: string }>(sql`select contact_name as name, relation::text as relation from hostel.student_contact where contact_id = ${l.contact_id}`)
      : await this.dbs.rows<{ name: string; relation: string }>(sql`select initcap(full_name) as name, 'Dean, Students Affairs' as relation from ref.staff_master where staff_id = ${l.staff_id}`);
    return { as: l.contact_id ? 'Parent' : 'Dean', who, state: this.state(l), expires_at: l.expires_at, outpass: o, steps };
  }

  async act(token: string, decision: 'Approved' | 'Rejected', remarks?: string) {
    const l = await this.link(token);
    const st = this.state(l);
    if (st === 'decided' || st === 'used') throw new GoneException('This request has already been answered');
    if (st === 'expired') throw new GoneException('This link has expired. The Chief Warden can send a new one.');
    if (decision === 'Rejected' && !remarks?.trim()) throw new UnprocessableEntityException('Say why you refuse');
    const user: AuthUser = l.contact_id
      ? { id: `contact:${l.contact_id}`, kind: 'parent', role: 'Parent', roles: ['Parent'] }
      : { id: l.staff_id!, kind: 'staff', role: 'Dean_Students_Affairs', roles: ['Dean_Students_Affairs'] };
    await this.dbs.run(user, (tx) => tx.execute(l.contact_id
      ? sql`update shared.approval_step set decision = ${decision}::shared.decision, acted_by_contact = ${l.contact_id}, remarks = ${remarks ?? null} where step_id = ${l.step_id}`
      : sql`update shared.approval_step set decision = ${decision}::shared.decision, acted_by = ${l.staff_id}, remarks = ${remarks ?? null} where step_id = ${l.step_id}`));
    return this.view(token);
  }

  /** Chief Warden: send fresh links when the earlier ones expired or were lost. */
  async resend(user: AuthUser, outpassId: number) {
    const [s] = await this.dbs.rows<{ step_id: number; approver_role: string }>(sql`
      select step_id::int as step_id, approver_role from shared.approval_step
      where request_type = 'Outpass' and request_id = ${outpassId} and decision = 'Pending' order by level limit 1`);
    if (!s || !['Parent', 'Dean_Students_Affairs'].includes(s.approver_role)) throw new UnprocessableEntityException('Nobody is waiting on a link for this outing');
    const n = await this.dbs.run(user, async (tx) => {
      await tx.execute(sql`update shared.approval_link set expires_at = now() where step_id = ${s.step_id} and used_at is null and expires_at > now()`);
      const r = (await tx.execute(sql`select hostel.fn_issue_approval_links(${s.step_id}) as n`)) as unknown as { n: number }[];
      return Number(r[0]?.n ?? 0);
    });
    return { sent: n, to: s.approver_role === 'Parent' ? 'parent' : 'Dean' };
  }
}
