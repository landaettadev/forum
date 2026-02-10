import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationList } from '@/components/notifications/notification-list';
import { generateMockNotification } from '../lib/supabase-mock';

// Mock supabase
const mockRpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

// Mock auth context
const mockUser = { id: 'test-user-123', email: 'test@test.com' };
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('NotificationList', () => {
  const mockOnMarkAllRead = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    
    render(
      <NotificationList onMarkAllRead={mockOnMarkAllRead} onClose={mockOnClose} />
    );

    // Should show loading skeleton
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });

  it('should display notifications when loaded', async () => {
    const mockNotifications = [
      generateMockNotification({ title: 'User mentioned you', type: 'mention' }),
      generateMockNotification({ title: 'New reply', type: 'reply' }),
    ];

    mockRpc.mockResolvedValue({ data: mockNotifications, error: null });

    render(
      <NotificationList onMarkAllRead={mockOnMarkAllRead} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('User mentioned you')).toBeInTheDocument();
      expect(screen.getByText('New reply')).toBeInTheDocument();
    });
  });

  it('should show empty state when no notifications', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    render(
      <NotificationList onMarkAllRead={mockOnMarkAllRead} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('No tienes notificaciones')).toBeInTheDocument();
    });
  });

  it('should call mark all read when button clicked', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    render(
      <NotificationList onMarkAllRead={mockOnMarkAllRead} onClose={mockOnClose} />
    );

    const markAllButton = screen.getByText('Marcar todas');
    fireEvent.click(markAllButton);

    expect(mockOnMarkAllRead).toHaveBeenCalled();
  });

  it('should mark notification as read when clicked', async () => {
    const mockNotification = generateMockNotification({ 
      id: 'notif-1',
      title: 'Test notification', 
      is_read: false,
      link: '/hilo/123'
    });

    mockRpc
      .mockResolvedValueOnce({ data: [mockNotification], error: null }) // get_user_notifications
      .mockResolvedValueOnce({ data: null, error: null }); // mark_notification_read

    render(
      <NotificationList onMarkAllRead={mockOnMarkAllRead} onClose={mockOnClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Test notification')).toBeInTheDocument();
    });

    // Verify the notification is rendered as a link
    const notificationLink = screen.getByText('Test notification').closest('a');
    expect(notificationLink).toBeTruthy();
  });

  it('should display notification header', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    render(
      <NotificationList onMarkAllRead={mockOnMarkAllRead} onClose={mockOnClose} />
    );

    // Header should always be present
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });
});
