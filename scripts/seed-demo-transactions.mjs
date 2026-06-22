#!/usr/bin/env node

/**
 * Seed demo transactions for role/button testing.
 *
 * Creates transactions visible to buyer, farmer, supplier, logistics, finance,
 * and government accounts. Buyer/farmer remain the negotiating parties; other
 * roles are attached as read-only participants through terms.participants.
 */

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BATCH_KEY = 'role-button-demo';

const accounts = [
  { email: 'buyer@serenagri.com', role: 'buyer', label: 'Pembeli' },
  { email: 'farmer@serenagri.com', role: 'farmer', label: 'Petani' },
  { email: 'supplier@serenagri.com', role: 'supplier', label: 'Supplier input' },
  { email: 'logistics@serenagri.com', role: 'logistics', label: 'Logistik' },
  { email: 'finance@serenagri.com', role: 'finance', label: 'Pembiayaan' },
  { email: 'government@serenagri.com', role: 'government', label: 'Pemantau pemerintah' },
];

function createEntry({ actorId, actorParty, action, status, pricePerUnit, startDate, endDate, note }) {
  return {
    id: randomUUID(),
    actor_id: actorId,
    actor_party: actorParty,
    action,
    status,
    price_per_unit: pricePerUnit,
    start_date: startDate,
    end_date: endDate,
    note,
    created_at: new Date().toISOString(),
  };
}

async function getDemoUsersByEmail() {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  const usersByEmail = new Map((data.users || []).map((user) => [user.email, user]));
  const missing = accounts.filter((account) => !usersByEmail.has(account.email));
  if (missing.length > 0) {
    throw new Error(`Missing demo auth users: ${missing.map((item) => item.email).join(', ')}`);
  }

  return Object.fromEntries(accounts.map((account) => [account.role, usersByEmail.get(account.email)]));
}

async function cleanupPreviousSeed() {
  const { data, error } = await admin
    .from('transactions')
    .select('id')
    .contains('terms', { simulationBatch: BATCH_KEY });

  if (error) throw error;
  const ids = (data || []).map((row) => row.id);
  if (ids.length === 0) return 0;

  const { error: deleteError } = await admin.from('transactions').delete().in('id', ids);
  if (deleteError) throw deleteError;
  return ids.length;
}

async function main() {
  console.log('Seeding role-demo transactions...');
  const users = await getDemoUsersByEmail();
  const removed = await cleanupPreviousSeed();
  if (removed > 0) console.log(`Removed ${removed} previous demo transaction(s).`);

  const buyerId = users.buyer.id;
  const farmerId = users.farmer.id;
  const participants = ['supplier', 'logistics', 'finance', 'government'].map((role) => {
    const account = accounts.find((item) => item.role === role);
    return {
      user_id: users[role].id,
      role,
      label: account?.label || role,
    };
  });

  const rows = [
    {
      buyer_id: buyerId,
      farmer_id: farmerId,
      commodity: 'rice',
      volume: 25,
      volume_unit: 'tons',
      price_per_unit: 11800000,
      total_value: 25 * 11800000,
      delivery_province: 'dki-jakarta',
      delivery_city: 'Jakarta Utara',
      start_date: '2026-07-01',
      end_date: '2026-07-20',
      status: 'draft',
      terms: {
        simulationBatch: BATCH_KEY,
        note: 'Draft awal untuk buyer menguji tombol Kirim Proposal.',
        participants,
        negotiationHistory: [
          createEntry({
            actorId: buyerId,
            actorParty: 'buyer',
            action: 'offer_created',
            status: 'draft',
            pricePerUnit: 11800000,
            startDate: '2026-07-01',
            endDate: '2026-07-20',
            note: 'Draft awal pengadaan beras role-demo.',
          }),
        ],
      },
    },
    {
      buyer_id: buyerId,
      farmer_id: farmerId,
      commodity: 'chili',
      volume: 800,
      volume_unit: 'kg',
      price_per_unit: 78000,
      total_value: 800 * 78000,
      delivery_province: 'jawa-barat',
      delivery_city: 'Bandung',
      start_date: '2026-07-05',
      end_date: '2026-07-12',
      status: 'proposed',
      terms: {
        simulationBatch: BATCH_KEY,
        note: 'Proposal aktif untuk farmer menguji tombol counter, accept, dan reject.',
        participants,
        negotiationHistory: [
          createEntry({
            actorId: buyerId,
            actorParty: 'buyer',
            action: 'proposal_submitted',
            status: 'proposed',
            pricePerUnit: 78000,
            startDate: '2026-07-05',
            endDate: '2026-07-12',
            note: 'Proposal cabai mingguan untuk restoran.',
          }),
        ],
      },
    },
    {
      buyer_id: buyerId,
      farmer_id: farmerId,
      commodity: 'corn',
      volume: 12,
      volume_unit: 'tons',
      price_per_unit: 5400000,
      total_value: 12 * 5400000,
      delivery_province: 'jawa-timur',
      delivery_city: 'Surabaya',
      start_date: '2026-08-01',
      end_date: '2026-08-18',
      status: 'accepted',
      terms: {
        simulationBatch: BATCH_KEY,
        note: 'Transaksi diterima untuk menguji tombol mulai proses atau batalkan.',
        participants,
        negotiationHistory: [
          createEntry({
            actorId: buyerId,
            actorParty: 'buyer',
            action: 'proposal_submitted',
            status: 'proposed',
            pricePerUnit: 5400000,
            startDate: '2026-08-01',
            endDate: '2026-08-18',
            note: 'Proposal jagung untuk suplai pakan.',
          }),
          createEntry({
            actorId: farmerId,
            actorParty: 'farmer',
            action: 'accepted',
            status: 'accepted',
            pricePerUnit: 5400000,
            startDate: '2026-08-01',
            endDate: '2026-08-18',
            note: 'Petani menyetujui harga dan jadwal.',
          }),
        ],
      },
    },
  ];

  const { data, error } = await admin.from('transactions').insert(rows).select('id, commodity, status');
  if (error) throw error;

  for (const tx of data || []) {
    console.log(`Created ${tx.commodity} transaction (${tx.status}): ${tx.id}`);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
