import { InputItemType } from '@/types/input-planning';

export type SupplierProductStatus = 'active' | 'inactive';

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_name: string;
  product_type: InputItemType;
  unit: string;
  price_per_unit: number;
  stock_quantity: number | null;
  description: string | null;
  status: SupplierProductStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierProductInput {
  productName: string;
  productType?: InputItemType;
  unit: string;
  pricePerUnit: number;
  stockQuantity?: number;
  description?: string;
  status?: SupplierProductStatus;
}

export type UpdateSupplierProductInput = Partial<CreateSupplierProductInput>;

export interface AggregateInputDemandItem {
  itemName: string;
  itemType: InputItemType;
  unit: string;
  totalQuantity: number;
  farmerCount: number;
}
