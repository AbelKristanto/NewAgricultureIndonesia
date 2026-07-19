import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateStockEntryInput,
  CreateWarehouseInput,
  StockBalance,
  Warehouse,
  WarehouseStockEntry,
} from '@/types/warehouse';

export async function getWarehouses(supabase: SupabaseClient, ownerId: string): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Warehouse[];
}

export async function getWarehouseById(supabase: SupabaseClient, id: string): Promise<Warehouse | null> {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as Warehouse | null;
}

export async function createWarehouse(
  supabase: SupabaseClient,
  ownerId: string,
  input: CreateWarehouseInput
): Promise<Warehouse> {
  const { data, error } = await supabase
    .from('warehouses')
    .insert({
      owner_id: ownerId,
      name: input.name,
      province: input.province,
      city: input.city ?? null,
      capacity_value: input.capacityValue ?? null,
      capacity_unit: input.capacityUnit ?? 'ton',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Warehouse;
}

export async function updateWarehouse(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>
): Promise<Warehouse> {
  const { data, error } = await supabase
    .from('warehouses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Warehouse;
}

export async function deleteWarehouse(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('warehouses').delete().eq('id', id);
  if (error) throw error;
}

export async function getStockEntries(supabase: SupabaseClient, warehouseId: string): Promise<WarehouseStockEntry[]> {
  const { data, error } = await supabase
    .from('warehouse_stock_entries')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as WarehouseStockEntry[];
}

export async function createStockEntry(
  supabase: SupabaseClient,
  warehouseId: string,
  input: CreateStockEntryInput
): Promise<WarehouseStockEntry> {
  const { data, error } = await supabase
    .from('warehouse_stock_entries')
    .insert({
      warehouse_id: warehouseId,
      commodity: input.commodity,
      quantity: input.quantity,
      unit: input.unit ?? 'kg',
      entry_type: input.entryType,
      reference_transaction_id: input.referenceTransactionId ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as WarehouseStockEntry;
}

export function computeStockBalances(entries: WarehouseStockEntry[]): StockBalance[] {
  const balances = new Map<string, StockBalance>();

  for (const entry of entries) {
    const key = `${entry.commodity}::${entry.unit}`;
    const existing = balances.get(key) ?? { commodity: entry.commodity, unit: entry.unit, balance: 0 };
    existing.balance += entry.entry_type === 'in' ? entry.quantity : -entry.quantity;
    balances.set(key, existing);
  }

  return Array.from(balances.values());
}
