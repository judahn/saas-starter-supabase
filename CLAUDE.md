# SaaS Starter - Supabase

## Project Overview
Next.js SaaS Starter with Supabase backend (Auth, Database).

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **UI**: shadcn/ui + Tailwind CSS
- **Package Manager**: pnpm

## Key Directories
```
lib/db/           # Supabase client, queries, types
lib/auth/         # Auth session utilities
app/              # Next.js app router pages
app/api/          # API routes (Stripe webhooks, etc.)
components/       # React components
```

## Database Tables (Supabase)
- `auth.users` - Supabase Auth users (name in user_metadata)
- `teams` - Team/organization entities
- `team_members` - User-team relationships (owner/member roles)
- `activity_logs` - User activity tracking
- `invitations` - Team invitation system

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

STRIPE_SECRET_KEY=sk_test_***
STRIPE_WEBHOOK_SECRET=whsec_***
BASE_URL=http://localhost:3000
```

## Commands
- `pnpm dev` - Start development server
- `pnpm db:seed` - Seed database with test user

## Supabase Setup
Run this SQL in Supabase SQL Editor to create tables:

```sql
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_product_id TEXT,
  plan_name VARCHAR(50),
  subscription_status VARCHAR(20)
);

CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ip_address VARCHAR(45)
);

CREATE TABLE invitations (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
);

CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_activity_logs_team_id ON activity_logs(team_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_team_id ON invitations(team_id);
```

## Testing
1. Create Supabase project and run SQL above
2. Add env vars to `.env`
3. `pnpm db:seed` creates test user (test@test.com / admin123)
4. `pnpm dev` starts without errors
5. Sign-up/sign-in flows work
6. Team operations work
7. Stripe integration functional
