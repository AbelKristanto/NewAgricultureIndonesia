export type SubsidyType = 'cash' | 'input' | 'equipment' | 'training' | 'other';
export type SubsidyStatus = 'planned' | 'applied' | 'approved' | 'rejected' | 'disbursed';

export interface FarmerSubsidy {
  id: string;
  farmer_id: string;
  program_name: string;
  institution_name: string;
  subsidy_type: SubsidyType;
  amount: number | null;
  status: SubsidyStatus;
  application_date: string | null;
  disbursement_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSubsidyInput {
  programName: string;
  institutionName: string;
  subsidyType?: SubsidyType;
  amount?: number;
  status?: SubsidyStatus;
  applicationDate?: string;
  disbursementDate?: string;
  notes?: string;
}

export type UpdateSubsidyInput = Partial<CreateSubsidyInput>;
