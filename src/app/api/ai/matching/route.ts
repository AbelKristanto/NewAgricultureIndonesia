import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildMatchingPrompt } from '@/lib/prompts/matching-prompt';
import { MatchingInput, MatchingAnalysis } from '@/types/matching';
import { saveAnalysis } from '@/lib/db/analyses';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: MatchingInput = await request.json();
    const systemPrompt = getSystemPrompt(body.lang);
    const userPrompt = buildMatchingPrompt(body);

    const responseText = await generateContent(systemPrompt, userPrompt);
    const parsed = parseAIResponse<MatchingAnalysis>(responseText);

    const resultData = parsed || { rawText: responseText };

    try {
      await saveAnalysis(supabase, 'matching_analyses', user.id, body as unknown as Record<string, unknown>, resultData as unknown as Record<string, unknown>);
    } catch (dbError) {
      console.error('Failed to save matching analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Matching AI error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate matching analysis' },
      { status: 500 }
    );
  }
}
