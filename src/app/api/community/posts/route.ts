import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPost, getPosts } from '@/lib/db/community';
import { CreatePostInput, PostCategory } from '@/types/community';
import {
  createUnauthorizedResponse,
  getRequestContext,
} from '@/lib/api-helpers';

const VALID_CATEGORIES: PostCategory[] = ['qa', 'harvest_share', 'price_share', 'tips', 'pest_discussion'];

export async function GET(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const category = VALID_CATEGORIES.includes(categoryParam as PostCategory) ? (categoryParam as PostCategory) : undefined;

    const supabase = createAdminClient();
    const posts = await getPosts(supabase, category);
    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    console.error('Community posts fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  if (!ctx) {
    return createUnauthorizedResponse();
  }

  try {
    const body = await request.json() as Partial<CreatePostInput>;
    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ success: false, error: 'A valid category is required' }, { status: 400 });
    }
    if (!body.title?.trim() || !body.body?.trim()) {
      return NextResponse.json({ success: false, error: 'title and body are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const post = await createPost(supabase, ctx.userId, {
      category: body.category,
      title: body.title.trim(),
      body: body.body.trim(),
    });
    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    console.error('Community post create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create post' }, { status: 500 });
  }
}
