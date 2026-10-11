import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { WalletService } from './wallet.service.js';
import { OcrService } from './ocr.service.js';
import { CurrentUser, OFFICE, Roles, WARDENS } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

// the receipt is a data URL from the phone (a photo shrunk there first, or a PDF); 1.5 MB of text is a ~1 MB file
const ProofDto = z.object({ demand_ids: z.array(z.number().int()).max(40).default([]), amount: z.number().positive(), paid_on: z.string().date(), reference: z.string().trim().max(80).nullable().optional(), photo: z.string().max(1_500_000) });
const PayDto = z.object({ demand_ids: z.array(z.number().int()).min(1).max(40) });

@ApiTags('A · pay all with a receipt; the wallet')
@ApiBearerAuth()
@Controller()
export class WalletController {
  constructor(private svc: WalletService, private ocr: OcrService) {}
  @Roles('Student') @Get('me/payment-proofs') mine(@CurrentUser() u: AuthUser) { return this.svc.myProofs(u); }
  @Roles('Student') @Post('me/payment-proofs') upload(@Body(zod(ProofDto)) b: z.infer<typeof ProofDto>, @CurrentUser() u: AuthUser) { return this.svc.upload(u, b); }
  @Roles('Student') @Get('me/wallet') wallet(@CurrentUser() u: AuthUser) { return this.svc.wallet(u); }
  @Roles('Student') @Post('me/wallet/pay') pay(@Body(zod(PayDto)) b: z.infer<typeof PayDto>, @CurrentUser() u: AuthUser) { return this.svc.pay(u, b.demand_ids); }
  @Roles(...WARDENS, ...OFFICE, 'Accounts_Section', 'admin') @Get('payment-proofs/:id') proof(@Param('id', ParseIntPipe) id: number) { return this.svc.proof(id); }
  @Roles(...WARDENS, ...OFFICE, 'Accounts_Section', 'admin') @Post('payment-proofs/:id/recheck') recheck(@Param('id', ParseIntPipe) id: number) { return this.ocr.check(id); }
}
