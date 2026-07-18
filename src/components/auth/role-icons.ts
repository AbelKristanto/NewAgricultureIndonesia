import type { LucideIcon } from 'lucide-react';
import { Wheat, ShoppingCart, Package, Truck, Landmark, Building2, Shield } from 'lucide-react';
import { UserRole } from '@/types/auth';

export const ROLE_ICONS: Record<UserRole, LucideIcon> = {
  farmer: Wheat,
  buyer: ShoppingCart,
  supplier: Package,
  logistics: Truck,
  finance: Landmark,
  government: Building2,
  admin: Shield,
};
