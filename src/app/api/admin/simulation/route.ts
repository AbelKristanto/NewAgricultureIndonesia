import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  // First verify the caller is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    // Fetch all data from all analysis tables + transactions in parallel
    const [farmers, buyers, policies, matchings, weathers, transactions, profiles] = await Promise.all([
      admin.from('farmer_analyses').select('id, user_id, input, result, created_at').order('created_at', { ascending: false }),
      admin.from('buyer_analyses').select('id, user_id, input, result, created_at').order('created_at', { ascending: false }),
      admin.from('policy_analyses').select('id, user_id, input, result, created_at').order('created_at', { ascending: false }),
      admin.from('matching_analyses').select('id, user_id, input, result, created_at').order('created_at', { ascending: false }),
      admin.from('weather_analyses').select('id, user_id, input, result, created_at').order('created_at', { ascending: false }),
      admin.from('transactions').select('*').order('created_at', { ascending: false }),
      admin.from('profiles').select('id, email, full_name, role, province'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        profiles: profiles.data || [],
        farmerAnalyses: farmers.data || [],
        buyerAnalyses: buyers.data || [],
        policyAnalyses: policies.data || [],
        matchingAnalyses: matchings.data || [],
        weatherAnalyses: weathers.data || [],
        transactions: transactions.data || [],
        counts: {
          profiles: (profiles.data || []).length,
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
