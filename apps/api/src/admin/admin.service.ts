import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/**
 * ADM-01 Users and roles, ADM-02 Approval rules and settings, ADM-03 Audit log.
 * Rules (section 11 and 12): roles are given only on written approval, never to oneself;
 * the administrator cannot act in any workflow; audit rows are never changed.
 */
@Injectable()
export class AdminService {
  constructor(private dbs: DbService) {}

  roles() { return this.dbs.rows(sql`select role_code, name, module from portal.role order by module, name`); }

  users() {
    return this.dbs.rows(sql`
      select u.user_id, u.staff_id, u.full_name, u.email, u.title, u.home_dept, u.active,
             coalesce((select jsonb_agg(jsonb_build_object('role_code', ur.role_code, 'name', r.name, 'scope_dept', ur.scope_dept, 'granted_on', ur.granted_on, 'granted_by', ur.granted_by, 'approval_ref', ur.approval_ref) order by ur.granted_on)
                       from portal.user_role ur join portal.role r on r.role_code = ur.role_code where ur.user_id = u.user_id), '[]'::jsonb) as roles,
             (select count(*) from hostel.staff_space_assignment a where a.staff_id = u.staff_id and a.status = 'Active') as duties
      from portal.app_user u order by u.full_name`);
  }

  async grant(user: AuthUser, userId: number, dto: { role_code: string; scope_dept: string; approval_ref: string }) {
    const [target] = await this.dbs.rows<{ staff_id: string | null }>(sql`select staff_id from portal.app_user where user_id = ${userId}`);
    if (!target) throw new NotFoundException('User not found');
    if (target.staff_id === user.id) throw new ForbiddenException('A role cannot be given to oneself');
    await this.dbs.run(user, (tx) => tx.execute(sql`
      insert into portal.user_role (user_id, role_code, scope_dept, granted_by, approval_ref)
      values (${userId}, ${dto.role_code}, ${dto.scope_dept}, ${user.id}, ${dto.approval_ref})
      on conflict (user_id, role_code, scope_dept) do update set granted_by = excluded.granted_by, approval_ref = excluded.approval_ref, granted_on = current_date`));
    return { ok: true };
  }

  async revoke(user: AuthUser, userId: number, roleCode: string, scopeDept: string) {
    const [target] = await this.dbs.rows<{ staff_id: string | null }>(sql`select staff_id from portal.app_user where user_id = ${userId}`);
    if (!target) throw new NotFoundException('User not found');
    if (target.staff_id === user.id) throw new ForbiddenException('Your own roles are changed by another administrator');
    await this.dbs.run(user, (tx) => tx.execute(sql`delete from portal.user_role where user_id = ${userId} and role_code = ${roleCode} and scope_dept = ${scopeDept}`));
    return { ok: true };
  }

  approvalRules() {
    return this.dbs.rows(sql`select r.rule_id::int as rule_id, r.request_type, r.level, r.approver_role, ro.name as approver_name, r.condition_key, r.condition_value, r.is_mandatory, r.sla_hours, r.status
      from shared.approval_rule r left join portal.role ro on ro.role_code = r.approver_role order by r.request_type, r.level`);
  }

  async updateRule(user: AuthUser, ruleId: number, dto: { sla_hours?: number; is_mandatory?: boolean; status?: 'Active' | 'Inactive'; approver_role?: string }) {
    await this.dbs.run(user, (tx) => tx.execute(sql`update shared.approval_rule set
        sla_hours = coalesce(${dto.sla_hours ?? null}, sla_hours), is_mandatory = coalesce(${dto.is_mandatory ?? null}, is_mandatory),
        status = coalesce(${dto.status ?? null}::shared.active_status, status), approver_role = coalesce(${dto.approver_role ?? null}, approver_role)
      where rule_id = ${ruleId}`));
    return { ok: true };
  }

  settings() { return this.dbs.rows(sql`select setting_key, module, amount, value_text, meaning, updated_at, updated_by from shared.policy_setting order by module, setting_key`); }

  async updateSetting(user: AuthUser, key: string, dto: { amount?: number; value_text?: string }) {
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`update shared.policy_setting set amount = coalesce(${dto.amount ?? null}, amount), value_text = coalesce(${dto.value_text ?? null}, value_text), updated_at = now(), updated_by = ${user.id}
      where setting_key = ${key} returning setting_key`));
    if (!(r as unknown as unknown[]).length) throw new NotFoundException('Setting not found');
    return { ok: true };
  }

  reportVisibility() {
    return this.dbs.rows(sql`select v.report_code, v.role_code, r.name as role_name, v.scope, v.status from shared.report_visibility v left join portal.role r on r.role_code = v.role_code order by v.report_code, v.role_code`);
  }

  async setReportVisibility(user: AuthUser, dto: { report_code: string; role_code: string; scope: 'Own' | 'Floor' | 'Hostel' | 'All'; status: 'Active' | 'Inactive' }) {
    await this.dbs.run(user, (tx) => tx.execute(sql`insert into shared.report_visibility (report_code, role_code, scope, status) values (${dto.report_code}, ${dto.role_code}, ${dto.scope}::shared.visibility_scope, ${dto.status}::shared.active_status)
      on conflict (report_code, role_code) do update set scope = excluded.scope, status = excluded.status`));
    return { ok: true };
  }

  auditLog(q: { table?: string; actor?: string; kind?: string; limit?: number }) {
    const conds = [sql`true`];
    if (q.table) conds.push(sql`a.table_name = ${q.table}`);
    if (q.actor) conds.push(sql`a.actor = ${q.actor}`);
    if (q.kind) conds.push(sql`a.kind = ${q.kind}`);
    return this.dbs.rows(sql`select a.audit_id::int as audit_id, a.occurred_at, a.kind, a.outcome, a.actor, a.role_code, a.table_name, a.row_key, a.detail, left(a.hash, 12) as hash
      from shared.audit_log a where ${sql.join(conds, sql` and `)} order by a.audit_id desc limit ${Math.min(q.limit ?? 200, 1000)}`);
  }

  auditSummary() {
    return this.dbs.rows(sql`select kind, outcome, count(*)::int as rows, max(occurred_at) as last_at from shared.audit_log group by 1, 2 order by 3 desc`);
  }
}
