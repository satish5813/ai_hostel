import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { DbService } from '../db/db.service.js';
import { OcrService } from './ocr.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/** A Postgres array literal: an empty list is '{}', which the driver cannot write on its own. */
const pgArray = (ids: number[]) => `{${ids.join(',')}}`;

export type ProofDto = { demand_ids: number[]; amount: number; paid_on: string; reference?: string | null; photo: string };

/**
 * Pay all with a receipt from the university portal, and the wallet (migration 123).
 * The student uploads the receipt against the demands it pays; the Floor Warden and Chief Warden decide it through the
 * approval engine (GEN-03), and the database writes the receipts and moves the registration on. The wallet holds what
 * was paid beyond the dues; dues can be paid from it at once.
 */
@Injectable()
export class WalletService {
  constructor(private dbs: DbService, private ocr: OcrService) {}

  private student(user: AuthUser) { if (user.kind !== 'student') throw new ForbiddenException('Students only'); return user.id; }

  /** The student's uploaded receipts, newest first, with the demands each one names and the approval trail. */
  async myProofs(user: AuthUser) {
    const s = this.student(user);
    return this.dbs.rows(sql`
      select p.proof_id::int as proof_id, p.proof_no, p.amount::float as amount, p.paid_on, p.reference, p.status, p.remarks, p.created_at, p.decided_on, p.photo, p.mime, p.ocr_status, p.ocr_checks,
             (select coalesce(json_agg(json_build_object('demand_id', d.demand_id::int, 'fee_head', d.fee_head::text, 'instalment_no', d.instalment_no, 'amount_due', d.amount_due::float, 'amount_paid', d.amount_paid::float, 'status', d.status::text) order by d.due_date), '[]'::json)
                from hostel.fee_demand d where d.demand_id = any(p.demand_ids)) as demands,
             (select coalesce(json_agg(json_build_object('level', st.level, 'approver_role', st.approver_role::text, 'decision', st.decision::text, 'decided_on', st.decided_on, 'remarks', st.remarks, 'acted_by_name', sm.full_name) order by st.level), '[]'::json)
                from shared.approval_step st left join ref.staff_master sm on sm.staff_id = st.acted_by where st.request_type = 'Payment_Proof' and st.request_id = p.proof_id) as steps
      from hostel.payment_proof p where p.student_id = ${s} order by p.created_at desc`);
  }

  /** Upload: the receipt photo, how much, when, the portal's reference, and the demands it pays (none = money for the wallet). */
  async upload(user: AuthUser, dto: ProofDto) {
    const s = this.student(user);
    const kind = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,/.exec(dto.photo)?.[1];
    if (!kind) throw new UnprocessableEntityException('Attach a photograph or a PDF of the receipt');
    const hash = createHash('sha256').update(dto.photo.slice(dto.photo.indexOf(',') + 1)).digest('hex');
    const [dup] = await this.dbs.rows<{ proof_no: string; mine: boolean }>(sql`select proof_no, student_id = ${s} as mine from hostel.payment_proof where status <> 'Rejected' and (file_hash = ${hash} or (${dto.reference ?? null}::text is not null and upper(reference) = upper(${dto.reference ?? null}))) limit 1`);
    if (dup) throw new UnprocessableEntityException(dup.mine ? `You already uploaded this receipt (${dup.proof_no}).` : 'This receipt has already been uploaded. Each receipt can be used once.');
    if (dto.demand_ids.length) {
      const own = await this.dbs.rows<{ n: number; open: number }>(sql`select count(*)::int as n, count(*) filter (where status not in ('Paid','Waived'))::int as open
        from hostel.fee_demand where student_id = ${s} and demand_id = any(${pgArray(dto.demand_ids)}::bigint[])`);
      if (own[0].n !== dto.demand_ids.length) throw new UnprocessableEntityException('One of the fees is not yours');
      if (own[0].open === 0) throw new UnprocessableEntityException('Those fees are already paid');
    }
    const waiting = await this.dbs.rows<{ n: number }>(sql`select count(*)::int as n from hostel.payment_proof where student_id = ${s} and status in ('Uploaded','Checked')`);
    if (waiting[0].n > 0) throw new UnprocessableEntityException('A receipt of yours is still being checked. Wait for it before uploading another.');
    const r = await this.dbs.run(user, async (tx) => tx.execute(sql`insert into hostel.payment_proof (student_id, amount, paid_on, reference, photo, demand_ids, created_by)
      values (${s}, ${dto.amount}, ${dto.paid_on}, ${dto.reference ?? null}, ${dto.photo}, ${pgArray(dto.demand_ids)}::bigint[], ${s}) returning proof_id`));
    const insertedId = (r as unknown as { rows?: { proof_id: number }[] }).rows?.[0]?.proof_id ?? (r as unknown as { proof_id: number }[])[0]?.proof_id;
    await this.dbs.rows(sql`update hostel.payment_proof set mime = ${kind}, file_hash = ${hash} where proof_id = ${insertedId}`);
    // the receipt is read after the answer goes back; the result appears on the next refresh
    setImmediate(() => this.ocr.check(insertedId).catch((e) => console.warn('OCR', e)));
    const id = insertedId;
    const [row] = await this.dbs.rows(sql`select proof_id::int as proof_id, proof_no, status from hostel.payment_proof where proof_id = ${id}`);
    return row;
  }

  /** One receipt, for the warden deciding it (the inbox names the step; the drawer shows the photo and the fees). */
  async proof(id: number) {
    const [p] = await this.dbs.rows(sql`
      select p.proof_id::int as proof_id, p.proof_no, p.student_id, sm.full_name, sm.programme, p.facility_id, p.amount::float as amount, p.paid_on, p.reference, p.status, p.remarks, p.photo, p.mime, p.ocr_status, p.ocr_checks, p.ocr_at, p.created_at,
             (select coalesce(json_agg(json_build_object('demand_id', d.demand_id::int, 'fee_head', d.fee_head::text, 'instalment_no', d.instalment_no, 'balance', (d.amount_due - d.amount_paid)::float, 'status', d.status::text) order by d.due_date), '[]'::json)
                from hostel.fee_demand d where d.demand_id = any(p.demand_ids)) as demands,
             (select (sum(d.amount_due - d.amount_paid))::float from hostel.fee_demand d where d.demand_id = any(p.demand_ids) and d.status not in ('Paid','Waived')) as dues
      from hostel.payment_proof p join ref.student_master sm on sm.student_id = p.student_id where p.proof_id = ${id}`);
    if (!p) throw new NotFoundException('Receipt not found');
    return p;
  }

  /** Balance and the ledger. */
  async wallet(user: AuthUser) {
    const s = this.student(user);
    const [w] = await this.dbs.rows<{ balance: number }>(sql`select coalesce(balance, 0)::float as balance from hostel.v_wallet where student_id = ${s}`);
    const txns = await this.dbs.rows(sql`select txn_id::int as txn_id, kind, amount::float as amount, reason, reference_type, reference_id::int as reference_id, created_at
      from hostel.wallet_txn where student_id = ${s} order by created_at desc limit 50`);
    return { balance: w?.balance ?? 0, txns };
  }

  /** Pay the named demands from the wallet, all at once. */
  async pay(user: AuthUser, demandIds: number[]) {
    const s = this.student(user);
    if (!demandIds.length) throw new UnprocessableEntityException('Choose what to pay');
    await this.dbs.run(user, (tx) => tx.execute(sql`select hostel.fn_wallet_pay(${s}, ${pgArray(demandIds)}::bigint[], ${s})`));
    return this.wallet(user);
  }
}
