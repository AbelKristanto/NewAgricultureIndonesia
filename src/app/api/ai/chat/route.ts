import { createClient } from '@/lib/supabase/server';
import { generateContentStream } from '@/lib/gemini';
import { getChatSystemPrompt } from '@/lib/prompts/chat-prompt';
import { createConversation, saveMessage } from '@/lib/db/chat';
import {
  getRequestContext,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createRateLimitResponse,
  isRequestPermittedForApi,
} from '@/lib/api-helpers';
import {
  getEndpointCategory,
  checkRateLimit,
  decrementRateLimit,
  RATE_LIMITS,
} from '@/lib/rate-limiter';

export async function POST(request: Request) {
  // Extract user context from middleware headers
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  if (!isRequestPermittedForApi(ctx, '/api/ai/chat')) {
    return createForbiddenResponse();
  }

  // Check rate limit
  const category = getEndpointCategory('/api/ai/chat');
  if (category) {
    const config = RATE_LIMITS[category];
    const rateLimitResult = await checkRateLimit(ctx.userId, category, config);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult.retryAfterSeconds ?? 60);
    }
  }

  try {
    // We still need a supabase client for DB operations (chat uses RLS-aware client)
    const supabase = await createClient();

    const body = await request.json();
    const { messages, lang, conversationId: existingConversationId } = body as {
      messages: { role: string; content: string }[];
      lang: 'en' | 'id';
      conversationId?: string;
    };

    // Get or create conversation
    let conversationId = existingConversationId;
    if (!conversationId) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      const title = lastUserMsg
        ? lastUserMsg.content.slice(0, 50) + (lastUserMsg.content.length > 50 ? '...' : '')
        : 'New conversation';
      try {
        const conv = await createConversation(supabase, ctx.userId, title);
        conversationId = conv.id;
      } catch (dbError) {
        console.error('Failed to create conversation:', dbError);
      }
    }

    // Save the user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (conversationId && lastUserMsg) {
      try {
        await saveMessage(supabase, conversationId, ctx.userId, 'user', lastUserMsg.content);
      } catch (dbError) {
        console.error('Failed to save user message:', dbError);
      }
    }

    const systemPrompt = getChatSystemPrompt(lang);

    let stream;
    try {
      stream = await generateContentStream(systemPrompt, messages);
    } catch (aiError: unknown) {
      // Decrement rate limit on 5xx AI service errors
      if (category) {
        await decrementRateLimit(ctx.userId, category);
      }
      console.error('Chat AI service error:', aiError);
      return new Response(JSON.stringify({ error: 'Gagal menghasilkan respons' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    let fullText = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text();
            if (text) {
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();

          // Save assistant message after stream completes
          if (conversationId && fullText) {
            try {
              await saveMessage(supabase, conversationId, ctx.userId, 'assistant', fullText);
            } catch (dbError) {
              console.error('Failed to save assistant message:', dbError);
            }
          }
        } catch (err) {
          // Decrement rate limit if streaming fails (5xx-like)
          if (category) {
            await decrementRateLimit(ctx.userId, category);
          }
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Conversation-Id': conversationId || '',
      },
    });
  } catch (error) {
    console.error('Chat AI error:', error);
    return new Response(JSON.stringify({ error: 'Gagal menghasilkan respons' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
