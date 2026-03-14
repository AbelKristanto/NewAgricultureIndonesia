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
  role: UserRole;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
}
