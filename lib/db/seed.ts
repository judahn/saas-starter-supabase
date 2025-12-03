// Load env vars BEFORE any imports that use them
import dotenv from 'dotenv';
dotenv.config();

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Create admin client for seeding
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seed() {
  const email = 'test@test.com';
  const password = 'admin123';

  // Create user with Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for test user
      user_metadata: {
        name: 'Test User',
      },
    });

  if (authError || !authData.user) {
    console.error('Failed to create auth user:', authError);
    throw authError;
  }

  console.log('Initial user created.');

  // Create team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ name: 'Test Team' })
    .select()
    .single();

  if (teamError || !team) {
    console.error('Failed to create team:', teamError);
    throw teamError;
  }

  console.log('Team created.');

  // Create team membership
  const { error: memberError } = await supabase.from('team_members').insert({
    team_id: team.id,
    user_id: authData.user.id,
    role: 'owner',
  });

  if (memberError) {
    console.error('Failed to create team member:', memberError);
    throw memberError;
  }

  console.log('Team membership created.');

  await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
