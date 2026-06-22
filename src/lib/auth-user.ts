import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User, UserRole } from '@/types/auth';
import { normalizeUserRole } from '@/lib/rbac';

export interface ProfileSnapshot {
  username?: string | null;
  role?: unknown;
}

export function resolveUserRole(profileRole: unknown, metadataRole: unknown): UserRole {
  return normalizeUserRole(profileRole) ?? normalizeUserRole(metadataRole) ?? 'farmer';
}

export function buildAuthenticatedUser(
  authUser: SupabaseAuthUser,
  profile?: ProfileSnapshot | null
): User {
  const metadataUsername =
    typeof authUser.user_metadata?.username === 'string' ? authUser.user_metadata.username : null;

  return {
    id: authUser.id,
    email: authUser.email || '',
    username: profile?.username || metadataUsername || authUser.email?.split('@')[0] || '',
    role: resolveUserRole(profile?.role, authUser.user_metadata?.role),
  };
}
