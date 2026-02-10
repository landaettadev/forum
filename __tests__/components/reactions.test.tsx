import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostReactions } from '@/components/forum/post-reactions';
import { generateMockReaction } from '../lib/supabase-mock';

// Mock supabase - use implementation to handle different RPC calls
const mockRpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (name: string, params: any) => mockRpc(name, params),
  },
}));

// Mock auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: { id: 'test-user-123' }, loading: false }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('PostReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to set up mock based on RPC function name
  const setupMockRpc = (reactionsData: any[], toggleResponse = { action: 'added' }) => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_post_reactions') {
        return Promise.resolve({ data: reactionsData, error: null });
      }
      if (name === 'toggle_reaction') {
        return Promise.resolve({ data: toggleResponse, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  };

  it('should fetch and display reactions on mount', async () => {
    const mockReactions = [
      generateMockReaction({ reaction_type: 'like', emoji: '👍', count: 5 }),
      generateMockReaction({ reaction_type: 'love', emoji: '❤️', count: 3 }),
    ];

    setupMockRpc(mockReactions);

    render(<PostReactions postId="post-123" />);

    await waitFor(() => {
      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    expect(mockRpc).toHaveBeenCalledWith('get_post_reactions', {
      p_post_id: 'post-123',
      p_user_id: 'test-user-123',
    });
  });

  it('should toggle reaction when clicked', async () => {
    const initialReactions = [
      generateMockReaction({ reaction_type: 'like', emoji: '👍', count: 5, user_reacted: false }),
    ];

    setupMockRpc(initialReactions, { action: 'added' });

    render(<PostReactions postId="post-123" />);

    await waitFor(() => {
      expect(screen.getByText('👍')).toBeInTheDocument();
    });

    const reactionButton = screen.getByText('👍').closest('button');
    fireEvent.click(reactionButton!);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('toggle_reaction', {
        p_post_id: 'post-123',
        p_user_id: 'test-user-123',
        p_reaction_type: 'like',
      });
    });
  });

  it('should highlight user reactions', async () => {
    const mockReactions = [
      generateMockReaction({ reaction_type: 'like', emoji: '👍', count: 5, user_reacted: true }),
    ];

    setupMockRpc(mockReactions);

    render(<PostReactions postId="post-123" />);

    await waitFor(() => {
      const reactionButton = screen.getByText('👍').closest('button');
      expect(reactionButton).toHaveClass('border-[hsl(var(--forum-accent))]');
    });
  });

  it('should call toggle_reaction RPC when clicking reaction', async () => {
    const initialReactions = [
      generateMockReaction({ reaction_type: 'like', emoji: '👍', count: 5, user_reacted: false }),
    ];

    setupMockRpc(initialReactions, { action: 'added' });

    render(<PostReactions postId="post-123" />);

    await waitFor(() => {
      expect(screen.getByText('👍')).toBeInTheDocument();
    });

    const reactionButton = screen.getByText('👍').closest('button');
    fireEvent.click(reactionButton!);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('toggle_reaction', expect.objectContaining({
        p_post_id: 'post-123',
        p_reaction_type: 'like',
      }));
    });
  });
});
