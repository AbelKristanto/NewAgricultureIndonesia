import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateContent, parseAIResponse } from '@/lib/gemini';
import { getSystemPrompt } from '@/lib/prompts/system-prompt';
import { buildWeatherPrompt } from '@/lib/prompts/weather-prompt';
import { WeatherInput, WeatherAnalysis } from '@/types/weather';
import { saveAnalysis } from '@/lib/db/analyses';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: WeatherInput = await request.json();
    const systemPrompt = getSystemPrompt(body.lang);
    const userPrompt = buildWeatherPrompt(body);

    const responseText = await generateContent(systemPrompt, userPrompt);
    const parsed = parseAIResponse<WeatherAnalysis>(responseText);

    const resultData = parsed || { rawText: responseText };

    try {
      await saveAnalysis(supabase, 'weather_analyses', user.id, body as unknown as Record<string, unknown>, resultData as unknown as Record<string, unknown>);
    } catch (dbError) {
      console.error('Failed to save weather analysis:', dbError);
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Weather AI error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate weather analysis' },
      { status: 500 }
    );
  }
}
