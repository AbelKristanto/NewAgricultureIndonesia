export type UserRole = 'farmer' | 'buyer' | 'supplier' | 'logistics' | 'finance' | 'government' | 'admin';

export type ProfileStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: ProfileStatus;
  institutionName: string | null;
  hasVerificationDocument: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  redirectTo?: string;
  message?: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  username: string;
  role: UserRole;
  institutionName?: string;
}

export interface SignupResponse {
  success: boolean;
  message?: string;
}
