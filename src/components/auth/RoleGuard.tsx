'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isPagePermitted } from '@/lib/rbac';

interface RoleGuardProps {
  children: React.ReactNode;
}

export function RoleGuard({ children }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const role = user?.role ?? null;
  const permitted = isPagePermitted(role, pathname);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!permitted) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, permitted, router]);

  // Still loading auth state — render nothing to avoid flash
  if (isLoading) return null;

  // User not loaded yet (shouldn't happen after loading, but guard anyway)
  if (!user) return null;

  // Not permitted — render nothing while redirect happens
  if (!permitted) return null;

  return <>{children}</>;
}
