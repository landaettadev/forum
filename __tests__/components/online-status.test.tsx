import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { OnlineIndicator, AvatarWithStatus, useOnlinePresence } from '@/components/user/online-status';

// Mock supabase
const mockRpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

// Mock auth context
let mockUser: { id: string } | null = { id: 'test-user-123' };
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

describe('OnlineIndicator', () => {
  it('should show green indicator when online', () => {
    const { container } = render(<OnlineIndicator isOnline={true} />);
    
    const indicator = container.querySelector('span');
    expect(indicator).toHaveClass('bg-green-500');
  });

  it('should show gray indicator when offline', () => {
    const { container } = render(<OnlineIndicator isOnline={false} />);
    
    const indicator = container.querySelector('span');
    expect(indicator).toHaveClass('bg-gray-400');
  });

  it('should show online when last seen within 5 minutes', () => {
    const recentTime = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutes ago
    const { container } = render(<OnlineIndicator lastSeen={recentTime} />);
    
    const indicator = container.querySelector('span');
    expect(indicator).toHaveClass('bg-green-500');
  });

  it('should show offline when last seen more than 5 minutes ago', () => {
    const oldTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
    const { container } = render(<OnlineIndicator lastSeen={oldTime} />);
    
    const indicator = container.querySelector('span');
    expect(indicator).toHaveClass('bg-gray-400');
  });

  it('should show label when showLabel is true', () => {
    render(<OnlineIndicator isOnline={true} showLabel={true} />);
    
    expect(screen.getByText('En línea')).toBeInTheDocument();
  });

  it('should show offline label when offline', () => {
    render(<OnlineIndicator isOnline={false} showLabel={true} />);
    
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
  });

  it('should apply correct size classes', () => {
    const { container: smContainer } = render(<OnlineIndicator isOnline={true} size="sm" />);
    expect(smContainer.querySelector('span')).toHaveClass('w-2.5', 'h-2.5');

    const { container: mdContainer } = render(<OnlineIndicator isOnline={true} size="md" />);
    expect(mdContainer.querySelector('span')).toHaveClass('w-3', 'h-3');

    const { container: lgContainer } = render(<OnlineIndicator isOnline={true} size="lg" />);
    expect(lgContainer.querySelector('span')).toHaveClass('w-4', 'h-4');
  });
});

describe('AvatarWithStatus', () => {
  it('should render children', () => {
    render(
      <AvatarWithStatus isOnline={true}>
        <div data-testid="avatar">Avatar</div>
      </AvatarWithStatus>
    );
    
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('should show green status badge when online', () => {
    const { container } = render(
      <AvatarWithStatus isOnline={true}>
        <div>Avatar</div>
      </AvatarWithStatus>
    );
    
    const statusBadge = container.querySelector('.absolute');
    expect(statusBadge).toHaveClass('bg-green-500');
  });

  it('should show gray status badge when offline', () => {
    const { container } = render(
      <AvatarWithStatus isOnline={false}>
        <div>Avatar</div>
      </AvatarWithStatus>
    );
    
    const statusBadge = container.querySelector('.absolute');
    expect(statusBadge).toHaveClass('bg-gray-400');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <AvatarWithStatus isOnline={true} className="custom-class">
        <div>Avatar</div>
      </AvatarWithStatus>
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('useOnlinePresence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUser = { id: 'test-user-123' };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should update presence on mount when user is logged in', () => {
    renderHook(() => useOnlinePresence());

    expect(mockRpc).toHaveBeenCalledWith('update_user_presence', { p_user_id: 'test-user-123' });
  });

  it('should not call RPC when user is not logged in', () => {
    mockUser = null;
    
    renderHook(() => useOnlinePresence());

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should update presence periodically', () => {
    renderHook(() => useOnlinePresence());

    // Initial call
    expect(mockRpc).toHaveBeenCalledTimes(1);

    // Advance time by 2 minutes
    act(() => {
      vi.advanceTimersByTime(120000);
    });

    // Should have called again
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it('should mark offline on unmount', () => {
    const { unmount } = renderHook(() => useOnlinePresence());

    unmount();

    expect(mockRpc).toHaveBeenCalledWith('mark_user_offline', { p_user_id: 'test-user-123' });
  });

  it('should add and remove beforeunload listener', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlinePresence());

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});
