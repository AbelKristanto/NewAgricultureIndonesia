import { SupabaseClient } from '@supabase/supabase-js';

export async function getDashboardMetrics(
  supabase: SupabaseClient,
  userId: string
) {
  const [farmer, buyer, policy, chat] = await Promise.all([
    supabase.from('farmer_analyses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('buyer_analyses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('policy_analyses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  return {
    farmerCount: farmer.count ?? 0,
    buyerCount: buyer.count ?? 0,
    policyCount: policy.count ?? 0,
    chatCount: chat.count ?? 0,
  };
}

interface RecentItem {
  type: string;
  title: string;
  created_at: string;
}

export async function getRecentActivity(
  supabase: SupabaseClient,
  userId: string,
  limit = 5
): Promise<RecentItem[]> {
  const [farmerRes, buyerRes, policyRes, chatRes] = await Promise.all([
    supabase
      .from('farmer_analyses')
      .select('input, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('buyer_analyses')
      .select('input, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('policy_analyses')
      .select('input, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('chat_conversations')
      .select('title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const items: RecentItem[] = [];

  for (const row of farmerRes.data || []) {
    const input = row.input as Record<string, string> | null;
    items.push({
      type: 'Farmer Analysis',
      title: input ? `${input.province || ''} - ${input.currentCrops || 'crops'}` : 'Farmer Analysis',
      created_at: row.created_at,
    });
  }

  for (const row of buyerRes.data || []) {
    const input = row.input as Record<string, string> | null;
    items.push({
      type: 'Buyer Sourcing',
      title: input ? `${input.commodityType || ''} - ${input.deliveryLocation || ''}` : 'Buyer Sourcing',
      created_at: row.created_at,
    });
  }

  for (const row of policyRes.data || []) {
    const input = row.input as Record<string, string[]> | null;
    const regions = input?.regions;
    items.push({
      type: 'Policy Analysis',
      title: regions && regions.length > 0 ? regions.slice(0, 2).join(', ') : 'Policy Analysis',
      created_at: row.created_at,
    });
  }

  for (const row of chatRes.data || []) {
    items.push({
      type: 'Chat',
      title: row.title || 'Chat conversation',
      created_at: row.created_at,
    });
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return items.slice(0, limit);
}
