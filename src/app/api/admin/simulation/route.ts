import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getRequestContext,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  // Verify role is "government"
  if (ctx.userRole !== 'government') {
    return createForbiddenResponse();
  }

  try {
    const admin = createAdminClient();

    // Fetch all data from all analysis tables + transactions in parallel
    const [farmers, buyers, policies, matchings, weathers, transactions, profiles, authUsers] = await Promise.all([
      admin.from('farmer_analyses').select('id, user_id, input, result, created_at').order('created_at', { ascending: false }),
      admin.from('buyer_analyses').select('id, user_id, input, result, created_at').order('created_at', { ascending: false }),
      admin.from('policy_analyses').select('id, user_id, input, result, created_at').order('created_at', { ascending: false }),
      admin.from('matching_analyses').select('id, user_id, input, result, created_at').order('created_at', { ascending: false }),
      admin.from('weather_analyses').select('id, user_id, input, result, created_at').order('created_at', { ascending: false }),
      admin.from('transactions').select('*').order('created_at', { ascending: false }),
      admin.from('profiles').select('id, username, role'),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const authUserById = new Map((authUsers.data?.users || []).map((user) => [user.id, user]));
    const normalizedProfiles = (profiles.data || []).map((profile) => {
      const authUser = authUserById.get(profile.id);
      return {
        id: profile.id,
        email: authUser?.email || '',
        full_name: profile.username,
        role: profile.role,
        province: '',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        profiles: normalizedProfiles,
        farmerAnalyses: farmers.data || [],
        buyerAnalyses: buyers.data || [],
        policyAnalyses: policies.data || [],
        matchingAnalyses: matchings.data || [],
        weatherAnalyses: weathers.data || [],
        transactions: transactions.data || [],
        counts: {
          profiles: normalizedProfiles.length,
          farmerAnalyses: (farmers.data || []).length,
          buyerAnalyses: (buyers.data || []).length,
          policyAnalyses: (policies.data || []).length,
          matchingAnalyses: (matchings.data || []).length,
          weatherAnalyses: (weathers.data || []).length,
          transactions: (transactions.data || []).length,
        },
      },
    });
  } catch (error) {
    console.error('Admin simulation fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch simulation data' },
      { status: 500 }
    );
  }
}
