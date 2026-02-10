// Mock helpers for Supabase RPC functions
import { vi } from 'vitest';

export const createMockSupabase = () => {
  const mockRpc = vi.fn();
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();

  // Chain methods
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  });

  mockSelect.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
  });

  mockEq.mockReturnValue({
    single: mockSingle,
    eq: mockEq,
  });

  return {
    supabase: {
      rpc: mockRpc,
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    },
    mocks: {
      rpc: mockRpc,
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      single: mockSingle,
    },
  };
};

// Mock user for testing
export const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  username: 'testuser',
  avatar_url: 'https://example.com/avatar.jpg',
};

// Mock data generators
export const generateMockNotification = (overrides = {}) => ({
  id: `notif-${Math.random().toString(36).substr(2, 9)}`,
  type: 'mention',
  title: 'Test notification',
  message: 'Test message',
  link: '/hilo/123',
  is_read: false,
  actor_username: 'otheruser',
  actor_avatar: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const generateMockConversation = (overrides = {}) => ({
  conversation_id: `conv-${Math.random().toString(36).substr(2, 9)}`,
  is_group: false,
  group_name: null,
  last_message_at: new Date().toISOString(),
  is_muted: false,
  is_archived: false,
  unread_count: 0,
  last_message_content: 'Hello!',
  last_message_sender_id: 'other-user-id',
  other_user_id: 'other-user-id',
  other_user_username: 'otheruser',
  other_user_avatar: null,
  ...overrides,
});

export const generateMockReaction = (overrides = {}) => ({
  reaction_type: 'like',
  emoji: '👍',
  count: 1,
  user_reacted: false,
  ...overrides,
});

export const generateMockPoll = (overrides: any = {}) => ({
  poll_id: `poll-${Math.random().toString(36).substr(2, 9)}`,
  question: 'Test poll question?',
  allow_multiple: false,
  show_results_before_vote: false,
  ends_at: null,
  is_closed: false,
  total_votes: 10,
  user_has_voted: overrides.user_voted ?? false,
  options: overrides.options?.map((opt: any) => ({
    id: opt.option_id || opt.id || `opt-${Math.random().toString(36).substr(2, 5)}`,
    text: opt.text || 'Option',
    votes: opt.vote_count ?? opt.votes ?? 5,
    user_voted: opt.user_selected ?? opt.user_voted ?? false,
  })) || [
    { id: 'opt-1', text: 'Option 1', votes: 6, user_voted: false },
    { id: 'opt-2', text: 'Option 2', votes: 4, user_voted: false },
  ],
  ...overrides,
});

export const generateMockProfileStats = (overrides = {}) => ({
  posts_count: 42,
  threads_count: 10,
  thanks_received: 156,
  thanks_given: 89,
  followers_count: 25,
  following_count: 30,
  profile_views: 1234,
  reputation: 500,
  reputation_level: 'trusted',
  ...overrides,
});

export const generateMockReport = (overrides = {}) => ({
  id: `report-${Math.random().toString(36).substr(2, 9)}`,
  target_type: 'post',
  target_id: 'post-123',
  reason: 'spam',
  description: 'This is spam',
  status: 'pending',
  created_at: new Date().toISOString(),
  ...overrides,
});
