'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/brand/Logo';
import { createClient } from '@/lib/supabase/client';
import { ChatMessage } from '@/types/chat';
import { Send, User, Plus, MessageSquare, PanelLeftClose, PanelLeft } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import ReactMarkdown from 'react-markdown';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export default function ChatPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const requestedConversationId =
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('conversation');
  const supabaseRef = useRef(createClient());
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', content: t('chat.welcome'), timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations list
  useEffect(() => {
    if (!user?.id) return;
    isMounted.current = true;
    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const supabase = supabaseRef.current;
    supabase
      .from('chat_conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .abortSignal(abortController.signal)
      .then(({ data }) => {
        if (!isMounted.current) return;
        if (data) setConversations(data);
      });

    return () => {
      isMounted.current = false;
      abortController.abort();
      // Cancel any active stream reader on unmount
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => {});
        readerRef.current = null;
      }
    };
  }, [user?.id]);

  const loadConversation = useCallback(async (conv: Conversation, syncUrl = true) => {
    if (!user?.id) return;
    setLoadingConversationId(conv.id);
    const supabase = supabaseRef.current;
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conv.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .abortSignal(abortControllerRef.current?.signal ?? new AbortController().signal);

      if (!isMounted.current) return;
      if (data) {
        const loaded: ChatMessage[] = data.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at),
        }));
        setMessages(loaded);
        setConversationId(conv.id);
        if (syncUrl) {
          window.history.replaceState(null, '', `/dashboard/chat?conversation=${encodeURIComponent(conv.id)}`);
        }
      }
      setShowSidebar(false);
    } finally {
      if (isMounted.current) setLoadingConversationId(null);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!requestedConversationId || conversations.length === 0 || conversationId === requestedConversationId) {
      return;
    }

    const requestedConversation = conversations.find((conv) => conv.id === requestedConversationId);
    if (requestedConversation) {
      void loadConversation(requestedConversation, false);
    }
  }, [conversationId, conversations, loadConversation, requestedConversationId]);

  const startNewChat = () => {
    setMessages([
      { id: 'welcome', role: 'assistant', content: t('chat.welcome'), timestamp: new Date() },
    ]);
    setConversationId(null);
    setShowSidebar(false);
    window.history.replaceState(null, '', '/dashboard/chat');
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
    ]);

    try {
      const apiMessages = newMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const fetchController = new AbortController();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, lang, conversationId }),
        signal: fetchController.signal,
      });

      if (!isMounted.current) {
        fetchController.abort();
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      // Pick up conversation ID from header
      const newConvId = res.headers.get('X-Conversation-Id');
      if (newConvId && !conversationId) {
        setConversationId(newConvId);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      // Store reader ref for cleanup on unmount
      readerRef.current = reader;

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!isMounted.current) {
          reader.cancel().catch(() => {});
          readerRef.current = null;
          return;
        }
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
        );
      }

      readerRef.current = null;

      // Refresh conversations list
      if (user?.id && isMounted.current) {
        const supabase = supabaseRef.current;
        const { data } = await supabase
          .from('chat_conversations')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .abortSignal(abortControllerRef.current?.signal ?? new AbortController().signal);
        if (!isMounted.current) return;
        if (data) setConversations(data);
      }
    } catch (err) {
      if (!isMounted.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: t('common.error') } : m
        )
      );
    } finally {
      if (isMounted.current) {
        setIsStreaming(false);
        inputRef.current?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('chat.title')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.newChat')}</span>
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-300 text-gray-700 rounded-lg hover:bg-surface-50 transition-colors"
          >
            {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            <span className="hidden sm:inline">{t('common.conversations')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversations sidebar */}
        {showSidebar && (
          <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-surface-200 overflow-y-auto">
            <div className="p-3 space-y-1">
              {conversations.length === 0 ? (
                <p className="text-sm text-surface-400 p-2">{t('common.noHistory')}</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv)}
                    disabled={loadingConversationId === conv.id}
                    aria-busy={loadingConversationId === conv.id}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                      conversationId === conv.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-surface-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {loadingConversationId === conv.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                    </div>
                    <p className="text-xs text-surface-400 mt-0.5 ml-5.5">{new Date(conv.updated_at).toLocaleDateString()}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto chat-scroll bg-white rounded-xl border border-surface-200 p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <Logo
                    variant="mark"
                    className="h-9 w-9 flex-shrink-0"
                    imageClassName="drop-shadow-sm"
                  />
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary-700 text-white'
                      : 'bg-surface-50 text-gray-800'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
                      {msg.content ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-2 text-surface-400">
                          <Spinner size="sm" />
                          <span className="text-sm">{t('chat.thinking')}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="h-8 w-8 bg-primary-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              disabled={isStreaming}
              rows={1}
              className="flex-1 rounded-xl border border-surface-300 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="h-12 w-12 bg-primary-700 text-white rounded-xl flex items-center justify-center hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
