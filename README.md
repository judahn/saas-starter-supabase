# Next.js SaaS Starter (Unofficial Supabase Fork)

This is a starter template for building a SaaS application using **Next.js** with **Supabase** for authentication and database, plus Stripe integration for payments.

## Features

- Marketing landing page (`/`) with animated Terminal element
- Pricing page (`/pricing`) which connects to Stripe Checkout
- Dashboard pages with CRUD operations on users/teams
- Basic RBAC with Owner and Member roles
- Subscription management with Stripe Customer Portal
- Email/password authentication with Supabase Auth
- Team invitation system with email invites
- Global middleware to protect logged-in routes
- Local middleware to protect Server Actions or validate Zod schemas
- Activity logging system for any user events

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Auth**: [Supabase Auth](https://supabase.com/docs/guides/auth)
- **Payments**: [Stripe](https://stripe.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

```bash
git clone https://github.com/your-username/saas-starter-supabase
cd saas-starter-supabase
pnpm install
```

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Run the following SQL in the Supabase SQL Editor to create the required tables:

```sql
-- Teams table
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

-- Team members (links Supabase Auth users to teams)
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Activity logs
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ip_address VARCHAR(45)
);

-- Invitations
CREATE TABLE invitations (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
);

-- Indexes for performance
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_activity_logs_team_id ON activity_logs(team_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_team_id ON invitations(team_id);
```

3. Copy your Supabase credentials from **Project Settings > API**:
   - Project URL
   - `anon` public key
   - `service_role` secret key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_***
STRIPE_WEBHOOK_SECRET=whsec_***

# App
BASE_URL=http://localhost:3000
```

## Running Locally

1. [Install](https://docs.stripe.com/stripe-cli) and log in to your Stripe account:

```bash
stripe login
```

2. Seed the database with a default user and team:

```bash
pnpm db:seed
```

This will create the following test user:

- User: `test@test.com`
- Password: `admin123`

You can also create new users through the `/sign-up` route.

3. Run the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app in action.

4. Listen for Stripe webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Generating TypeScript Types

To regenerate TypeScript types from your Supabase schema:

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
brew install supabase/tap/supabase
```

2. Log in to Supabase:

```bash
supabase login
```

3. Add your project ID to `.env`:

```env
SUPABASE_PROJECT_ID=your-project-ref
```

4. Generate types:

```bash
pnpm db:types
```

This updates `lib/db/database.types.ts`. Custom types in `lib/db/types.ts` import from the generated file and won't be overwritten.

## Testing Payments

To test Stripe payments, use the following test card details:

- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

## Going to Production

When you're ready to deploy your SaaS application to production, follow these steps:

### Set up a production Stripe webhook

1. Go to the Stripe Dashboard and create a new webhook for your production environment.
2. Set the endpoint URL to your production API route (e.g., `https://yourdomain.com/api/stripe/webhook`).
3. Select the events you want to listen for (e.g., `checkout.session.completed`, `customer.subscription.updated`).

### Deploy to Vercel

1. Push your code to a GitHub repository.
2. Connect your repository to [Vercel](https://vercel.com/) and deploy it.
3. Follow the Vercel deployment process, which will guide you through setting up your project.

### Add environment variables

In your Vercel project settings (or during deployment), add all the necessary environment variables:

| Variable                        | Description                                             |
| ------------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Your Supabase service role key (keep secret!)           |
| `STRIPE_SECRET_KEY`             | Your Stripe secret key for production                   |
| `STRIPE_WEBHOOK_SECRET`         | Webhook secret from production webhook                  |
| `BASE_URL`                      | Your production domain (e.g., `https://yourdomain.com`) |

## Other Templates

While this template is intentionally minimal and to be used as a learning resource, there are other paid versions in the community which are more full-featured:

- https://achromatic.dev
- https://shipfa.st
- https://makerkit.dev
- https://zerotoshipped.com
- https://turbostarter.dev
