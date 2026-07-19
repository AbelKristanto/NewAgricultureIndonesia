'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { CommunityPost, CommunityReply, CreatePostInput, PostCategory } from '@/types/community';
import { formatTimeAgo } from '@/lib/time-format';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import {
  Users,
  Plus,
  MessageCircle,
  HelpCircle,
  Wheat,
  Tag,
  Lightbulb,
  Bug,
} from 'lucide-react';

const CATEGORIES: { value: PostCategory; en: string; id: string; icon: typeof HelpCircle }[] = [
  { value: 'qa', en: 'Q&A', id: 'Tanya Jawab', icon: HelpCircle },
  { value: 'harvest_share', en: 'Harvest Sharing', id: 'Sharing Hasil Panen', icon: Wheat },
  { value: 'price_share', en: 'Price Sharing', id: 'Sharing Harga Daerah', icon: Tag },
  { value: 'tips', en: 'Farming Tips', id: 'Tips Budidaya', icon: Lightbulb },
  { value: 'pest_discussion', en: 'Pest Discussion', id: 'Diskusi Hama', icon: Bug },
];

function categoryLabel(value: PostCategory, lang: string): string {
  const found = CATEGORIES.find((c) => c.value === value);
  return found ? (lang === 'en' ? found.en : found.id) : value;
}

function Suspended() {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner size="lg" />
    </div>
  );
}

function CommunityPageInner() {
  const { lang } = useLanguage();
  const searchParams = useSearchParams();
  const isMounted = useRef(true);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<PostCategory | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState<PostCategory>('qa');
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(searchParams.get('post'));
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const loadPosts = useCallback(async (category: PostCategory | null) => {
    setLoading(true);
    setError('');
    try {
      const url = category ? `/api/community/posts?category=${category}` : '/api/community/posts';
      const res = await fetch(url);
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setPosts(data.data);
      } else {
        setError(lang === 'en' ? 'Failed to load posts' : 'Gagal memuat postingan');
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Failed to load posts' : 'Gagal memuat postingan');
    } finally {
      if (isMounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadPosts(activeCategory);
    return () => {
      isMounted.current = false;
    };
  }, [activeCategory, loadPosts]);

  const loadReplies = useCallback(async (postId: string) => {
    setRepliesLoading(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}`);
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setReplies(data.data.replies);
      }
    } catch {
      // Non-critical — the post itself already loaded from the list.
    } finally {
      if (isMounted.current) setRepliesLoading(false);
    }
  }, []);

  const handleToggleExpand = (postId: string) => {
    if (expandedId === postId) {
      setExpandedId(null);
      setReplies([]);
      return;
    }
    setExpandedId(postId);
    setReplies([]);
    loadReplies(postId);
  };

  useEffect(() => {
    if (expandedId) loadReplies(expandedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: formCategory, title: formTitle, body: formBody } as CreatePostInput),
      });
      const data = await res.json();
      if (data.success) {
        setFormTitle('');
        setFormBody('');
        setShowForm(false);
        loadPosts(activeCategory);
      }
    } catch {
      setError(lang === 'en' ? 'Failed to create post' : 'Gagal membuat postingan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (postId: string) => {
    if (!replyBody.trim()) return;
    setReplySubmitting(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyBody('');
        loadReplies(postId);
        setPosts((current) =>
          current.map((p) => (p.id === postId ? { ...p, reply_count: p.reply_count + 1 } : p))
        );
      }
    } catch {
      // Non-critical — user can retry the reply.
    } finally {
      setReplySubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Users className="h-6 w-6 text-primary-700" />
            {lang === 'en' ? 'Community' : 'Community'}
          </h1>
          <p className="mt-1 text-surface-500">
            {lang === 'en'
              ? 'Ask questions, share your harvest, prices, and tips with other farmers, buyers, and partners.'
              : 'Tanya jawab, bagikan hasil panen, harga, dan tips dengan petani, buyer, dan mitra lain.'}
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" />
          {lang === 'en' ? 'New Post' : 'Buat Postingan'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreatePost} className="space-y-4 rounded-xl border border-surface-200 bg-white p-5">
          <Select
            label={lang === 'en' ? 'Category' : 'Kategori'}
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value as PostCategory)}
            options={CATEGORIES.map((c) => ({ value: c.value, label: lang === 'en' ? c.en : c.id }))}
          />
          <Input
            label={lang === 'en' ? 'Title' : 'Judul'}
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            required
          />
          <Textarea
            label={lang === 'en' ? 'Message' : 'Isi postingan'}
            value={formBody}
            onChange={(e) => setFormBody(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : lang === 'en' ? 'Post' : 'Kirim'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              {lang === 'en' ? 'Cancel' : 'Batal'}
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            activeCategory === null ? 'bg-primary-700 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
          }`}
        >
          {lang === 'en' ? 'All' : 'Semua'}
        </button>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setActiveCategory(c.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === c.value ? 'bg-primary-700 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {lang === 'en' ? c.en : c.id}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <Suspended />
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en' ? 'No posts yet. Be the first to share.' : 'Belum ada postingan. Jadilah yang pertama berbagi.'}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const isExpanded = expandedId === post.id;
            return (
              <div key={post.id} className="rounded-xl border border-surface-200 bg-white">
                <button
                  type="button"
                  onClick={() => handleToggleExpand(post.id)}
                  className="w-full px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                      {categoryLabel(post.category, lang)}
                    </span>
                    <span className="text-xs text-surface-400">{formatTimeAgo(post.created_at, lang)}</span>
                  </div>
                  <p className="mt-1.5 font-medium text-gray-900">{post.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-surface-500">
                    <span>{post.author_username || (lang === 'en' ? 'Unknown user' : 'Pengguna tidak dikenal')}</span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {post.reply_count}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-surface-100 px-5 py-4">
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{post.body}</p>

                    <div className="mt-4 space-y-3">
                      <h3 className="text-xs font-semibold text-surface-500">
                        {lang === 'en' ? `Replies (${replies.length})` : `Balasan (${replies.length})`}
                      </h3>
                      {repliesLoading ? (
                        <Suspended />
                      ) : replies.length === 0 ? (
                        <p className="text-xs text-surface-400">
                          {lang === 'en' ? 'No replies yet.' : 'Belum ada balasan.'}
                        </p>
                      ) : (
                        replies.map((reply) => (
                          <div key={reply.id} className="rounded-lg bg-surface-50 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-900">
                                {reply.author_username || (lang === 'en' ? 'Unknown user' : 'Pengguna tidak dikenal')}
                              </span>
                              <span className="text-[11px] text-surface-400">{formatTimeAgo(reply.created_at, lang)}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-700">{reply.body}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Textarea
                        rows={2}
                        placeholder={lang === 'en' ? 'Write a reply...' : 'Tulis balasan...'}
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleReply(post.id)}
                        disabled={replySubmitting || !replyBody.trim()}
                      >
                        {replySubmitting ? <Spinner size="sm" /> : lang === 'en' ? 'Reply' : 'Balas'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<Suspended />}>
      <CommunityPageInner />
    </Suspense>
  );
}
