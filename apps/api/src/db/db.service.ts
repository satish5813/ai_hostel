import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { schema } from '@klu/db';
import type { AuthUser } from '../auth/auth.types.js';

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * One connection pool for the API. Every write goes through `run(user, fn)`, which opens a transaction and
 * stamps the acting user into app.actor / app.role so the hash-chained audit log records who did what.
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  readonly client = postgres(process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5499/klu_hostel', {
    max: 10,
    prepare: false,
    transform: { undefined: null },
  });
  readonly db: Db = drizzle(this.client, { schema });

  /** Run `fn` in a transaction with the actor set for audit triggers. */
  run<T>(user: AuthUser | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.actor', ${user?.id ?? 'anonymous'}, true), set_config('app.role', ${user?.role ?? ''}, true)`);
      return fn(tx);
    });
  }

  /** Read-only helper for views and functions. */
  rows<T = Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<T[]> {
    return this.db.execute(query) as unknown as Promise<T[]>;
  }

  async onModuleDestroy() {
    await this.client.end({ timeout: 5 });
  }
}
