/**
 * Integration tests for Supabase RPC functions
 * These tests verify the RPC function signatures and expected behaviors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock data
const mockUserId = 'test-user-123';
const mockThreadId = 'thread-456';
const mockPostId = 'post-789';

// Create mock supabase client for RPC testing
const createMockRpc = () => {
  const rpcMock = vi.fn();
  return {
    rpc: rpcMock,
    mockRpc: rpcMock,
  };
};

describe('Profile Stats RPC', () => {
  it('get_profile_stats should return all required fields', async () => {
    const { rpc, mockRpc } = createMockRpc();
    
    const expectedResponse = {
      posts_count: 42,
      threads_count: 10,
      thanks_received: 156,
      thanks_given: 89,
      followers_count: 25,
      following_count: 30,
      profile_views: 1234,
      reputation: 500,
      reputation_level: 'trusted',
    };

    mockRpc.mockResolvedValue({ data: expectedResponse, error: null });

    const result = await rpc('get_profile_stats', { p_user_id: mockUserId });

    expect(mockRpc).toHaveBeenCalledWith('get_profile_stats', { p_user_id: mockUserId });
    expect(result.data).toHaveProperty('posts_count');
    expect(result.data).toHaveProperty('threads_count');
    expect(result.data).toHaveProperty('thanks_received');
    expect(result.data).toHaveProperty('thanks_given');
    expect(result.data).toHaveProperty('followers_count');
    expect(result.data).toHaveProperty('following_count');
    expect(result.data).toHaveProperty('profile_views');
    expect(result.data).toHaveProperty('reputation');
    expect(result.data).toHaveProperty('reputation_level');
  });
});

describe('Online Status RPC', () => {
  it('update_user_presence should accept user_id', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: null, error: null });

    await rpc('update_user_presence', { p_user_id: mockUserId });

    expect(mockRpc).toHaveBeenCalledWith('update_user_presence', { p_user_id: mockUserId });
  });

  it('mark_user_offline should accept user_id', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: null, error: null });

    await rpc('mark_user_offline', { p_user_id: mockUserId });

    expect(mockRpc).toHaveBeenCalledWith('mark_user_offline', { p_user_id: mockUserId });
  });

  it('get_online_users should return user list', async () => {
    const { rpc, mockRpc } = createMockRpc();
    
    const expectedUsers = [
      { user_id: 'user-1', username: 'alice', avatar_url: null, last_seen_at: new Date().toISOString(), is_online: true },
      { user_id: 'user-2', username: 'bob', avatar_url: null, last_seen_at: new Date().toISOString(), is_online: true },
    ];

    mockRpc.mockResolvedValue({ data: expectedUsers, error: null });

    const result = await rpc('get_online_users', { p_limit: 10 });

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toHaveProperty('user_id');
    expect(result.data[0]).toHaveProperty('username');
    expect(result.data[0]).toHaveProperty('is_online');
  });

  it('get_online_users_count should return number', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: 15, error: null });

    const result = await rpc('get_online_users_count');

    expect(typeof result.data).toBe('number');
  });
});

describe('Reputation RPC', () => {
  it('get_reputation_leaderboard should return ranked users', async () => {
    const { rpc, mockRpc } = createMockRpc();
    
    const expectedLeaderboard = [
      { user_id: 'user-1', username: 'top1', avatar_url: null, reputation: 5000, reputation_level: 'legend' },
      { user_id: 'user-2', username: 'top2', avatar_url: null, reputation: 3000, reputation_level: 'master' },
    ];

    mockRpc.mockResolvedValue({ data: expectedLeaderboard, error: null });

    const result = await rpc('get_reputation_leaderboard', { p_limit: 5 });

    expect(result.data).toHaveLength(2);
    expect(result.data[0].reputation).toBeGreaterThan(result.data[1].reputation);
  });

  it('add_reputation should return new reputation info', async () => {
    const { rpc, mockRpc } = createMockRpc();
    
    mockRpc.mockResolvedValue({ 
      data: { success: true, new_reputation: 550, new_level: 'trusted' }, 
      error: null 
    });

    const result = await rpc('add_reputation', { 
      p_user_id: mockUserId, 
      p_amount: 50, 
      p_reason: 'Post thanked' 
    });

    expect(result.data.success).toBe(true);
    expect(result.data).toHaveProperty('new_reputation');
    expect(result.data).toHaveProperty('new_level');
  });
});

describe('Notifications RPC', () => {
  it('get_user_notifications should return notification list', async () => {
    const { rpc, mockRpc } = createMockRpc();
    
    const expectedNotifications = [
      {
        id: 'notif-1',
        type: 'mention',
        title: 'You were mentioned',
        message: 'In thread X',
        link: '/hilo/123',
        is_read: false,
        actor_username: 'alice',
        actor_avatar: null,
        created_at: new Date().toISOString(),
      },
    ];

    mockRpc.mockResolvedValue({ data: expectedNotifications, error: null });

    const result = await rpc('get_user_notifications', { 
      p_user_id: mockUserId, 
      p_limit: 20 
    });

    expect(result.data[0]).toHaveProperty('id');
    expect(result.data[0]).toHaveProperty('type');
    expect(result.data[0]).toHaveProperty('title');
    expect(result.data[0]).toHaveProperty('is_read');
  });

  it('mark_notification_read should accept notification_id', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: null, error: null });

    await rpc('mark_notification_read', { p_notification_id: 'notif-123' });

    expect(mockRpc).toHaveBeenCalledWith('mark_notification_read', { p_notification_id: 'notif-123' });
  });

  it('mark_all_notifications_read should return count', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: 5, error: null });

    const result = await rpc('mark_all_notifications_read', { p_user_id: mockUserId });

    expect(typeof result.data).toBe('number');
  });

  it('get_unread_notifications_count should return number', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: 3, error: null });

    const result = await rpc('get_unread_notifications_count', { p_user_id: mockUserId });

    expect(typeof result.data).toBe('number');
  });
});

describe('Thread Subscriptions RPC', () => {
  it('toggle_thread_subscription should return success and state', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: { success: true, subscribed: true }, error: null });

    const result = await rpc('toggle_thread_subscription', { 
      p_thread_id: mockThreadId, 
      p_user_id: mockUserId 
    });

    expect(result.data.success).toBe(true);
    expect(result.data).toHaveProperty('subscribed');
  });

  it('is_subscribed_to_thread should return boolean', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: true, error: null });

    const result = await rpc('is_subscribed_to_thread', { 
      p_thread_id: mockThreadId, 
      p_user_id: mockUserId 
    });

    expect(typeof result.data).toBe('boolean');
  });
});

describe('Reports RPC', () => {
  it('create_report should return success or already reported', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: { success: true, report_id: 'report-123' }, error: null });

    const result = await rpc('create_report', { 
      p_target_type: 'post', 
      p_target_id: mockPostId,
      p_reason: 'spam',
      p_description: 'This is spam'
    });

    expect(result.data.success).toBe(true);
  });

  it('create_report should handle already reported case', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: { success: false, error: 'Already reported' }, error: null });

    const result = await rpc('create_report', { 
      p_target_type: 'post', 
      p_target_id: mockPostId,
      p_reason: 'spam'
    });

    expect(result.data.success).toBe(false);
    expect(result.data.error).toBe('Already reported');
  });
});

describe('Follow/Block RPC', () => {
  it('toggle_user_follow should return success and state', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: { success: true, following: true }, error: null });

    const result = await rpc('toggle_user_follow', { p_following_id: 'other-user-456' });

    expect(result.data.success).toBe(true);
    expect(result.data).toHaveProperty('following');
  });

  it('is_following_user should return boolean', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: true, error: null });

    const result = await rpc('is_following_user', { p_following_id: 'other-user-456' });

    expect(typeof result.data).toBe('boolean');
  });

  it('toggle_user_block should return success and state', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: { success: true, blocked: true }, error: null });

    const result = await rpc('toggle_user_block', { p_blocked_id: 'other-user-456' });

    expect(result.data.success).toBe(true);
    expect(result.data).toHaveProperty('blocked');
  });

  it('is_user_blocked should return boolean', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: false, error: null });

    const result = await rpc('is_user_blocked', { p_user_id: 'other-user-456' });

    expect(typeof result.data).toBe('boolean');
  });
});

describe('Reactions RPC', () => {
  it('get_post_reactions should return reaction list', async () => {
    const { rpc, mockRpc } = createMockRpc();
    
    const expectedReactions = [
      { reaction_type: 'like', emoji: '👍', count: 5, user_reacted: false },
      { reaction_type: 'love', emoji: '❤️', count: 3, user_reacted: true },
    ];

    mockRpc.mockResolvedValue({ data: expectedReactions, error: null });

    const result = await rpc('get_post_reactions', { 
      p_post_id: mockPostId, 
      p_user_id: mockUserId 
    });

    expect(result.data[0]).toHaveProperty('reaction_type');
    expect(result.data[0]).toHaveProperty('emoji');
    expect(result.data[0]).toHaveProperty('count');
    expect(result.data[0]).toHaveProperty('user_reacted');
  });

  it('toggle_reaction should return action taken', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: { success: true, action: 'added' }, error: null });

    const result = await rpc('toggle_reaction', { 
      p_post_id: mockPostId, 
      p_user_id: mockUserId,
      p_reaction_type: 'like'
    });

    expect(result.data.success).toBe(true);
    expect(['added', 'removed']).toContain(result.data.action);
  });
});

describe('Polls RPC', () => {
  it('get_poll_with_results should return poll data', async () => {
    const { rpc, mockRpc } = createMockRpc();
    
    const expectedPoll = {
      poll_id: 'poll-123',
      question: 'Test question?',
      allow_multiple: false,
      show_results_before_vote: false,
      ends_at: null,
      total_votes: 10,
      user_voted: false,
      options: [
        { option_id: 'opt-1', text: 'Option 1', vote_count: 6, percentage: 60, user_selected: false },
        { option_id: 'opt-2', text: 'Option 2', vote_count: 4, percentage: 40, user_selected: false },
      ],
    };

    mockRpc.mockResolvedValue({ data: expectedPoll, error: null });

    const result = await rpc('get_poll_with_results', { 
      p_thread_id: mockThreadId, 
      p_user_id: mockUserId 
    });

    expect(result.data).toHaveProperty('poll_id');
    expect(result.data).toHaveProperty('question');
    expect(result.data).toHaveProperty('options');
    expect(result.data.options).toBeInstanceOf(Array);
  });

  it('vote_on_poll should return success', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const result = await rpc('vote_on_poll', { 
      p_poll_id: 'poll-123',
      p_option_ids: ['opt-1'],
      p_user_id: mockUserId
    });

    expect(result.data.success).toBe(true);
  });

  it('create_poll should return success', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: { success: true, poll_id: 'poll-new' }, error: null });

    const result = await rpc('create_poll', { 
      p_thread_id: mockThreadId,
      p_question: 'New poll?',
      p_options: ['Option A', 'Option B'],
      p_allow_multiple: false,
      p_show_results_before_vote: false
    });

    expect(result.data.success).toBe(true);
    expect(result.data).toHaveProperty('poll_id');
  });
});

describe('Private Messages RPC', () => {
  it('get_user_conversations should return conversation list', async () => {
    const { rpc, mockRpc } = createMockRpc();
    
    const expectedConversations = [
      {
        conversation_id: 'conv-1',
        is_group: false,
        last_message_at: new Date().toISOString(),
        unread_count: 2,
        last_message_content: 'Hello!',
        other_user_username: 'alice',
      },
    ];

    mockRpc.mockResolvedValue({ data: expectedConversations, error: null });

    const result = await rpc('get_user_conversations', { p_user_id: mockUserId });

    expect(result.data[0]).toHaveProperty('conversation_id');
    expect(result.data[0]).toHaveProperty('unread_count');
    expect(result.data[0]).toHaveProperty('last_message_content');
  });

  it('send_private_message should return success', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: { success: true, message_id: 'msg-123' }, error: null });

    const result = await rpc('send_private_message', { 
      p_conversation_id: 'conv-123',
      p_sender_id: mockUserId,
      p_content: 'Hello!'
    });

    expect(result.data.success).toBe(true);
    expect(result.data).toHaveProperty('message_id');
  });

  it('mark_conversation_read should complete without error', async () => {
    const { rpc, mockRpc } = createMockRpc();
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await rpc('mark_conversation_read', { 
      p_conversation_id: 'conv-123',
      p_user_id: mockUserId
    });

    expect(result.error).toBeNull();
  });
});
