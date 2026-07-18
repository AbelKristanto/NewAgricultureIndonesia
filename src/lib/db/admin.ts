import { SupabaseClient } from '@supabase/supabase-js';
import { Transaction } from '@/types/transaction';
import { getSignedVerificationDocumentUrl } from '@/lib/storage';

export interface AdminProfileView {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  institution_name: string | null;
  verification_document_url: string | null;
  created_at?: string;
}

export async function getAllProfilesWithEmail(supabase: SupabaseClient): Promise<AdminProfileView[]> {
  const [profilesResult, authUsersResult] = await Promise.all([
    supabase.from('profiles').select('id, username, role, status, institution_name, verification_document_path, created_at'),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (profilesResult.error) throw profilesResult.error;

  const authUserById = new Map((authUsersResult.data?.users || []).map((user) => [user.id, user]));

  return Promise.all((profilesResult.data || []).map(async (profile) => {
    const authUser = authUserById.get(profile.id);
    const verificationDocumentUrl = profile.verification_document_path
      ? await getSignedVerificationDocumentUrl(supabase, profile.verification_document_path)
      : null;

    return {
      id: profile.id,
      email: authUser?.email || '',
      full_name: profile.username,
      role: profile.role,
      status: profile.status,
      institution_name: profile.institution_name,
      verification_document_url: verificationDocumentUrl,
      created_at: profile.created_at,
    };
  }));
}

export async function createAccount(
  supabase: SupabaseClient,
  input: { email: string; password: string; username: string; role: string; institutionName?: string }
) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { username: input.username, role: input.role },
  });
  if (error) throw error;

  // The handle_new_user() trigger (migration 001) usually creates the profile row,
  // but it doesn't always fire reliably for admin-created users — same fallback
  // AuthContext.login() already relies on for first-login profile creation.
  // Admin-created accounts are always 'approved' — the admin creating the
  // account is themselves the verifier, no second gate needed.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!existingProfile) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        username: input.username,
        role: input.role,
        status: 'approved',
        institution_name: input.institutionName ?? null,
      });
    if (insertError) throw insertError;
  }

  return data.user;
}

export async function getAllTransactionsAdmin(supabase: SupabaseClient): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Transaction[];
}

export async function deleteTransactionAdmin(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}
