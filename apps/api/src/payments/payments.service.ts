import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { t } from '@klu/db';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/**
 * Online payments through Razorpay (UPI / card / net banking). The receipt is written only from the webhook,
 * so a page refresh or a replayed webhook can never pay twice (unique gateway_ref). Without keys configured the
 * service runs in DEV mode: /payments/dev-confirm records the receipt directly.
 */
@Injectable()
export class PaymentsService {
  constructor(private dbs: DbService) {}
  private get db() { return this.dbs.db; }
  private get keyId() { return process.env.RAZORPAY_KEY_ID; }
  private get live() { return !!(this.keyId && process.env.RAZORPAY_KEY_SECRET); }

  async createOrder(user: AuthUser, demandId: number) {
    const [d] = await this.db.select().from(t.feeDemand).where(eq(t.feeDemand.demand_id, demandId));
    if (!d) throw new NotFoundException('Demand not found');
    if (user.kind === 'student' && d.student_id !== user.id) throw new ForbiddenException('Own dues only');
    if (d.status === 'Paid' || d.status === 'Waived') throw new UnprocessableEntityException(`Demand is already ${d.status}`);
    const balance = Number(d.amount_due) - Number(d.amount_paid);
    if (!this.live) {
      return { mode: 'dev', demand_id: demandId, amount: balance, currency: 'INR', note: 'Razorpay keys not set; call POST /payments/dev-confirm' };
    }
    const auth = Buffer.from(`${this.keyId}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(balance * 100), currency: 'INR', receipt: `D${demandId}`, notes: { demand_id: String(demandId), student_id: d.student_id, fee_head: d.fee_head } }),
    });
    if (!res.ok) throw new UnprocessableEntityException(`Gateway refused: ${await res.text()}`);
    const order = (await res.json()) as { id: string; amount: number; currency: string };
    return { mode: 'razorpay', key_id: this.keyId, order_id: order.id, amount: order.amount / 100, currency: order.currency, demand_id: demandId, student_name: user.name };
  }

  /** Razorpay webhook: payment.captured -> receipt (+ meter recharge when the demand is an electricity top-up). */
  async webhook(rawBody: Buffer, signature: string | undefined) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature) throw new ForbiddenException('Webhook not configured');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new ForbiddenException('Bad signature');
    const evt = JSON.parse(rawBody.toString()) as { event: string; payload: { payment: { entity: { id: string; amount: number; method: string; notes: Record<string, string> } } } };
    if (evt.event !== 'payment.captured') return { ignored: evt.event };
    const p = evt.payload.payment.entity;
    const mode = p.method === 'upi' ? 'UPI' : p.method === 'card' ? 'Card' : 'Net_Banking';
    return this.record(null, Number(p.notes.demand_id), p.amount / 100, mode, p.id);
  }

  /** DEV only: record a successful online payment without the gateway. */
  devConfirm(user: AuthUser, demandId: number, amount: number) {
    if (this.live) throw new ForbiddenException('Not available when Razorpay is configured');
    return this.record(user, demandId, amount, 'UPI', `dev_${demandId}_${Date.now()}`);
  }

  private record(user: AuthUser | null, demandId: number, amount: number, mode: 'UPI' | 'Card' | 'Net_Banking', gatewayRef: string) {
    return this.dbs.run(user ?? { id: 'razorpay-webhook', kind: 'system', role: 'system', roles: [] }, async (tx) => {
      const [d] = await tx.select().from(t.feeDemand).where(eq(t.feeDemand.demand_id, demandId));
      if (!d) throw new NotFoundException('Demand not found');
      const [receipt] = await tx.insert(t.feeReceipt).values({
        demand_id: demandId, amount: String(amount), payment_mode: mode, gateway_ref: gatewayRef, gateway_status: 'Success', created_by: user?.id ?? 'razorpay',
      }).onConflictDoNothing().returning();
      if (!receipt) return { duplicate: true, gateway_ref: gatewayRef };
      let recharge = null;
      if (d.fee_head === 'Electricity' && d.reference_type === 'meter_recharge' && d.reference_id) {
        [recharge] = await tx.insert(t.meterRecharge).values({ meter_id: d.reference_id, student_id: d.student_id, receipt_id: receipt.receipt_id, units_credited: '0', created_by: user?.id ?? 'razorpay' }).returning();
      }
      return { receipt, recharge };
    });
  }
}
