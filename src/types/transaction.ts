export type TransactionStatus =
  | 'draft'
  | 'proposed'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TransactionParty = 'buyer' | 'farmer';

export type NegotiationAction =
  | 'offer_created'
  | 'proposal_submitted'
  | 'counter_offer'
  | 'accepted'
  | 'rejected'
  | 'status_updated';

export interface TransactionNegotiationEntry {
  id: string;
  actor_id: string;
  actor_party: TransactionParty;
  action: NegotiationAction;
  status: TransactionStatus;
  price_per_unit: number | null;
  start_date: string | null;
  end_date: string | null;
  note: string | null;
  created_at: string;
}

export interface TransactionTerms {
  note?: string | null;
  connectionScenario?: string | null;
  connectionFlow?: {
    matching?: string | null;
    finance?: string | null;
    logistics?: string | null;
  } | null;
  negotiationHistory?: TransactionNegotiationEntry[];
  participants?: Array<{
    user_id: string;
    role: string;
    label?: string | null;
  }>;
}

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
  terms: TransactionTerms | null;
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
  note?: string;
  terms?: TransactionTerms;
}
