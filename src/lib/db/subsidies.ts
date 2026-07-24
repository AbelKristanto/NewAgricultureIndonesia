import { SupabaseClient } from '@supabase/supabase-js';
import { CreateSubsidyInput, FarmerSubsidy } from '@/types/subsidies';

export async function getSubsidies(supabase: SupabaseClient, farmerId: string): Promise<FarmerSubsidy[]> {
  const { data, error } = await supabase
    .from('farmer_subsidies')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FarmerSubsidy[];
}

export async function getSubsidyById(supabase: SupabaseClient, id: string): Promise<FarmerSubsidy | null> {
  const { data, error } = await supabase
    .from('farmer_subsidies')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as FarmerSubsidy | null;
}

export async function createSubsidy(
  supabase: SupabaseClient,
  farmerId: string,
  input: CreateSubsidyInput
): Promise<FarmerSubsidy> {
  const { data, error } = await supabase
    .from('farmer_subsidies')
    .insert({
      farmer_id: farmerId,
      program_name: input.programName,
      institution_name: input.institutionName,
      subsidy_type: input.subsidyType ?? 'cash',
      amount: input.amount ?? null,
      status: input.status ?? 'planned',
      application_date: input.applicationDate ?? null,
      disbursement_date: input.disbursementDate ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FarmerSubsidy;
}

export async function updateSubsidy(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<FarmerSubsidy> {
  const { data, error } = await supabase
    .from('farmer_subsidies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as FarmerSubsidy;
}

export async function deleteSubsidy(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('farmer_subsidies').delete().eq('id', id);
  if (error) throw error;
}
