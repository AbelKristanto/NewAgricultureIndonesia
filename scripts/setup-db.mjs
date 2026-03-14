#!/usr/bin/env node

/**
 * Serenagri AI — Database setup script
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to:
 *   1. Execute the SQL migration (tables, RLS, triggers, indexes)
 *   2. Create the demo user via auth.admin.createUser()
 *
 * Run:  npm run setup
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
    'Make sure .env.local contains both variables.'
  );
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Step 1 — Run SQL migration
// ---------------------------------------------------------------------------
async function runMigration() {
  const sqlPath = join(
    __dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql'
  );
  const sql = readFileSync(sqlPath, 'utf-8');

  // Check whether the schema was already applied
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (existing !== null) {
    // table exists — PostgREST returned a valid response (even if empty)
    console.log('  Tables already exist — skipping migration.');
    return;
  }

  console.log('  Executing SQL migration …');

  // --- Attempt 1: pg-meta endpoint on the project URL ---
  const pgMetaRes = await fetch(`${supabaseUrl}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (pgMetaRes.ok) {
    console.log('  Migration applied via pg-meta endpoint.');
    return;
  }

  // --- Attempt 2: Supabase Management API ---
  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (mgmtRes.ok) {
    console.log('  Migration applied via Management API.');
    return;
  }

  // --- Both failed — give actionable instructions ---
  const pgStatus = pgMetaRes.status;
  const mgmtStatus = mgmtRes.status;

  throw new Error(
    `Could not execute migration via REST APIs ` +
    `(pg-meta: ${pgStatus}, mgmt-api: ${mgmtStatus}).\n\n` +
    `Please run the migration manually:\n` +
    `  1. Open Supabase Dashboard → SQL Editor\n` +
    `  2. Paste the contents of supabase/migrations/001_initial_schema.sql\n` +
    `  3. Click "Run"\n` +
    `  4. Re-run: npm run setup   (to create the demo user)\n`
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Create demo user
// ---------------------------------------------------------------------------
async function createDemoUser() {
  console.log('  Creating demo user (user@serenagri.com) …');

  const { data, error } = await supabase.auth.admin.createUser({
    email: 'user@serenagri.com',
    password: 'user123',
    email_confirm: true,
    user_metadata: { username: 'user', role: 'farmer' },
  });

  if (error) {
    if (error.message?.includes('already been registered')) {
      console.log('  Demo user already exists — skipping.');
      return;
    }
    throw error;
  }

  console.log(`  Demo user created: ${data.user.email} (${data.user.id})`);
}

// ---------------------------------------------------------------------------
// Step 3 — Verify setup
// ---------------------------------------------------------------------------
async function verify() {
  const { data, error } = await supabase.from('profiles').select('id, username, role').limit(1);
  if (error) {
    console.warn('  WARNING: Could not query profiles table:', error.message);
    return;
  }
  if (data && data.length > 0) {
    console.log(`  Verified — profile row exists: ${JSON.stringify(data[0])}`);
  } else {
    console.warn('  WARNING: profiles table is empty (trigger may not have fired).');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('\n🌾 Serenagri AI — Database Setup\n');

try {
  console.log('[1/3] Migration');
  await runMigration();

  console.log('[2/3] Demo user');
  await createDemoUser();

  console.log('[3/3] Verify');
  await verify();

  console.log('\nSetup complete!\n');
} catch (err) {
  console.error('\nSetup failed:', err.message);
  process.exit(1);
}
