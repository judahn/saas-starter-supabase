# SaaS Starter - Supabase Migration

## Project Overview
This is the Next.js SaaS Starter (https://github.com/nextjs/saas-starter) being migrated from vanilla Postgres to Supabase.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL) - migrating from postgres-js
- **ORM**: Drizzle ORM
- **Auth**: Custom JWT-based (stored in cookies)
- **Payments**: Stripe
- **UI**: shadcn/ui + Tailwind CSS
- **Package Manager**: pnpm

## Key Directories
```
lib/db/           # Database config, schema, queries, migrations
lib/auth/         # Authentication utilities
app/              # Next.js app router pages
app/api/          # API routes (Stripe webhooks, etc.)
components/       # React components
```

## Database Schema (Drizzle)
Located in `lib/db/schema.ts`:
- `users` - User accounts with email/password
- `teams` - Team/organization entities
- `teamMembers` - User-team relationships (owner/member roles)
- `activityLogs` - User activity tracking
- `invitations` - Team invitation system

## Migration Goals
1. Replace `postgres-js` driver with `@supabase/supabase-js` or Supabase's postgres connection
2. Update `lib/db/drizzle.ts` connection configuration
3. Ensure Drizzle migrations work with Supabase
4. Optionally leverage Supabase Auth (future enhancement)
5. Maintain existing functionality

## Environment Variables
```
# Supabase Database (use Transaction pooler connection string)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Optional: For future Supabase features (Auth, Storage, Realtime)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Commands
- `pnpm dev` - Start development server
- `pnpm db:migrate` - Run Drizzle migrations
- `pnpm db:seed` - Seed database
- `pnpm db:setup` - Initial setup script

## Testing
After migration changes, verify:
1. `pnpm db:migrate` runs successfully
2. `pnpm db:seed` creates test user
3. `pnpm dev` starts without errors
4. Sign-up flow works
5. Team creation/invitation works
6. Stripe integration still functional
