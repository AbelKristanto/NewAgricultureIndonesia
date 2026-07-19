import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { ProfileStatus, User, UserRole } from '@/types/auth';
import { normalizeUserRole } from '@/lib/rbac';

export interface ProfileSnapshot {
  username?: string | null;
  role?: unknown;
  status?: unknown;
  institution_name?: string | null;
  verification_document_path?: string | null;
}

export function resolveUserRole(profileRole: unknown, metadataRole: unknown): UserRole {
  return normalizeUserRole(profileRole) ?? normalizeUserRole(metadataRole) ?? 'farmer';
}

function resolveProfileStatus(status: unknown): ProfileStatus {
  return status === 'pending' || status === 'rejected' || status === 'deactivated' ? status : 'approved';
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
    status: resolveProfileStatus(profile?.status),
    institutionName: profile?.institution_name ?? null,
    hasVerificationDocument: Boolean(profile?.verification_document_path),
  };
}
