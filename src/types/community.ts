export type PostCategory = 'qa' | 'harvest_share' | 'price_share' | 'tips' | 'pest_discussion';

export interface CommunityPost {
  id: string;
  author_id: string;
  author_username: string | null;
  category: PostCategory;
  title: string;
  body: string;
  created_at: string;
  reply_count: number;
}

export interface CommunityReply {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string | null;
  body: string;
  created_at: string;
}

export interface CreatePostInput {
  category: PostCategory;
  title: string;
  body: string;
}

export interface CreateReplyInput {
  body: string;
}
