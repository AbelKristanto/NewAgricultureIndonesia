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
  email_confirmed_at: string | null;
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
      email_confirmed_at: authUser?.email_confirmed_at ?? null,
      created_at: profile.created_at,
    };
  }));
}

export async function resendSignupConfirmation(
  supabase: SupabaseClient,
  email: string,
  emailRedirectTo: string
): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo },
  });
  if (error) throw error;
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

export interface PlatformOverview {
  usersByRole: Record<string, number>;
  transactionsByStatus: Record<string, number>;
  listingsByStatus: Record<string, number>;
  activeLogisticsPlans: number;
  aiAnalysesCounts: Record<string, number>;
  totalAiAnalyses: number;
}

const ANALYSIS_TABLES = [
  'farmer_analyses',
  'buyer_analyses',
  'policy_analyses',
  'matching_analyses',
  'weather_analyses',
  'calendar_analyses',
  'pest_alert_analyses',
  'market_intelligence_analyses',
  'esg_reports',
] as const;

async function countGroupedBy(
  supabase: SupabaseClient,
  table: string,
  column: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase.from(table).select(column);
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of (data || []) as unknown as Record<string, string>[]) {
    const key = row[column] || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * One aggregation helper shared by the admin Super Dashboard and the
 * government Platform Overview page — avoids duplicating the same set
 * of count queries across two API routes.
 */
export async function getPlatformOverview(supabase: SupabaseClient): Promise<PlatformOverview> {
  const [
    usersByRole,
    transactionsByStatus,
    supplyListingsByStatus,
    demandListingsByStatus,
    { count: activeLogisticsPlans },
    analysisCountsList,
  ] = await Promise.all([
    countGroupedBy(supabase, 'profiles', 'role'),
    countGroupedBy(supabase, 'transactions', 'status'),
    countGroupedBy(supabase, 'farmer_supply_listings', 'status'),
    countGroupedBy(supabase, 'buyer_demand_listings', 'status'),
    supabase.from('farmer_logistics_plans').select('*', { count: 'exact', head: true }),
    Promise.all(
      ANALYSIS_TABLES.map(async (table) => {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        return [table, count ?? 0] as const;
      })
    ),
  ]);

  const listingsByStatus: Record<string, number> = {};
  for (const [key, value] of Object.entries(supplyListingsByStatus)) {
    listingsByStatus[key] = (listingsByStatus[key] || 0) + value;
  }
  for (const [key, value] of Object.entries(demandListingsByStatus)) {
    listingsByStatus[key] = (listingsByStatus[key] || 0) + value;
  }

  const aiAnalysesCounts = Object.fromEntries(analysisCountsList);
  const totalAiAnalyses = analysisCountsList.reduce((sum, [, count]) => sum + count, 0);

  return {
    usersByRole,
    transactionsByStatus,
    listingsByStatus,
    activeLogisticsPlans: activeLogisticsPlans ?? 0,
    aiAnalysesCounts,
    totalAiAnalyses,
  };
}
