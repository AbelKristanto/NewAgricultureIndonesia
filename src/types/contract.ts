export type ContractStatus = 'proposed' | 'active' | 'fulfilled' | 'breached' | 'cancelled';

export interface FarmingContract {
  id: string;
  farmer_id: string;
  buyer_id: string;
  commodity: string;
  agreed_volume: number;
  volume_unit: string;
  agreed_price_per_unit: number | null;
  start_date: string | null;
  end_date: string | null;
  delivery_schedule: string | null;
  terms: string | null;
  status: ContractStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContractInput {
  counterpartyId: string;
  commodity: string;
  agreedVolume: number;
  volumeUnit?: string;
  agreedPricePerUnit?: number;
  startDate?: string;
  endDate?: string;
  deliverySchedule?: string;
  terms?: string;
}
