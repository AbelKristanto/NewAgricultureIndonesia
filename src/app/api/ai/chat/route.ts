import { createClient } from '@/lib/supabase/server';
import { generateContentStream } from '@/lib/gemini';
import { getChatSystemPrompt } from '@/lib/prompts/chat-prompt';
import { createConversation, saveMessage } from '@/lib/db/chat';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
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
        const conv = await createConversation(supabase, user.id, title);
        conversationId = conv.id;
      } catch (dbError) {
        console.error('Failed to create conversation:', dbError);
      }
    }

    // Save the user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (conversationId && lastUserMsg) {
      try {
        await saveMessage(supabase, conversationId, user.id, 'user', lastUserMsg.content);
      } catch (dbError) {
        console.error('Failed to save user message:', dbError);
      }
    }

    const systemPrompt = getChatSystemPrompt(lang);
    const stream = await generateContentStream(systemPrompt, messages);

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
              await saveMessage(supabase, conversationId, user.id, 'assistant', fullText);
            } catch (dbError) {
              console.error('Failed to save assistant message:', dbError);
            }
          }
        } catch (err) {
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
    return new Response(JSON.stringify({ error: 'Failed to generate response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
