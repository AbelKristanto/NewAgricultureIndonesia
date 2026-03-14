import { SupabaseClient } from '@supabase/supabase-js';

export async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  title = 'New conversation'
) {
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({ user_id: userId, title })
    .select('id, title, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function getUserConversations(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function saveMessage(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ conversation_id: conversationId, user_id: userId, role, content })
    .select('id')
    .single();

  if (error) throw error;

  // Touch conversation updated_at
  await supabase
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function updateConversationTitle(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  title: string
) {
  const { error } = await supabase
    .from('chat_conversations')
    .update({ title })
    .eq('id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}
