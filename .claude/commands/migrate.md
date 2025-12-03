# Migrate to Supabase

Execute the next step in the Postgres → Supabase migration.

## Migration Checklist
- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] drizzle.ts updated for Supabase pooler
- [ ] drizzle.config.ts updated
- [ ] Migrations run successfully
- [ ] Seed data created
- [ ] Auth flow tested
- [ ] Team operations tested
- [ ] Stripe integration verified

## When running this command:
1. Check current migration status
2. Identify the next incomplete step
3. Implement that step
4. Verify it works
5. Report progress

## Key Files
- `lib/db/drizzle.ts` - Database connection
- `drizzle.config.ts` - Migration config  
- `.env.local` - Environment variables
- `lib/db/schema.ts` - Table definitions

## Supabase Connection String Format
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Remember: Use `prepare: false` for Supabase's transaction pooler.
