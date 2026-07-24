import { SupabaseClient } from '@supabase/supabase-js';
import { CreateInputPlanInput, FarmerInputPlan } from '@/types/input-planning';

export async function getInputPlans(supabase: SupabaseClient, farmerId: string): Promise<FarmerInputPlan[]> {
  const { data, error } = await supabase
    .from('farmer_input_plans')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FarmerInputPlan[];
}

export async function getInputPlanById(supabase: SupabaseClient, id: string): Promise<FarmerInputPlan | null> {
  const { data, error } = await supabase
    .from('farmer_input_plans')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as FarmerInputPlan | null;
}

export async function createInputPlan(
  supabase: SupabaseClient,
  farmerId: string,
  input: CreateInputPlanInput
): Promise<FarmerInputPlan> {
  const { data, error } = await supabase
    .from('farmer_input_plans')
    .insert({
      farmer_id: farmerId,
      land_plot_id: input.landPlotId ?? null,
      commodity: input.commodity ?? null,
      season_label: input.seasonLabel ?? null,
      item_name: input.itemName,
      item_type: input.itemType ?? 'other',
      quantity: input.quantity,
      unit: input.unit,
      unit_cost: input.unitCost ?? null,
      status: input.status ?? 'planned',
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FarmerInputPlan;
}

export async function updateInputPlan(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<FarmerInputPlan> {
  const { data, error } = await supabase
    .from('farmer_input_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as FarmerInputPlan;
}

export async function deleteInputPlan(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('farmer_input_plans').delete().eq('id', id);
  if (error) throw error;
}
