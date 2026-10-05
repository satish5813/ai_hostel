import { defineConfig } from 'drizzle-kit';

// Introspects the migrated database (db/migrations) and writes src/schema.ts + relations.ts.
// Run:  DATABASE_URL=postgresql://... pnpm --filter @klu/db pull
export default defineConfig({
  dialect: 'postgresql',
  out: './src',
  schemaFilter: ['ref', 'infra', 'portal', 'shared', 'hostel'],
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5499/klu_hostel' },
  introspect: { casing: 'preserve' },
});
