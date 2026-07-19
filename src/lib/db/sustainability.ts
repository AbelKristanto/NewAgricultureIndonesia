import { SupabaseClient } from '@supabase/supabase-js';
import { CreateAssessmentInput, SustainabilityAssessment, SustainabilityAssessmentWithUsername } from '@/types/sustainability';
import { computeSustainabilityScore } from '@/lib/sustainability-score';

interface AssessmentRow extends SustainabilityAssessment {
  profiles: { username: string | null } | { username: string | null }[] | null;
}

function resolveUsername(profiles: AssessmentRow['profiles']): string | null {
  if (!profiles) return null;
  const row = Array.isArray(profiles) ? profiles[0] : profiles;
  return row?.username ?? null;
}

export async function getOwnAssessments(supabase: SupabaseClient, farmerId: string): Promise<SustainabilityAssessment[]> {
  const { data, error } = await supabase
    .from('sustainability_assessments')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as SustainabilityAssessment[];
}

/**
 * One row per farmer (their most recent assessment), ordered by score — the
 * public-facing leaderboard buyers/finance/government browse.
 */
export async function getLeaderboard(supabase: SupabaseClient): Promise<SustainabilityAssessmentWithUsername[]> {
  const { data, error } = await supabase
    .from('sustainability_assessments')
    .select('*, profiles!farmer_id(username)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data || []) as unknown as AssessmentRow[];
  const latestByFarmer = new Map<string, AssessmentRow>();
  for (const row of rows) {
    if (!latestByFarmer.has(row.farmer_id)) latestByFarmer.set(row.farmer_id, row);
  }

  return Array.from(latestByFarmer.values())
    .map((row) => ({ ...row, farmer_username: resolveUsername(row.profiles) }))
    .sort((a, b) => b.score - a.score);
}

export async function createAssessment(
  supabase: SupabaseClient,
  farmerId: string,
  input: CreateAssessmentInput
): Promise<SustainabilityAssessment> {
  const score = computeSustainabilityScore(input);

  const { data, error } = await supabase
    .from('sustainability_assessments')
    .insert({
      farmer_id: farmerId,
      land_plot_id: input.landPlotId ?? null,
      water_conservation: input.waterConservation,
      pesticide_usage: input.pesticideUsage,
      organic_certified: input.organicCertified,
      crop_rotation: input.cropRotation,
      waste_management: input.wasteManagement,
      score,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SustainabilityAssessment;
}
