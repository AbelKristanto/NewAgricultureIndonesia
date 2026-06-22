#!/usr/bin/env node

/**
 * Test Supabase Authentication
 * This script tests if we can authenticate with Supabase using the demo credentials
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🔧 Supabase Configuration:');
console.log('   URL:', supabaseUrl);
console.log('   Anon Key:', supabaseAnonKey.substring(0, 20) + '...');
console.log('');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testUsers = [
  { email: 'farmer@serenagri.com', password: 'farmer123', role: 'farmer' },
  { email: 'buyer@serenagri.com', password: 'buyer123', role: 'buyer' },
  { email: 'supplier@serenagri.com', password: 'supplier123', role: 'supplier' },
  { email: 'logistics@serenagri.com', password: 'logistics123', role: 'logistics' },
  { email: 'finance@serenagri.com', password: 'finance123', role: 'finance' },
  { email: 'government@serenagri.com', password: 'government123', role: 'government' },
];

console.log('🧪 Testing Authentication for All Demo Users\n');

let failures = 0;

for (const user of testUsers) {
  console.log(`Testing ${user.role.toUpperCase()} (${user.email})...`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (error) {
      failures++;
      console.log(`   ❌ Login failed: ${error.message}`);
      if (error.message.includes('Invalid login credentials')) {
        console.log(`   💡 User may not exist or password is incorrect`);
      }
    } else if (data.session && data.user) {
      console.log(`   ✅ Login successful!`);
      console.log(`      User ID: ${data.user.id}`);
      console.log(`      Email: ${data.user.email}`);
      console.log(`      Session: ${data.session.access_token.substring(0, 20)}...`);
      
      // Check profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (profileError) {
        console.log(`      ⚠️  Profile error: ${profileError.message}`);
      } else if (profile) {
        console.log(`      👤 Profile: ${profile.username} (${profile.role})`);
      } else {
        console.log(`      ⚠️  No profile found`);
      }
      
      // Sign out
      await supabase.auth.signOut();
    } else {
      failures++;
      console.log(`   ❌ Login failed: No session created`);
    }
  } catch (err) {
    failures++;
    console.log(`   ❌ Exception: ${err.message}`);
  }
  
  console.log('');
}

console.log('✨ Test complete!');

if (failures > 0) {
  console.error(`\n❌ ${failures} authentication check(s) failed.`);
  process.exit(1);
}

// Made with Bob
