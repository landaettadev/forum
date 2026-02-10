import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatView } from '@/components/messages/chat-view';
import { ConversationList } from '@/components/messages/conversation-list';
import { generateMockConversation } from '../lib/supabase-mock';

// Mock supabase - declare mocks before vi.mock to avoid hoisting issues
const mockRpc = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('@/lib/supabase', () => {
  const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder, eq: vi.fn(), single: vi.fn() });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  
  return {
    supabase: {
      rpc: (name: string, params: any) => mockRpc(name, params),
      from: () => ({ select: mockSelect }),
      channel: () => ({
        on: vi.fn().mockReturnThis(),
        subscribe: mockSubscribe,
      }),
      removeChannel: vi.fn(),
    },
  };
});

// Mock auth context
const mockUser = { id: 'test-user-123', email: 'test@test.com' };
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ConversationList', () => {
  const mockOnSelect = vi.fn();
  const mockOnNewMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() });
  });

  it('should fetch conversations on mount', async () => {
    const mockConversations = [
      generateMockConversation({ other_user_username: 'user1' }),
      generateMockConversation({ other_user_username: 'user2' }),
    ];

    mockRpc.mockResolvedValue({ data: mockConversations, error: null });

    render(<ConversationList onSelect={mockOnSelect} onNewMessage={mockOnNewMessage} />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_user_conversations', {
        p_user_id: 'test-user-123',
      });
    });
  });

  it('should display conversations', async () => {
    const mockConversations = [
      generateMockConversation({ 
        other_user_username: 'alice',
        last_message_content: 'Hello there!' 
      }),
      generateMockConversation({ 
        other_user_username: 'bob',
        last_message_content: 'How are you?' 
      }),
    ];

    mockRpc.mockResolvedValue({ data: mockConversations, error: null });

    render(<ConversationList onSelect={mockOnSelect} onNewMessage={mockOnNewMessage} />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
      expect(screen.getByText('How are you?')).toBeInTheDocument();
    });
  });

  it('should show unread count badge', async () => {
    const mockConversations = [
      generateMockConversation({ 
        other_user_username: 'alice',
        unread_count: 5 
      }),
    ];

    mockRpc.mockResolvedValue({ data: mockConversations, error: null });

    render(<ConversationList onSelect={mockOnSelect} onNewMessage={mockOnNewMessage} />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('should call onSelect when conversation clicked', async () => {
    const mockConversation = generateMockConversation({ 
      conversation_id: 'conv-123',
      other_user_username: 'alice',
    });

    mockRpc.mockResolvedValue({ data: [mockConversation], error: null });

    render(<ConversationList onSelect={mockOnSelect} onNewMessage={mockOnNewMessage} />);

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('alice'));

    expect(mockOnSelect).toHaveBeenCalledWith('conv-123');
  });

  it('should show empty state when no conversations', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    render(<ConversationList onSelect={mockOnSelect} onNewMessage={mockOnNewMessage} />);

    await waitFor(() => {
      expect(screen.getByText(/No tienes conversaciones/i)).toBeInTheDocument();
    });
  });
});

describe('ChatView', () => {
  const mockOtherUser = {
    id: 'other-user-456',
    username: 'otheruser',
    avatar_url: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() });
    // Mock RPC calls
    mockRpc.mockImplementation((name: string) => {
      if (name === 'mark_conversation_read') {
        return Promise.resolve({ data: null, error: null });
      }
      if (name === 'send_private_message') {
        return Promise.resolve({ data: { success: true, message_id: 'msg-123' }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('should mark conversation as read on mount', async () => {
    render(
      <ChatView 
        conversationId="conv-123" 
        otherUser={mockOtherUser}
      />
    );

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('mark_conversation_read', {
        p_conversation_id: 'conv-123',
        p_user_id: 'test-user-123',
      });
    });
  });

  it('should display other user info', async () => {
    render(
      <ChatView 
        conversationId="conv-123" 
        otherUser={mockOtherUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });
  });

  it('should subscribe to realtime updates', async () => {
    render(
      <ChatView 
        conversationId="conv-123" 
        otherUser={mockOtherUser}
      />
    );

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });
});
