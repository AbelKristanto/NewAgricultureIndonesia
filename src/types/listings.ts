export type ListingStatus = 'active' | 'matched' | 'closed';

export interface FarmerSupplyListing {
  id: string;
  farmer_id: string;
  commodity: string;
  volume: number;
  volume_unit: string;
  quality_grade: string;
  region_province: string;
  region_city: string | null;
  timeline: string;
  price_expectation: number | null;
  status: ListingStatus;
  notes: string | null;
  matched_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuyerDemandListing {
  id: string;
  buyer_id: string;
  commodity: string;
  volume: number;
  volume_unit: string;
  quality_grade: string;
  delivery_province: string;
  delivery_city: string | null;
  timeline: string;
  price_expectation: number | null;
  status: ListingStatus;
  notes: string | null;
  matched_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplyListingInput {
  commodity: string;
  volume: number;
  volumeUnit: string;
  qualityGrade: string;
  regionProvince: string;
  regionCity?: string;
  timeline: string;
  priceExpectation?: number;
  notes?: string;
}

export interface CreateDemandListingInput {
  commodity: string;
  volume: number;
  volumeUnit: string;
  qualityGrade: string;
  deliveryProvince: string;
  deliveryCity?: string;
  timeline: string;
  priceExpectation?: number;
  notes?: string;
}
