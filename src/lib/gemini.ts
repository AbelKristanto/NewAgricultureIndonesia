import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export function getModel(modelName: string = 'gemini-2.0-flash') {
  return genAI.getGenerativeModel({ model: modelName });
}

export async function generateContent(systemPrompt: string, userPrompt: string): Promise<string> {
  const model = getModel();
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
  });
  return result.response.text();
}

export async function generateContentStream(systemPrompt: string, messages: { role: string; content: string }[]) {
  const model = getModel();
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const result = await model.generateContentStream({
    contents,
    systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
  });

  return result.stream;
}

export function stripMarkdownFences(text: string): string {
  // Remove ```json ... ``` wrappers
  const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  return match ? match[1].trim() : text.trim();
}

export function parseAIResponse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    try {
      return JSON.parse(stripMarkdownFences(text)) as T;
    } catch {
      return null;
    }
  }
}
