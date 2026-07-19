export type StockEntryType = 'in' | 'out';

export interface Warehouse {
  id: string;
  owner_id: string;
  name: string;
  province: string;
  city: string | null;
  capacity_value: number | null;
  capacity_unit: string;
  created_at: string;
}

export interface WarehouseStockEntry {
  id: string;
  warehouse_id: string;
  commodity: string;
  quantity: number;
  unit: string;
  entry_type: StockEntryType;
  reference_transaction_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface StockBalance {
  commodity: string;
  unit: string;
  balance: number;
}

export interface CreateWarehouseInput {
  name: string;
  province: string;
  city?: string;
  capacityValue?: number;
  capacityUnit?: string;
}

export type UpdateWarehouseInput = Partial<CreateWarehouseInput>;

export interface CreateStockEntryInput {
  commodity: string;
  quantity: number;
  unit?: string;
  entryType: StockEntryType;
  referenceTransactionId?: string;
  notes?: string;
}
