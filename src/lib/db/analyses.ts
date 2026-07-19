import { SupabaseClient } from '@supabase/supabase-js';

type AnalysisTable = 'farmer_analyses' | 'buyer_analyses' | 'policy_analyses' | 'matching_analyses' | 'weather_analyses' | 'calendar_analyses' | 'esg_reports' | 'market_intelligence_analyses' | 'pest_alert_analyses';

export async function saveAnalysis(
  supabase: SupabaseClient,
  table: AnalysisTable,
  userId: string,
  input: Record<string, unknown>,
  result: Record<string, unknown>,
  extraColumns?: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from(table)
    .insert({ user_id: userId, input, result, ...extraColumns })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export async function getUserAnalyses(
  supabase: SupabaseClient,
  table: AnalysisTable,
  userId: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from(table)
    .select('id, input, result, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getAnalysisById(
  supabase: SupabaseClient,
  table: AnalysisTable,
  id: string,
  userId: string
) {
  const { data, error } = await supabase
    .from(table)
    .select('id, input, result, created_at')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}
