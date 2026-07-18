'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, UserRole } from '@/types/auth';
import { buildAuthenticatedUser, ProfileSnapshot } from '@/lib/auth-user';
import { getDefaultDashboardPage } from '@/lib/rbac';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; redirectTo?: string }>;
  signup: (email: string, password: string, username: string, role: UserRole, institutionName?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getProfileSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileSnapshot | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username, role, status, institution_name, verification_document_path')
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle to avoid error when no rows found

    if (error) {
      console.warn('[AuthContext] Profile query error:', error.message);
      return null;
    }

    return profile;
  } catch (err) {
    console.warn('[AuthContext] Profile query exception:', err);
    return null;
  }
}

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
          const profile = await getProfileSnapshot(supabase, authUser.id);

          // Check again after async operation
          if (abortController.signal.aborted || !isMountedRef.current) return;

          setUser(buildAuthenticatedUser(authUser, profile));
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
          const profile = await getProfileSnapshot(supabase, authUser.id);

          if (!isMountedRef.current) return;

          setUser(buildAuthenticatedUser(authUser, profile));
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

  const login = useCallback(async (email: string, password: string) => {
    const supabase = supabaseRef.current;

    try {
      console.log('[AuthContext] Starting login for:', email);
      
      // Attempt sign in
      const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('[AuthContext] Sign in response:', {
        hasSession: !!sessionData?.session,
        hasUser: !!sessionData?.user,
        error: signInError?.message
      });

      // If there's an error and no session was created, fail immediately
      if (signInError) {
        console.error('[AuthContext] Sign in error:', signInError);
        
        // Check if it's a schema error but we still got a session
        if (signInError.message?.includes('schema') && sessionData?.session) {
          console.warn('[AuthContext] Schema error but session exists, continuing...');
        } else {
          // Real error, no session
          return { success: false, message: signInError.message };
        }
      }

      // Check if we got a session
      if (!sessionData?.session || !sessionData?.user) {
        console.error('[AuthContext] No session created');
        return { success: false, message: 'Login failed. No session created.' };
      }

      if (!isMountedRef.current) {
        return { success: false, message: 'Operation cancelled' };
      }

      console.log('[AuthContext] Session created successfully for user:', sessionData.user.id);
      
      // Use the user from session data directly
      const authUser = sessionData.user;

      if (!isMountedRef.current) {
        return { success: false, message: 'Operation cancelled' };
      }

      console.log('[AuthContext] User authenticated:', authUser.id);
      
      // Try to get profile, but don't fail if it doesn't exist
      let profile = await getProfileSnapshot(supabase, authUser.id);

      // If no profile exists, create one using admin client
      if (!profile) {
        console.log('[AuthContext] No profile found, creating...');
        try {
          const selfHealRole = authUser.user_metadata?.role || 'farmer';
          const selfHealNeedsVerification = selfHealRole === 'finance' || selfHealRole === 'government';
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User',
              role: selfHealRole,
              status: selfHealNeedsVerification ? 'pending' : 'approved',
              institution_name: authUser.user_metadata?.institution_name ?? null,
            })
            .select('username, role, status, institution_name, verification_document_path')
            .single();

          if (!createError && newProfile) {
            profile = newProfile;
            console.log('[AuthContext] Profile created successfully');
          }
        } catch (createErr) {
          console.warn('[AuthContext] Could not create profile, using defaults:', createErr);
        }
      }

      if (!isMountedRef.current) {
        return { success: false, message: 'Operation cancelled' };
      }

      const nextUser = buildAuthenticatedUser(authUser, profile);
      console.log('[AuthContext] User built:', { id: nextUser.id, role: nextUser.role });
      setUser(nextUser);

      router.refresh();
      return {
        success: true,
        redirectTo: nextUser.status === 'pending' || nextUser.status === 'rejected'
          ? '/pending-verification'
          : getDefaultDashboardPage(nextUser.role),
      };
    } catch (err) {
      console.error('[AuthContext] Login exception:', err);
      return { success: false, message: err instanceof Error ? err.message : 'Network error' };
    }
  }, [router]);

  const signup = useCallback(async (email: string, password: string, username: string, role: UserRole, institutionName?: string) => {
    const supabase = supabaseRef.current;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, role, institution_name: institutionName ?? null },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message?.toLowerCase().includes('already registered')) {
          return { success: false, message: 'ALREADY_REGISTERED' };
        }
        return { success: false, message: error.message };
      }

      if (!data.user) {
        return { success: false, message: 'Signup failed. No account created.' };
      }

      return { success: true };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    const supabase = supabaseRef.current;

    // Abort any pending async operations before signing out
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    await supabase.auth.signOut();

    if (isMountedRef.current) {
      setUser(null);
    }

    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
