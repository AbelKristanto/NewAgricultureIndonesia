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
const CONNECTION_SCENARIOS = {
  rice: {
    id: 'rice-subang-jakarta-2026',
    farmerName: 'Petani Demo Subang',
    buyerName: 'Buyer Demo Jakarta',
    financeNeed: 180000000,
    logisticsRoute: 'Subang - Pantura - Jakarta Utara',
    matchedBy: 'Farmer-Buyer Supply Matching',
  },
  chili: {
    id: 'chili-garut-bandung-2026',
    farmerName: 'Petani Demo Garut',
    buyerName: 'Buyer Demo Bandung',
    financeNeed: 52000000,
    logisticsRoute: 'Garut - Nagreg - Bandung',
    matchedBy: 'Farmer-Buyer Supply Matching',
  },
  corn: {
    id: 'corn-malang-surabaya-2026',
    farmerName: 'Petani Demo Malang',
    buyerName: 'Buyer Demo Surabaya',
    financeNeed: 75000000,
    logisticsRoute: 'Malang - Pandaan - Surabaya',
    matchedBy: 'Farmer-Buyer Supply Matching',
  },
};

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
  const createParticipants = (scenario) => [
    {
      user_id: users.supplier.id,
      role: 'supplier',
      label: `Supplier input - dukung ${scenario.farmerName}`,
    },
    {
      user_id: users.logistics.id,
      role: 'logistics',
      label: `Pihak logistik - ${scenario.logisticsRoute}`,
    },
    {
      user_id: users.finance.id,
      role: 'finance',
      label: `Lembaga keuangan - plafon IDR ${scenario.financeNeed.toLocaleString('id-ID')}`,
    },
    {
      user_id: users.government.id,
      role: 'government',
      label: `Pemantau pemerintah - ${scenario.id}`,
    },
  ];

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
        connectionScenario: CONNECTION_SCENARIOS.rice.id,
        connectionFlow: {
          matching: `${CONNECTION_SCENARIOS.rice.matchedBy}: ${CONNECTION_SCENARIOS.rice.farmerName} ↔ ${CONNECTION_SCENARIOS.rice.buyerName}`,
          finance: `Assessment pembiayaan petani: kebutuhan modal kerja IDR ${CONNECTION_SCENARIOS.rice.financeNeed.toLocaleString('id-ID')}`,
          logistics: `Perencanaan pembeli-logistik: ${CONNECTION_SCENARIOS.rice.logisticsRoute}`,
        },
        note: 'Draft koneksi beras: buyer Jakarta dipertemukan dengan petani Subang. Gunakan untuk menguji submit proposal, finance assessment, dan rute logistik.',
        participants: createParticipants(CONNECTION_SCENARIOS.rice),
        negotiationHistory: [
          createEntry({
            actorId: buyerId,
            actorParty: 'buyer',
            action: 'offer_created',
            status: 'draft',
            pricePerUnit: 11800000,
            startDate: '2026-07-01',
            endDate: '2026-07-20',
            note: `Draft awal dari matching ${CONNECTION_SCENARIOS.rice.id}. Finance menilai modal kerja, logistics menyiapkan rute ${CONNECTION_SCENARIOS.rice.logisticsRoute}.`,
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
        connectionScenario: CONNECTION_SCENARIOS.chili.id,
        connectionFlow: {
          matching: `${CONNECTION_SCENARIOS.chili.matchedBy}: ${CONNECTION_SCENARIOS.chili.farmerName} ↔ ${CONNECTION_SCENARIOS.chili.buyerName}`,
          finance: `Assessment pembiayaan petani: kebutuhan modal kerja IDR ${CONNECTION_SCENARIOS.chili.financeNeed.toLocaleString('id-ID')}`,
          logistics: `Perencanaan pembeli-logistik: ${CONNECTION_SCENARIOS.chili.logisticsRoute}`,
        },
        note: 'Proposal cabai: pembeli Bandung dipertemukan dengan petani Garut. Cocok untuk menguji counter/accept/reject dan koordinasi logistik.',
        participants: createParticipants(CONNECTION_SCENARIOS.chili),
        negotiationHistory: [
          createEntry({
            actorId: buyerId,
            actorParty: 'buyer',
            action: 'proposal_submitted',
            status: 'proposed',
            pricePerUnit: 78000,
            startDate: '2026-07-05',
            endDate: '2026-07-12',
            note: `Proposal dari koneksi ${CONNECTION_SCENARIOS.chili.id}; logistics perlu buffer pengiriman di rute ${CONNECTION_SCENARIOS.chili.logisticsRoute}.`,
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
        connectionScenario: CONNECTION_SCENARIOS.corn.id,
        connectionFlow: {
          matching: `${CONNECTION_SCENARIOS.corn.matchedBy}: ${CONNECTION_SCENARIOS.corn.farmerName} ↔ ${CONNECTION_SCENARIOS.corn.buyerName}`,
          finance: `Assessment pembiayaan petani: kebutuhan modal kerja IDR ${CONNECTION_SCENARIOS.corn.financeNeed.toLocaleString('id-ID')}`,
          logistics: `Perencanaan pembeli-logistik: ${CONNECTION_SCENARIOS.corn.logisticsRoute}`,
        },
        note: 'Transaksi jagung sudah diterima: pembeli Surabaya, petani Malang, finance memantau modal kerja, logistics menyiapkan rute.',
        participants: createParticipants(CONNECTION_SCENARIOS.corn),
        negotiationHistory: [
          createEntry({
            actorId: buyerId,
            actorParty: 'buyer',
            action: 'proposal_submitted',
            status: 'proposed',
            pricePerUnit: 5400000,
            startDate: '2026-08-01',
            endDate: '2026-08-18',
            note: `Proposal jagung dari koneksi ${CONNECTION_SCENARIOS.corn.id}; lanjutkan ke rute ${CONNECTION_SCENARIOS.corn.logisticsRoute}.`,
          }),
          createEntry({
            actorId: farmerId,
            actorParty: 'farmer',
            action: 'accepted',
            status: 'accepted',
            pricePerUnit: 5400000,
            startDate: '2026-08-01',
            endDate: '2026-08-18',
            note: 'Petani menyetujui harga dan jadwal; finance dan logistics dapat memantau sebagai participant.',
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
