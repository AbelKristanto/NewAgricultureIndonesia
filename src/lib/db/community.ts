import { SupabaseClient } from '@supabase/supabase-js';
import { CommunityPost, CommunityReply, CreatePostInput, CreateReplyInput, PostCategory } from '@/types/community';

interface PostRow {
  id: string;
  author_id: string;
  category: PostCategory;
  title: string;
  body: string;
  created_at: string;
  profiles: { username: string | null } | { username: string | null }[] | null;
  community_replies: { count: number }[] | null;
}

interface ReplyRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: { username: string | null } | { username: string | null }[] | null;
}

function resolveUsername(profiles: PostRow['profiles']): string | null {
  if (!profiles) return null;
  const row = Array.isArray(profiles) ? profiles[0] : profiles;
  return row?.username ?? null;
}

function mapPost(row: PostRow): CommunityPost {
  return {
    id: row.id,
    author_id: row.author_id,
    author_username: resolveUsername(row.profiles),
    category: row.category,
    title: row.title,
    body: row.body,
    created_at: row.created_at,
    reply_count: row.community_replies?.[0]?.count ?? 0,
  };
}

function mapReply(row: ReplyRow): CommunityReply {
  return {
    id: row.id,
    post_id: row.post_id,
    author_id: row.author_id,
    author_username: resolveUsername(row.profiles),
    body: row.body,
    created_at: row.created_at,
  };
}

export async function getPosts(supabase: SupabaseClient, category?: PostCategory): Promise<CommunityPost[]> {
  let query = supabase
    .from('community_posts')
    .select('*, profiles!author_id(username), community_replies(count)')
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as unknown as PostRow[]).map(mapPost);
}

export async function getPostById(supabase: SupabaseClient, id: string): Promise<CommunityPost | null> {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*, profiles!author_id(username), community_replies(count)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapPost(data as unknown as PostRow) : null;
}

export async function createPost(
  supabase: SupabaseClient,
  authorId: string,
  input: CreatePostInput
): Promise<CommunityPost> {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_id: authorId,
      category: input.category,
      title: input.title,
      body: input.body,
    })
    .select('*, profiles!author_id(username), community_replies(count)')
    .single();

  if (error) throw error;
  return mapPost(data as unknown as PostRow);
}

export async function getReplies(supabase: SupabaseClient, postId: string): Promise<CommunityReply[]> {
  const { data, error } = await supabase
    .from('community_replies')
    .select('*, profiles!author_id(username)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data || []) as unknown as ReplyRow[]).map(mapReply);
}

export async function createReply(
  supabase: SupabaseClient,
  authorId: string,
  postId: string,
  input: CreateReplyInput
): Promise<CommunityReply> {
  const { data, error } = await supabase
    .from('community_replies')
    .insert({
      post_id: postId,
      author_id: authorId,
      body: input.body,
    })
    .select('*, profiles!author_id(username)')
    .single();

  if (error) throw error;
  return mapReply(data as unknown as ReplyRow);
}
