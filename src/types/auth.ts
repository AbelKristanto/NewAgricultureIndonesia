export type UserRole = 'farmer' | 'buyer' | 'supplier' | 'logistics' | 'finance' | 'government';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
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
