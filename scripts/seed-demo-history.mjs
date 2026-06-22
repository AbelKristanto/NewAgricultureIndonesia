#!/usr/bin/env node

/**
 * Seed lightweight demo history for every role-accessible feature.
 *
 * This avoids calling AI providers: it writes representative inputs/results
 * directly to Supabase so role dashboards, history buttons, and detail loading
 * can be tested immediately with the demo accounts.
 */

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

const BATCH_KEY = 'role-history-demo';
const CONNECTION_SCENARIOS = {
  rice: {
    id: 'rice-subang-jakarta-2026',
    commodity: 'rice',
    farmerRegion: 'Subang, Jawa Barat',
    buyerName: 'Buyer Demo Jakarta',
    farmerName: 'Petani Demo Subang',
    deliveryProvince: 'dki-jakarta',
    deliveryCity: 'Jakarta Utara',
    volume: 25,
    volumeUnit: 'tons',
    pricePerUnit: 11800000,
    financingNeed: 180000000,
    logisticsRoute: 'Subang - Pantura - Jakarta Utara',
  },
  chili: {
    id: 'chili-garut-bandung-2026',
    commodity: 'chili',
    farmerRegion: 'Garut, Jawa Barat',
    buyerName: 'Buyer Demo Bandung',
    farmerName: 'Petani Demo Garut',
    deliveryProvince: 'jawa-barat',
    deliveryCity: 'Bandung',
    volume: 800,
    volumeUnit: 'kg',
    pricePerUnit: 78000,
    financingNeed: 52000000,
    logisticsRoute: 'Garut - Nagreg - Bandung',
  },
  corn: {
    id: 'corn-malang-surabaya-2026',
    commodity: 'corn',
    farmerRegion: 'Malang, Jawa Timur',
    buyerName: 'Buyer Demo Surabaya',
    farmerName: 'Petani Demo Malang',
    deliveryProvince: 'jawa-timur',
    deliveryCity: 'Surabaya',
    volume: 12,
    volumeUnit: 'tons',
    pricePerUnit: 5400000,
    financingNeed: 75000000,
    logisticsRoute: 'Malang - Pandaan - Surabaya',
  },
};

const accounts = [
  { email: 'farmer@serenagri.com', role: 'farmer', name: 'Petani Demo' },
  { email: 'buyer@serenagri.com', role: 'buyer', name: 'Buyer Demo' },
  { email: 'supplier@serenagri.com', role: 'supplier', name: 'Supplier Demo' },
  { email: 'logistics@serenagri.com', role: 'logistics', name: 'Logistik Demo' },
  { email: 'finance@serenagri.com', role: 'finance', name: 'Finance Demo' },
  { email: 'government@serenagri.com', role: 'government', name: 'Government Demo' },
];

const roleFeatures = {
  farmer: ['farmer', 'matching', 'weather', 'chat'],
  buyer: ['buyer', 'matching', 'weather', 'chat'],
  supplier: ['matching', 'weather', 'chat'],
  logistics: ['matching', 'weather', 'chat'],
  finance: ['policy', 'weather', 'chat'],
  government: ['farmer', 'buyer', 'policy', 'matching', 'weather', 'chat'],
};

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function analysisRow(userId, input, result, dayOffset) {
  return {
    user_id: userId,
    input: { ...input, simulationBatch: BATCH_KEY },
    result: { ...result, simulationBatch: BATCH_KEY },
    created_at: daysAgo(dayOffset),
  };
}

function farmerRows(userId, role) {
  const scenario = CONNECTION_SCENARIOS.rice;
  return [
    analysisRow(
      userId,
      {
        province: 'jawa-barat',
        district: role === 'government' ? 'Subang Monitoring' : 'Subang',
        landSize: 2.4,
        landUnit: 'hectares',
        soilType: 'volcanic',
        waterSources: ['irrigation', 'rain-fed'],
        currentCrops: 'rice, chili',
        budget: 18000000,
        timeline: '1-season',
        notes: `Demo koneksi ${scenario.id}: rencana pasokan ${scenario.commodity} dari ${scenario.farmerRegion} untuk ${scenario.buyerName}.`,
        connectionScenario: scenario.id,
        lang: 'id',
      },
      {
        cropRecommendations: [
          {
            crop: 'Rice',
            suitabilityScore: 88,
            reasoning: 'Irigasi dan tanah vulkanik cocok untuk padi intensif.',
            plantingSeason: 'Musim hujan awal',
          },
          {
            crop: 'Chili',
            suitabilityScore: 76,
            reasoning: 'Cocok sebagai rotasi bernilai tinggi dengan pengendalian air.',
            plantingSeason: 'Setelah panen padi',
          },
        ],
        yieldEstimates: [
          { crop: 'Rice', estimatedYieldPerHa: '5.8-6.4', unit: 'tons/ha' },
          { crop: 'Chili', estimatedYieldPerHa: '9-11', unit: 'tons/ha' },
        ],
        costProjections: [
          { category: 'Seed and nursery', estimatedCost: 'IDR 2.500.000', notes: 'Termasuk benih unggul.' },
          { category: 'Fertilizer', estimatedCost: 'IDR 5.800.000', notes: 'NPK, urea, dan organik.' },
        ],
        weatherRisks: 'Risiko hujan tinggi perlu mitigasi drainase dan jadwal tanam maju 1-2 minggu.',
        buyerMatching: `${scenario.buyerName} cocok untuk kontrak ${scenario.volume} ${scenario.volumeUnit} ke ${scenario.deliveryCity}. Gunakan halaman Matching untuk menghubungkan kebutuhan pembeli dengan pasokan petani.`,
        inputRequirements: `Prioritaskan benih padi genjah, NPK, dolomit, dan jadwal panen yang selaras dengan rute ${scenario.logisticsRoute}.`,
        subsidies: `Kebutuhan modal kerja sekitar IDR ${scenario.financingNeed.toLocaleString('id-ID')} bisa dipakai sebagai bahan assessment lembaga keuangan.`,
      },
      role === 'government' ? 2 : 1
    ),
  ];
}

function buyerRows(userId, role) {
  const scenario = role === 'government' ? CONNECTION_SCENARIOS.corn : CONNECTION_SCENARIOS.rice;
  return [
    analysisRow(
      userId,
      {
        commodityType: scenario.commodity,
        volume: scenario.volume,
        volumeUnit: scenario.volumeUnit,
        qualityGrade: 'grade-a',
        deliveryProvince: scenario.deliveryProvince,
        deliveryCity: scenario.deliveryCity,
        startMonth: '07',
        endMonth: '09',
        frequency: 'monthly',
        budgetMin: 420000000,
        budgetMax: 560000000,
        specialRequirements: `Demo koneksi ${scenario.id}: cari pasokan dari ${scenario.farmerName} untuk dikunci ke transaksi.`,
        connectionScenario: scenario.id,
        lang: 'id',
      },
      {
        productionRegions: `${scenario.farmerRegion} direkomendasikan karena dekat dengan rute ${scenario.logisticsRoute}.`,
        supplyCapacity: `Kapasitas realistis ${scenario.volume} ${scenario.volumeUnit} per siklus dari ${scenario.farmerName}.`,
        logisticsRoutes: `${scenario.logisticsRoute} menjadi rute utama untuk dikaitkan dengan role Logistics.`,
        deliveryTimeline: 'Lead time 2-4 hari setelah quality check dan konsolidasi gudang.',
        supplyRisk: 'Risiko utama adalah hujan ekstrem dan fluktuasi harga menjelang panen raya.',
        recommendedSuppliers: `Prioritaskan ${scenario.farmerName}; lanjutkan ke Matching lalu buat transaksi buyer-farmer.`,
      },
      role === 'government' ? 3 : 1
    ),
  ];
}

function policyRows(userId, role) {
  const scenario = role === 'finance' ? CONNECTION_SCENARIOS.rice : CONNECTION_SCENARIOS.corn;
  return [
    analysisRow(
      userId,
      {
        regions: role === 'finance' ? ['jawa-barat', 'jawa-tengah'] : ['jawa-barat', 'jawa-tengah', 'jawa-timur'],
        commodities: role === 'finance' ? [scenario.commodity, 'chili'] : ['rice', scenario.commodity],
        analysisTypes: ['production-capacity', 'food-supply-gaps', 'demand-supply'],
        timeHorizon: role === 'finance' ? '1-year' : '5-years',
        connectionScenario: scenario.id,
        lang: 'id',
      },
      {
        productionOverview: `${scenario.farmerRegion} layak menjadi sumber ${scenario.commodity} untuk ${scenario.buyerName}.`,
        supplyDemandAnalysis: `Demand ${scenario.volume} ${scenario.volumeUnit} dapat diikat lewat transaksi buyer-farmer dengan nilai acuan IDR ${(scenario.pricePerUnit * scenario.volume).toLocaleString('id-ID')}.`,
        riskZones: `Risiko utama berada di rute ${scenario.logisticsRoute} dan kebutuhan modal kerja petani sebelum panen.`,
        policyRecommendations: role === 'finance'
          ? `Hubungkan ${scenario.farmerName} dengan lembaga keuangan untuk plafon modal kerja sekitar IDR ${scenario.financingNeed.toLocaleString('id-ID')}.`
          : 'Dorong kontrak farming, cadangan pangan regional, dan pembiayaan modal kerja pascapanen.',
        priorityActions: role === 'finance'
          ? '1. Validasi transaksi buyer-farmer. 2. Cek riwayat produksi petani. 3. Siapkan assessment invoice/PO financing.'
          : '1. Verifikasi stok kabupaten. 2. Perkuat logistik dingin. 3. Aktifkan pembiayaan invoice.',
      },
      role === 'finance' ? 1 : 2
    ),
  ];
}

function matchingRows(userId, role) {
  const scenario =
    role === 'logistics'
      ? CONNECTION_SCENARIOS.chili
      : role === 'supplier'
        ? CONNECTION_SCENARIOS.corn
        : CONNECTION_SCENARIOS.rice;
  return [
    analysisRow(
      userId,
      {
        commodity: scenario.commodity,
        volume: scenario.volume,
        volumeUnit: scenario.volumeUnit,
        deliveryProvince: scenario.deliveryProvince,
        deliveryCity: scenario.deliveryCity,
        qualityGrade: role === 'supplier' ? 'standard' : 'grade-a',
        timeline: '1-season',
        notes: `Demo ${scenario.id}: ${scenario.farmerName} dipertemukan dengan ${scenario.buyerName}.`,
        connectionScenario: scenario.id,
        lang: 'id',
      },
      {
        matchedRegions: `${scenario.farmerName} di ${scenario.farmerRegion} menjadi kandidat utama untuk ${scenario.buyerName}.`,
        capacityEstimates: `Kapasitas ${scenario.volume} ${scenario.volumeUnit} sesuai kebutuhan buyer; buffer 10-15% disarankan.`,
        logisticsFeasibility: `Rute ${scenario.logisticsRoute} layak, perlu konfirmasi jadwal muat dan armada oleh role Logistics.`,
        timeline: 'Matching awal 1-2 hari, negosiasi 3-5 hari, pengiriman pertama 7-14 hari.',
        priceAnalysis: `Harga acuan IDR ${scenario.pricePerUnit.toLocaleString('id-ID')} per unit; cocok untuk draft transaksi.`,
        recommendations: `Buat transaksi ${scenario.commodity} antara ${scenario.buyerName} dan ${scenario.farmerName}; libatkan Logistics untuk ${scenario.logisticsRoute} dan Finance untuk modal kerja petani.`,
      },
      role === 'supplier' ? 1 : role === 'logistics' ? 2 : 3
    ),
  ];
}

function weatherRows(userId, role) {
  const scenario =
    role === 'logistics'
      ? CONNECTION_SCENARIOS.chili
      : role === 'supplier'
        ? CONNECTION_SCENARIOS.corn
        : CONNECTION_SCENARIOS.rice;
  return [
    analysisRow(
      userId,
      {
        regions: role === 'logistics' ? [scenario.deliveryProvince] : ['jawa-barat'],
        crops: role === 'supplier' ? ['corn'] : [scenario.commodity, 'chili'],
        scenario: role === 'finance' ? 'drought' : 'heavy-rain',
        season: role === 'finance' ? 'dry-season' : 'wet-season',
        notes: `Demo cuaca untuk koneksi ${scenario.id} dan rute ${scenario.logisticsRoute}.`,
        connectionScenario: scenario.id,
        lang: 'id',
      },
      {
        impactAssessment: `Dampak sedang-tinggi pada jadwal panen ${scenario.farmerName} dan pengiriman ke ${scenario.deliveryCity}.`,
        cropAdjustments: 'Gunakan varietas toleran, perbaiki drainase, dan geser tanam untuk area rawan.',
        irrigationPlanning: 'Prioritaskan blok tanaman bernilai tinggi dan siapkan pompa/embung cadangan.',
        revisedSchedule: `Majukan inspeksi lahan 7 hari dan beri buffer pengiriman 2 hari di rute ${scenario.logisticsRoute}.`,
        mitigationStrategies: 'Aktifkan monitoring curah hujan, asuransi tani, kontrak fleksibel, dan notifikasi ke buyer/logistics.',
        riskLevel: role === 'finance' ? 'medium' : 'high',
      },
      role === 'finance' ? 2 : 1
    ),
  ];
}

function chatRows(userId, role, name) {
  const title = `[Demo History] ${name} - ${role}`;
  const scenario =
    role === 'logistics'
      ? CONNECTION_SCENARIOS.chili
      : role === 'supplier'
        ? CONNECTION_SCENARIOS.corn
        : CONNECTION_SCENARIOS.rice;
  const now = daysAgo(1);
  return {
    conversation: {
      user_id: userId,
      title,
      created_at: now,
      updated_at: now,
    },
    messages: [
      {
        user_id: userId,
        role: 'user',
        content: `Bagaimana saya melanjutkan koneksi ${scenario.id} untuk role ${role}?`,
        created_at: daysAgo(1),
      },
      {
        user_id: userId,
        role: 'assistant',
        content: `Mulai dari history matching ${scenario.commodity}, cek transaksi demo terkait, lalu libatkan role pendukung: logistics untuk rute ${scenario.logisticsRoute} dan finance untuk kebutuhan modal kerja petani.`,
        created_at: daysAgo(1),
      },
    ],
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

async function deleteAnalysisBatch(table) {
  const { data, error } = await admin.from(table).select('id').contains('input', { simulationBatch: BATCH_KEY });
  if (error) throw error;

  const ids = (data || []).map((row) => row.id);
  if (ids.length === 0) return 0;

  const { error: deleteError } = await admin.from(table).delete().in('id', ids);
  if (deleteError) throw deleteError;
  return ids.length;
}

async function cleanupPreviousSeed() {
  const tables = [
    'farmer_analyses',
    'buyer_analyses',
    'policy_analyses',
    'matching_analyses',
    'weather_analyses',
  ];

  let removed = 0;
  for (const table of tables) {
    removed += await deleteAnalysisBatch(table);
  }

  const { data: conversations, error } = await admin
    .from('chat_conversations')
    .select('id')
    .like('title', '[Demo History]%');
  if (error) throw error;

  const conversationIds = (conversations || []).map((row) => row.id);
  if (conversationIds.length > 0) {
    const { error: deleteError } = await admin.from('chat_conversations').delete().in('id', conversationIds);
    if (deleteError) throw deleteError;
    removed += conversationIds.length;
  }

  return removed;
}

async function insertRows(table, rows) {
  if (rows.length === 0) return 0;
  const { error } = await admin.from(table).insert(rows);
  if (error) throw error;
  return rows.length;
}

async function main() {
  console.log('Seeding role-demo feature histories...');
  const users = await getDemoUsersByEmail();
  const removed = await cleanupPreviousSeed();
  if (removed > 0) console.log(`Removed ${removed} previous demo history row(s).`);

  const rowsByTable = {
    farmer_analyses: [],
    buyer_analyses: [],
    policy_analyses: [],
    matching_analyses: [],
    weather_analyses: [],
  };
  const chats = [];

  for (const account of accounts) {
    const user = users[account.role];
    const features = roleFeatures[account.role] || [];

    if (features.includes('farmer')) rowsByTable.farmer_analyses.push(...farmerRows(user.id, account.role));
    if (features.includes('buyer')) rowsByTable.buyer_analyses.push(...buyerRows(user.id, account.role));
    if (features.includes('policy')) rowsByTable.policy_analyses.push(...policyRows(user.id, account.role));
    if (features.includes('matching')) rowsByTable.matching_analyses.push(...matchingRows(user.id, account.role));
    if (features.includes('weather')) rowsByTable.weather_analyses.push(...weatherRows(user.id, account.role));
    if (features.includes('chat')) chats.push(chatRows(user.id, account.role, account.name));
  }

  for (const [table, rows] of Object.entries(rowsByTable)) {
    const count = await insertRows(table, rows);
    console.log(`Created ${count} ${table} row(s).`);
  }

  for (const chat of chats) {
    const { data: conversation, error } = await admin
      .from('chat_conversations')
      .insert(chat.conversation)
      .select('id')
      .single();
    if (error) throw error;

    const messages = chat.messages.map((message) => ({
      ...message,
      conversation_id: conversation.id,
    }));

    const { error: messagesError } = await admin.from('chat_messages').insert(messages);
    if (messagesError) throw messagesError;
  }
  console.log(`Created ${chats.length} chat conversation(s).`);

  console.log('Done.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
