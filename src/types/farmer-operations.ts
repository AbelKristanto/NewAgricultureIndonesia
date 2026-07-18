export interface FarmerFinancingOpportunity {
  id: string;
  farmer_id: string;
  transaction_id: string | null;
  created_by: string | null;
  institution_name: string;
  product_name: string;
  amount_min: number;
  amount_max: number;
  interest_rate: string | null;
  tenor_months: number | null;
  status: 'available' | 'requested' | 'reviewing' | 'approved' | 'rejected';
  fit_score: number;
  linked_analysis_id: string | null;
  requirements: string[];
  contact: {
    officer?: string;
    phone?: string;
    email?: string;
    branch?: string;
  } | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogisticsCheckpoint {
  label: string;
  time: string;
  lat: number;
  lng: number;
  status: 'done' | 'current' | 'pending';
  photo_path?: string | null;
  photo_url?: string | null;
}

export interface FarmerLogisticsPlan {
  id: string;
  farmer_id: string;
  transaction_id: string | null;
  provider_name: string;
  commodity: string;
  volume: number;
  volume_unit: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  current_lat: number | null;
  current_lng: number | null;
  pickup_time: string | null;
  estimated_arrival: string | null;
  status: 'scheduled' | 'pickup_pending' | 'picked_up' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled';
  vehicle: {
    plate?: string;
    driver?: string;
    phone?: string;
    type?: string;
  } | null;
  checkpoints: LogisticsCheckpoint[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FarmerActivitySummary {
  id: string;
  farmer_id: string;
  transaction_id: string | null;
  contract_status: string;
  goods_status: string;
  payment_status: string;
  delivery_status: string;
  summary: {
    contractTitle?: string;
    buyerName?: string;
    commodity?: string;
    agreedVolume?: string;
    agreedValue?: string;
    goodsProgress?: number;
    paymentProgress?: number;
    deliveryProgress?: number;
    nextAction?: string;
    paymentMilestones?: Array<{
      label: string;
      amount: string;
      status: string;
    }>;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface FarmerOperationsData {
  financing: FarmerFinancingOpportunity[];
  logistics: FarmerLogisticsPlan[];
  summaries: FarmerActivitySummary[];
}

export interface CreateFinancingOpportunityInput {
  farmerId: string;
  transactionId: string;
  createdBy: string;
  institutionName: string;
  productName: string;
  amountMin: number;
  amountMax: number;
  interestRate?: string | null;
  tenorMonths?: number | null;
  requirements?: string[];
  contact?: {
    officer?: string;
    phone?: string;
    email?: string;
    branch?: string;
  } | null;
  notes?: string | null;
}

export interface CreateLogisticsPlanInput {
  farmerId: string;
  transactionId: string;
  providerName: string;
  commodity: string;
  volume: number;
  volumeUnit: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  pickupTime?: string | null;
  notes?: string | null;
}
