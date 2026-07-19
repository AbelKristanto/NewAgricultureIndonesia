import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createReply, getPostById } from '@/lib/db/community';
import { createNotification } from '@/lib/db/notifications';
import { buildCommunityReplyNotification } from '@/lib/notification-copy';
import { CreateReplyInput } from '@/types/community';
import {
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const { id } = await params;
    const body = await request.json() as Partial<CreateReplyInput>;
    if (!body.body?.trim()) {
      return NextResponse.json({ success: false, error: 'body is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const post = await getPostById(supabase, id);
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const reply = await createReply(supabase, ctx.userId, id, { body: body.body.trim() });

    if (post.author_id !== ctx.userId) {
      const copy = buildCommunityReplyNotification(reply.author_username || 'Seseorang', post.title);
      await createNotification(supabase, {
        userId: post.author_id,
        type: copy.type,
        title: copy.title,
        body: copy.body,
        link: `/dashboard/community?post=${post.id}`,
      });
    }

    return NextResponse.json({ success: true, data: reply }, { status: 201 });
  } catch (error) {
    console.error('Community reply create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create reply' }, { status: 500 });
  }
}
