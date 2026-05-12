#!/usr/bin/env node

/**
 * Serenagri AI — Seed dummy users for each role
 *
 * Creates 6 users (one per role) with predictable credentials.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass auth restrictions.
 *
 * Run:  node scripts/seed-users.mjs
 *
 * Credentials:
 *   farmer@serenagri.com     / farmer123
 *   buyer@serenagri.com      / buyer123
 *   supplier@serenagri.com   / supplier123
 *   logistics@serenagri.com  / logistics123
 *   finance@serenagri.com    / finance123
 *   government@serenagri.com / government123
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
    'Make sure .env.local contains both variables.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: 'farmer@serenagri.com', password: 'farmer123', username: 'Pak Tani', role: 'farmer' },
  { email: 'buyer@serenagri.com', password: 'buyer123', username: 'Bu Pembeli', role: 'buyer' },
  { email: 'supplier@serenagri.com', password: 'supplier123', username: 'Pak Supplier', role: 'supplier' },
  { email: 'logistics@serenagri.com', password: 'logistics123', username: 'Bu Logistik', role: 'logistics' },
  { email: 'finance@serenagri.com', password: 'finance123', username: 'Pak Finance', role: 'finance' },
  { email: 'government@serenagri.com', password: 'government123', username: 'Bu Pemerintah', role: 'government' },
];

async function seedUsers() {
  console.log('\n🌾 Serenagri AI — Seed Users\n');
  console.log('Creating dummy users for each role...\n');

  let created = 0;
  let skipped = 0;

  for (const user of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { username: user.username, role: user.role },
    });

    if (error) {
      if (error.message?.includes('already been registered')) {
        console.log(`  ⏭  ${user.email} (${user.role}) — already exists`);
        skipped++;
        continue;
      }
      console.error(`  ❌ ${user.email} (${user.role}) — ERROR: ${error.message}`);
      continue;
    }

    console.log(`  ✅ ${user.email} (${user.role}) — created (id: ${data.user.id})`);
    created++;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📋 Login Credentials:\n`);
  console.log(`  ┌─────────────────────────────────┬────────────────┬──────────────┐`);
  console.log(`  │ Email                           │ Password       │ Role         │`);
  console.log(`  ├─────────────────────────────────┼────────────────┼──────────────┤`);
  for (const user of USERS) {
    const email = user.email.padEnd(31);
    const pass = user.password.padEnd(14);
    const role = user.role.padEnd(12);
    console.log(`  │ ${email} │ ${pass} │ ${role} │`);
  }
  console.log(`  └─────────────────────────────────┴────────────────┴──────────────┘`);
  console.log(`\n  Created: ${created} | Skipped: ${skipped}\n`);
}

seedUsers().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
