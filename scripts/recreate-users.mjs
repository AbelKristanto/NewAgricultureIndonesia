#!/usr/bin/env node

/**
 * Recreate Demo Users using Supabase Admin API
 * This script deletes and recreates all demo users with proper credentials
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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔧 Using Supabase Admin Client');
console.log('   URL:', supabaseUrl);
console.log('');

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const demoUsers = [
  { email: 'farmer@serenagri.com', password: 'farmer123', username: 'farmer', role: 'farmer' },
  { email: 'buyer@serenagri.com', password: 'buyer123', username: 'buyer', role: 'buyer' },
  { email: 'supplier@serenagri.com', password: 'supplier123', username: 'supplier', role: 'supplier' },
  { email: 'logistics@serenagri.com', password: 'logistics123', username: 'logistics', role: 'logistics' },
  { email: 'finance@serenagri.com', password: 'finance123', username: 'finance', role: 'finance' },
  { email: 'government@serenagri.com', password: 'government123', username: 'government', role: 'government' },
];

console.log('🗑️  Step 1: Deleting existing demo users...\n');

for (const user of demoUsers) {
  try {
    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.log(`   ⚠️  Could not list users: ${listError.message}`);
      continue;
    }
    
    const existingUser = users.users.find(u => u.email === user.email);
    
    if (existingUser) {
      // Delete user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
      
      if (deleteError) {
        console.log(`   ⚠️  Could not delete ${user.email}: ${deleteError.message}`);
      } else {
        console.log(`   ✅ Deleted ${user.email}`);
      }
    } else {
      console.log(`   ℹ️  ${user.email} does not exist`);
    }
  } catch (err) {
    console.log(`   ❌ Error processing ${user.email}: ${err.message}`);
  }
}

console.log('\n⏳ Waiting 2 seconds before creating new users...\n');
await new Promise(resolve => setTimeout(resolve, 2000));

console.log('👥 Step 2: Creating new demo users...\n');

for (const user of demoUsers) {
  try {
    console.log(`Creating ${user.role.toUpperCase()} (${user.email})...`);
    
    // Create user with admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: user.username,
        role: user.role
      }
    });

    if (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    } else if (data.user) {
      console.log(`   ✅ Created user ID: ${data.user.id}`);
      
      // Manually create profile (since trigger might not work)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username: user.username,
          role: user.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.log(`   ⚠️  Profile creation failed: ${profileError.message}`);
        console.log(`   💡 Trying upsert...`);
        
        // Try upsert instead
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: user.username,
            role: user.role,
            updated_at: new Date().toISOString()
          });
        
        if (upsertError) {
          console.log(`   ❌ Upsert also failed: ${upsertError.message}`);
        } else {
          console.log(`   ✅ Profile created via upsert`);
        }
      } else {
        console.log(`   ✅ Profile created`);
      }
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
  
  console.log('');
}

console.log('✅ Step 3: Verifying all users...\n');

const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();

if (listError) {
  console.error('❌ Could not list users:', listError.message);
} else {
  const demoEmails = demoUsers.map(u => u.email);
  const createdUsers = allUsers.users.filter(u => demoEmails.includes(u.email));
  
  console.log(`Found ${createdUsers.length} of ${demoUsers.length} demo users:\n`);
  
  for (const user of createdUsers) {
    const metadata = user.user_metadata || {};
    console.log(`   ✅ ${user.email}`);
    console.log(`      ID: ${user.id}`);
    console.log(`      Username: ${metadata.username || 'N/A'}`);
    console.log(`      Role: ${metadata.role || 'N/A'}`);
    console.log(`      Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log('');
  }
}

console.log('🎉 Done! Now test login with: node scripts/test-supabase-auth.mjs');

// Made with Bob
