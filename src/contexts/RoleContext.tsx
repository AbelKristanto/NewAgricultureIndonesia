'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { UserRole } from '@/types/auth';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children, initialRole }: { children: ReactNode; initialRole?: UserRole }) {
  const { user } = useAuth();
  const [role, setRoleState] = useState<UserRole>(initialRole || user?.role || 'farmer');
  const supabaseRef = useRef(createClient());

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    if (user) {
      supabaseRef.current
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id)
        .then();
    }
  }, [user]);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within RoleProvider');
  return context;
}
