import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPostById, getReplies } from '@/lib/db/community';
import {
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const post = await getPostById(supabase, id);
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }
    const replies = await getReplies(supabase, id);
    return NextResponse.json({ success: true, data: { post, replies } });
  } catch (error) {
    console.error('Community post fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch post' }, { status: 500 });
  }
}
