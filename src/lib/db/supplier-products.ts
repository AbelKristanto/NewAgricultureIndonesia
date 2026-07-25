import { SupabaseClient } from '@supabase/supabase-js';
import {
  AggregateInputDemandItem,
  CreateSupplierProductInput,
  SupplierProduct,
} from '@/types/supplier-products';
import { InputItemType } from '@/types/input-planning';

export async function getSupplierProducts(supabase: SupabaseClient, supplierId: string): Promise<SupplierProduct[]> {
  const { data, error } = await supabase
    .from('supplier_products')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as SupplierProduct[];
}

export async function getSupplierProductById(supabase: SupabaseClient, id: string): Promise<SupplierProduct | null> {
  const { data, error } = await supabase
    .from('supplier_products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as SupplierProduct | null;
}

export async function createSupplierProduct(
  supabase: SupabaseClient,
  supplierId: string,
  input: CreateSupplierProductInput
): Promise<SupplierProduct> {
  const { data, error } = await supabase
    .from('supplier_products')
    .insert({
      supplier_id: supplierId,
      product_name: input.productName,
      product_type: input.productType ?? 'other',
      unit: input.unit,
      price_per_unit: input.pricePerUnit,
      stock_quantity: input.stockQuantity ?? null,
      description: input.description ?? null,
      status: input.status ?? 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data as SupplierProduct;
}

export async function updateSupplierProduct(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<SupplierProduct> {
  const { data, error } = await supabase
    .from('supplier_products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SupplierProduct;
}

export async function deleteSupplierProduct(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('supplier_products').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Aggregate, anonymized view of what farmers are planning to buy — grouped
 * across all farmers by item so a supplier can gauge market demand without
 * seeing any individual farmer's identity or specific plan.
 */
export async function getAggregateInputDemand(supabase: SupabaseClient): Promise<AggregateInputDemandItem[]> {
  const { data, error } = await supabase
    .from('farmer_input_plans')
    .select('farmer_id, item_name, item_type, unit, quantity');

  if (error) throw error;

  const groups = new Map<string, { itemType: InputItemType; unit: string; totalQuantity: number; farmers: Set<string> }>();
  for (const row of data || []) {
    const key = `${row.item_name}::${row.item_type}::${row.unit}`;
    const group = groups.get(key) ?? {
      itemType: row.item_type as InputItemType,
      unit: row.unit as string,
      totalQuantity: 0,
      farmers: new Set<string>(),
    };
    group.totalQuantity += Number(row.quantity) || 0;
    group.farmers.add(row.farmer_id as string);
    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .map(([key, group]) => ({
      itemName: key.split('::')[0],
      itemType: group.itemType,
      unit: group.unit,
      totalQuantity: group.totalQuantity,
      farmerCount: group.farmers.size,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}
