import { Body, Controller, Get, NotFoundException, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DbService } from '../db/db.service.js';
import { Public } from './decorators.js';
import { zod } from '../common/zod.pipe.js';

const LoginDto = z.object({ username: z.string().trim().min(1).max(40), password: z.string().min(1).max(100) });
const enabled = () => process.env.DEMO_LOGIN === '1';

/**
 * Demo sign-in for training and testing (DEMO_LOGIN=1 only). Accounts and their bcrypt password hashes live in
 * portal.demo_login (db/seed/demo_logins.sql). The live system signs people in with the KL University account instead.
 */
@ApiTags('auth · demo sign-in')
@Controller('auth')
export class DemoLoginController {
  constructor(private dbs: DbService) {}

  @Public() @Get('demo-accounts')
  async accounts() {
    if (!enabled()) return { enabled: false, accounts: [] };
    const accounts = await this.dbs.rows(sql`select username, role_code, display_name, description, group_name from portal.demo_login where active order by sort_order, username`).catch(() => []);
    return { enabled: true, password_hint: process.env.DEMO_PASSWORD_HINT || null, accounts };
  }

  @Public() @Post('demo-login')
  async login(@Body(zod(LoginDto)) b: z.infer<typeof LoginDto>) {
    if (!enabled()) throw new NotFoundException();
    const [u] = await this.dbs.rows<{ user_ref: string; role_code: string; display_name: string }>(sql`
      select user_ref, role_code, display_name from portal.demo_login
      where active and lower(username) = lower(${b.username}) and password_hash = crypt(${b.password}, password_hash)`);
    // one message for both a wrong name and a wrong password, so neither can be guessed separately
    if (!u) throw new UnauthorizedException('The username or password is not right');
    return { id: u.user_ref, role: u.role_code, name: u.display_name };
  }
}
