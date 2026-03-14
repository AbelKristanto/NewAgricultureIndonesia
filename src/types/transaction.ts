export type TransactionStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Transaction {
  id: string;
  buyer_id: string;
  farmer_id: string | null;
  commodity: string;
  volume: number;
  volume_unit: string;
  price_per_unit: number | null;
  total_value: number | null;
  delivery_province: string;
  delivery_city: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TransactionStatus;
  terms: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionInput {
  commodity: string;
  volume: number;
  volumeUnit: string;
  pricePerUnit?: number;
  deliveryProvince: string;
  deliveryCity?: string;
  startDate?: string;
  endDate?: string;
  farmerId?: string;
  terms?: Record<string, unknown>;
}
