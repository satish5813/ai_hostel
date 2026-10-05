import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { PaymentsService } from './payments.service.js';
import { CurrentUser, Public } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Post('orders') order(@Body(zod(z.object({ demand_id: z.number().int() }))) b: { demand_id: number }, @CurrentUser() user: AuthUser) {
    return this.svc.createOrder(user, b.demand_id);
  }

  @Public()
  @Post('razorpay/webhook') webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('x-razorpay-signature') sig?: string) {
    return this.svc.webhook(req.rawBody ?? Buffer.from(JSON.stringify(req.body)), sig);
  }

  @Post('dev-confirm') dev(@Body(zod(z.object({ demand_id: z.number().int(), amount: z.number().positive() }))) b: { demand_id: number; amount: number }, @CurrentUser() user: AuthUser) {
    return this.svc.devConfirm(user, b.demand_id, b.amount);
  }
}
