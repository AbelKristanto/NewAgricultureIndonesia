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
        notes: 'Demo history untuk rekomendasi tanam dan kebutuhan input.',
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
        buyerMatching: 'Buyer Jakarta dan Bandung cocok untuk kontrak beras/cabai mingguan.',
        inputRequirements: 'Prioritaskan benih padi genjah, NPK, dolomit, dan mulsa cabai.',
        subsidies: 'Cek alokasi pupuk bersubsidi dan bantuan alsintan di dinas setempat.',
      },
      role === 'government' ? 2 : 1
    ),
  ];
}

function buyerRows(userId, role) {
  return [
    analysisRow(
      userId,
      {
        commodityType: role === 'government' ? 'corn' : 'rice',
        volume: role === 'government' ? 75 : 40,
        volumeUnit: 'tons',
        qualityGrade: 'grade-a',
        deliveryProvince: 'dki-jakarta',
        deliveryCity: 'Jakarta Utara',
        startMonth: '07',
        endMonth: '09',
        frequency: 'monthly',
        budgetMin: 420000000,
        budgetMax: 560000000,
        specialRequirements: 'Demo sourcing untuk kontrak pasokan terjadwal.',
        lang: 'id',
      },
      {
        productionRegions: 'Karawang, Subang, dan Indramayu menjadi sumber utama dengan jarak logistik pendek.',
        supplyCapacity: 'Kapasitas realistis 35-55 ton per bulan dari 3-5 kelompok tani.',
        logisticsRoutes: 'Rute Pantura menuju Jakarta Utara paling stabil untuk pengiriman bulanan.',
        deliveryTimeline: 'Lead time 2-4 hari setelah quality check dan konsolidasi gudang.',
        supplyRisk: 'Risiko utama adalah hujan ekstrem dan fluktuasi harga menjelang panen raya.',
        recommendedSuppliers: 'Prioritaskan koperasi Subang dan agregator Karawang untuk konsistensi volume.',
      },
      role === 'government' ? 3 : 1
    ),
  ];
}

function policyRows(userId, role) {
  return [
    analysisRow(
      userId,
      {
        regions: role === 'finance' ? ['jawa-barat', 'jawa-tengah'] : ['jawa-barat', 'jawa-tengah', 'jawa-timur'],
        commodities: role === 'finance' ? ['rice', 'chili'] : ['rice', 'corn'],
        analysisTypes: ['production-capacity', 'food-supply-gaps', 'demand-supply'],
        timeHorizon: role === 'finance' ? '1-year' : '5-years',
        lang: 'id',
      },
      {
        productionOverview: 'Sentra Jawa masih kuat, tetapi perlu stabilisasi gudang dan kontrak pasokan lintas musim.',
        supplyDemandAnalysis: 'Permintaan perkotaan naik 8-12%, sementara produksi rentan pada cuaca ekstrem.',
        riskZones: 'Risiko tinggi di wilayah banjir Pantura dan area tadah hujan saat kemarau panjang.',
        policyRecommendations: 'Dorong kontrak farming, cadangan pangan regional, dan pembiayaan modal kerja pascapanen.',
        priorityActions: '1. Verifikasi stok kabupaten. 2. Perkuat logistik dingin. 3. Aktifkan pembiayaan invoice.',
      },
      role === 'finance' ? 1 : 2
    ),
  ];
}

function matchingRows(userId, role) {
  const commodity = role === 'supplier' ? 'corn' : role === 'logistics' ? 'chili' : 'rice';
  return [
    analysisRow(
      userId,
      {
        commodity,
        volume: role === 'logistics' ? 900 : 30,
        volumeUnit: role === 'logistics' ? 'kg' : 'tons',
        deliveryProvince: role === 'logistics' ? 'jawa-barat' : 'dki-jakarta',
        deliveryCity: role === 'logistics' ? 'Bandung' : 'Jakarta Utara',
        qualityGrade: role === 'supplier' ? 'standard' : 'grade-a',
        timeline: '1-season',
        notes: `Demo pencocokan pasokan untuk role ${role}.`,
        lang: 'id',
      },
      {
        matchedRegions: 'Subang, Karawang, Garut, dan Malang menjadi kandidat tergantung komoditas dan timeline.',
        capacityEstimates: 'Kapasitas aman tersedia 70-85% dari kebutuhan; sisanya perlu buffer supplier cadangan.',
        logisticsFeasibility: 'Rute utama layak dengan konsolidasi gudang dan jadwal muat pagi.',
        timeline: 'Matching awal 1-2 hari, negosiasi 3-5 hari, pengiriman pertama 7-14 hari.',
        priceAnalysis: 'Harga berada di rentang pasar menengah; kontrak volume bisa menekan 3-5%.',
        recommendations: 'Gunakan 2 pemasok utama dan 1 cadangan, lalu kunci SLA kualitas di transaksi.',
      },
      role === 'supplier' ? 1 : role === 'logistics' ? 2 : 3
    ),
  ];
}

function weatherRows(userId, role) {
  return [
    analysisRow(
      userId,
      {
        regions: role === 'logistics' ? ['jawa-timur'] : ['jawa-barat'],
        crops: role === 'supplier' ? ['corn'] : ['rice', 'chili'],
        scenario: role === 'finance' ? 'drought' : 'heavy-rain',
        season: role === 'finance' ? 'dry-season' : 'wet-season',
        notes: `Demo intelijen cuaca untuk role ${role}.`,
        lang: 'id',
      },
      {
        impactAssessment: 'Dampak sedang-tinggi pada jadwal panen dan kualitas pengiriman.',
        cropAdjustments: 'Gunakan varietas toleran, perbaiki drainase, dan geser tanam untuk area rawan.',
        irrigationPlanning: 'Prioritaskan blok tanaman bernilai tinggi dan siapkan pompa/embung cadangan.',
        revisedSchedule: 'Majukan inspeksi lahan 7 hari dan beri buffer pengiriman 2 hari.',
        mitigationStrategies: 'Aktifkan monitoring curah hujan, asuransi tani, dan kontrak fleksibel.',
        riskLevel: role === 'finance' ? 'medium' : 'high',
      },
      role === 'finance' ? 2 : 1
    ),
  ];
}

function chatRows(userId, role, name) {
  const title = `[Demo History] ${name} - ${role}`;
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
        content: `Apa rekomendasi utama untuk role ${role} minggu ini?`,
        created_at: daysAgo(1),
      },
      {
        user_id: userId,
        role: 'assistant',
        content: 'Fokus pada item prioritas di dashboard: cek history analisis, validasi transaksi demo, dan gunakan pencocokan pasokan untuk membandingkan opsi.',
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
