import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FollowButton } from '@/components/user/follow-button';
import { BlockButton } from '@/components/user/block-button';

// Mock supabase
const mockRpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

// Mock auth context
const mockUser = { id: 'current-user-123' };
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

describe('FollowButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check follow status on mount', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<FollowButton userId="other-user-456" username="otheruser" />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('is_following_user', { p_following_id: 'other-user-456' });
    });
  });

  it('should show "Seguir" when not following', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<FollowButton userId="other-user-456" username="otheruser" />);

    await waitFor(() => {
      expect(screen.getByText('Seguir')).toBeInTheDocument();
    });
  });

  it('should show "Siguiendo" when following', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    render(<FollowButton userId="other-user-456" username="otheruser" />);

    await waitFor(() => {
      expect(screen.getByText('Siguiendo')).toBeInTheDocument();
    });
  });

  it('should toggle follow on click', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: false, error: null }) // initial check
      .mockResolvedValueOnce({ data: { success: true, following: true }, error: null }); // toggle

    render(<FollowButton userId="other-user-456" username="otheruser" />);

    await waitFor(() => {
      expect(screen.getByText('Seguir')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Seguir'));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('toggle_user_follow', { p_following_id: 'other-user-456' });
      expect(screen.getByText('Siguiendo')).toBeInTheDocument();
    });
  });

  it('should not render for own profile', () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    const { container } = render(
      <FollowButton userId="current-user-123" username="currentuser" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should call onFollowChange callback', async () => {
    const onFollowChange = vi.fn();
    mockRpc
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: { success: true, following: true }, error: null });

    render(
      <FollowButton 
        userId="other-user-456" 
        username="otheruser" 
        onFollowChange={onFollowChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Seguir')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Seguir'));

    await waitFor(() => {
      expect(onFollowChange).toHaveBeenCalledWith(true);
    });
  });
});

describe('BlockButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check block status on mount', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<BlockButton userId="other-user-456" username="otheruser" />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('is_user_blocked', { p_user_id: 'other-user-456' });
    });
  });

  it('should show "Bloquear" when not blocked', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<BlockButton userId="other-user-456" username="otheruser" />);

    await waitFor(() => {
      expect(screen.getByText('Bloquear')).toBeInTheDocument();
    });
  });

  it('should show "Desbloquear" when blocked', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    render(<BlockButton userId="other-user-456" username="otheruser" />);

    await waitFor(() => {
      expect(screen.getByText('Desbloquear')).toBeInTheDocument();
    });
  });

  it('should not render for own profile', () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    const { container } = render(
      <BlockButton userId="current-user-123" username="currentuser" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show confirmation dialog when blocking', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<BlockButton userId="other-user-456" username="otheruser" />);

    await waitFor(() => {
      expect(screen.getByText('Bloquear')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Bloquear'));

    await waitFor(() => {
      expect(screen.getByText('¿Bloquear a otheruser?')).toBeInTheDocument();
    });
  });
});
