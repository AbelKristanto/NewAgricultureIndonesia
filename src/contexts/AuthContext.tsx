'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, UserRole } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    const supabase = supabaseRef.current;
    isMountedRef.current = true;

    // Create an AbortController for async operations in this effect
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const initUser = async () => {
      try {
        // Check if aborted before starting
        if (abortController.signal.aborted) return;

        const { data: { user: authUser } } = await supabase.auth.getUser();

        // Check if aborted or unmounted after async operation
        if (abortController.signal.aborted || !isMountedRef.current) return;

        if (authUser) {
          // Try to fetch profile, but don't fail if table is unreachable
          let profileUsername: string | null = null;
          let profileRole: UserRole | null = null;

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, role')
              .eq('id', authUser.id)
              .single();

            if (profile) {
              profileUsername = profile.username;
              profileRole = profile.role as UserRole;
            }
          } catch {
            // Profile query failed (table might not exist or schema cache stale)
            console.warn('[AuthContext] Profile query failed during init, using defaults');
          }

          // Check again after async operation
          if (abortController.signal.aborted || !isMountedRef.current) return;

          setUser({
            id: authUser.id,
            email: authUser.email || '',
            username: profileUsername || authUser.email?.split('@')[0] || '',
            role: profileRole || 'farmer',
          });
        }
      } catch {
        // No valid session or aborted request
      } finally {
        if (isMountedRef.current && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    initUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          if (isMountedRef.current) {
            setUser(null);
          }
          return;
        }

        // Only handle TOKEN_REFRESHED here.
        // SIGNED_IN is handled by the login() function directly.
        if (event === 'TOKEN_REFRESHED') {
          if (!isMountedRef.current) return;

          const authUser = session.user;
          let profileUsername: string | null = null;
          let profileRole: UserRole | null = null;

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, role')
              .eq('id', authUser.id)
              .single();

            if (profile) {
              profileUsername = profile.username;
              profileRole = profile.role as UserRole;
            }
          } catch {
            // Profile query failed during token refresh, use defaults
            console.warn('[AuthContext] Profile query failed during token refresh');
          }

          if (!isMountedRef.current) return;

          setUser({
            id: authUser.id,
            email: authUser.email || '',
            username: profileUsername || authUser.email?.split('@')[0] || '',
            role: profileRole || 'farmer',
          });
        }
      }
    );

    // Store subscription ref for sign-out cleanup
    subscriptionRef.current = subscription;

    return () => {
      // Mark as unmounted to prevent state updates
      isMountedRef.current = false;

      // Abort any pending async operations
      abortController.abort();
      abortControllerRef.current = null;

      // Unsubscribe from auth state listener
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    const supabase = supabaseRef.current;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, message: error.message };
      }

      if (!isMountedRef.current) {
        return { success: false, message: 'Operation cancelled' };
      }

      // Get the authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!isMountedRef.current) {
        return { success: false, message: 'Operation cancelled' };
      }

      if (authUser) {
        // Try to update role in profile — ignore errors (table might not exist or RLS blocks)
        try {
          await supabase
            .from('profiles')
            .update({ role })
            .eq('id', authUser.id);
        } catch {
          console.warn('[AuthContext] Could not update profile role, continuing with login');
        }

        if (!isMountedRef.current) {
          return { success: false, message: 'Operation cancelled' };
        }

        // Try to fetch profile for username/role — use fallbacks if it fails
        let profileUsername: string | null = null;
        let profileRole: UserRole = role;

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, role')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            profileUsername = profile.username;
            profileRole = (profile.role as UserRole) || role;
          }
        } catch {
          console.warn('[AuthContext] Could not fetch profile, using defaults');
        }

        if (!isMountedRef.current) {
          return { success: false, message: 'Operation cancelled' };
        }

        setUser({
          id: authUser.id,
          email: authUser.email || '',
          username: profileUsername || authUser.email?.split('@')[0] || '',
          role: profileRole,
        });
      }

      router.refresh();
      return { success: true };
    } catch (err) {
      console.error('[AuthContext] Login error:', err);
      return { success: false, message: 'Network error' };
    }
  }, [router]);

  const logout = useCallback(async () => {
    const supabase = supabaseRef.current;

    // Abort any pending async operations before signing out
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Unsubscribe from auth state listener before sign-out
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    await supabase.auth.signOut();

    if (isMountedRef.current) {
      setUser(null);
    }

    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
