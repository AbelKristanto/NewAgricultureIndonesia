import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildPolicyPrompt } from '@/lib/prompts/policy-prompt';
import { PolicyQuery, PolicyInsights } from '@/types/policy';
import { saveAnalysis } from '@/lib/db/analyses';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: PolicyQuery = await request.json();
    const systemPrompt = getSystemPrompt(body.lang);
    const userPrompt = buildPolicyPrompt(body);

    const responseText = await generateContent(systemPrompt, userPrompt);
    const parsed = parseAIResponse<PolicyInsights>(responseText);

    const resultData = parsed || { rawText: responseText };

    // Persist to database
    try {
      await saveAnalysis(supabase, 'policy_analyses', user.id, body as unknown as Record<string, unknown>, resultData as unknown as Record<string, unknown>);
    } catch (dbError) {
      console.error('Failed to save policy analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Policy AI error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate analysis' },
      { status: 500 }
    );
  }
}
