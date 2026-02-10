import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReputationBadge, ReputationProgress } from '@/components/user/reputation-badge';
import { ProfileStats } from '@/components/user/profile-stats';
import { OnlineUsersWidget } from '@/components/layout/online-users-widget';
import { LeaderboardWidget } from '@/components/layout/leaderboard-widget';
import { generateMockProfileStats } from '../lib/supabase-mock';

// Mock supabase
const mockRpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ReputationBadge', () => {
  it('should display reputation points', () => {
    render(<ReputationBadge reputation={500} level="trusted" />);
    
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('should show correct level icon for newbie', () => {
    render(<ReputationBadge reputation={10} level="newbie" />);
    
    expect(screen.getByText('🌱')).toBeInTheDocument();
  });

  it('should show correct level icon for member', () => {
    render(<ReputationBadge reputation={100} level="member" />);
    
    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  it('should show correct level icon for active', () => {
    render(<ReputationBadge reputation={300} level="active" />);
    
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('should show correct level icon for trusted', () => {
    render(<ReputationBadge reputation={600} level="trusted" />);
    
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should show correct level icon for expert', () => {
    render(<ReputationBadge reputation={1500} level="expert" />);
    
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('should show correct level icon for master', () => {
    render(<ReputationBadge reputation={3000} level="master" />);
    
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  it('should show correct level icon for legend', () => {
    render(<ReputationBadge reputation={6000} level="legend" />);
    
    expect(screen.getByText('👑')).toBeInTheDocument();
  });

  it('should hide points when showPoints is false', () => {
    render(<ReputationBadge reputation={500} level="trusted" showPoints={false} />);
    
    expect(screen.queryByText('500')).not.toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should apply correct size class', () => {
    const { container } = render(<ReputationBadge reputation={500} level="trusted" size="lg" />);
    
    expect(container.firstChild).toHaveClass('text-base');
  });
});

describe('ReputationProgress', () => {
  it('should show progress towards next level', () => {
    render(<ReputationProgress reputation={100} level="member" />);
    
    // Should show current and next level
    expect(screen.getByText(/Miembro/)).toBeInTheDocument();
    expect(screen.getByText(/Activo/)).toBeInTheDocument();
  });

  it('should show max level message when at legend', () => {
    render(<ReputationProgress reputation={6000} level="legend" />);
    
    expect(screen.getByText(/Nivel máximo alcanzado/)).toBeInTheDocument();
  });

  it('should show points progress', () => {
    render(<ReputationProgress reputation={150} level="member" />);
    
    // Should show current points and target
    expect(screen.getByText(/150/)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument(); // Next level threshold
  });
});

describe('ProfileStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and display profile stats', async () => {
    const mockStats = generateMockProfileStats({
      posts_count: 42,
      threads_count: 10,
      reputation: 500,
      reputation_level: 'trusted',
    });

    mockRpc.mockResolvedValue({ data: mockStats, error: null });

    render(<ProfileStats userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument(); // posts
      expect(screen.getByText('10')).toBeInTheDocument(); // threads
    });

    expect(mockRpc).toHaveBeenCalledWith('get_profile_stats', { p_user_id: 'user-123' });
  });

  it('should show loading state', () => {
    mockRpc.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ProfileStats userId="user-123" />);

    // Should show loading skeleton (animate-pulse elements)
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should display compact view', async () => {
    const mockStats = generateMockProfileStats();
    mockRpc.mockResolvedValue({ data: mockStats, error: null });

    render(<ProfileStats userId="user-123" compact />);

    await waitFor(() => {
      // Compact view should not show all stat boxes
      expect(screen.queryByText('Visitas al perfil')).not.toBeInTheDocument();
    });
  });

  it('should display all stats in full view', async () => {
    const mockStats = generateMockProfileStats({
      followers_count: 25,
      following_count: 30,
      profile_views: 1234,
    });
    mockRpc.mockResolvedValue({ data: mockStats, error: null });

    render(<ProfileStats userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('Seguidores')).toBeInTheDocument();
      expect(screen.getByText('Siguiendo')).toBeInTheDocument();
      expect(screen.getByText('Visitas al perfil')).toBeInTheDocument();
    });
  });
});

describe('OnlineUsersWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and display online users', async () => {
    const mockUsers = [
      { user_id: 'user-1', username: 'alice', avatar_url: null, last_seen_at: new Date().toISOString(), is_online: true },
      { user_id: 'user-2', username: 'bob', avatar_url: null, last_seen_at: new Date().toISOString(), is_online: true },
    ];

    // Mock RPC to return users data and count based on function name
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_online_users') {
        return Promise.resolve({ data: mockUsers, error: null });
      }
      if (name === 'get_online_users_count') {
        return Promise.resolve({ data: 2, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(<OnlineUsersWidget />);

    await waitFor(() => {
      expect(screen.getByText('Usuarios en línea')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('should display online count', async () => {
    const mockUsers = [
      { user_id: 'user-1', username: 'alice', avatar_url: null, last_seen_at: new Date().toISOString(), is_online: true },
    ];

    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_online_users') {
        return Promise.resolve({ data: mockUsers, error: null });
      }
      if (name === 'get_online_users_count') {
        return Promise.resolve({ data: 5, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(<OnlineUsersWidget />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('should show empty state when no users online', async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === 'get_online_users') {
        return Promise.resolve({ data: [], error: null });
      }
      if (name === 'get_online_users_count') {
        return Promise.resolve({ data: 0, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    render(<OnlineUsersWidget />);

    await waitFor(() => {
      expect(screen.getByText(/No hay usuarios conectados/i)).toBeInTheDocument();
    });
  });
});

describe('LeaderboardWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and display leaderboard', async () => {
    const mockLeaderboard = [
      { user_id: 'user-1', username: 'top1', avatar_url: null, reputation: 5000, reputation_level: 'legend' },
      { user_id: 'user-2', username: 'top2', avatar_url: null, reputation: 3000, reputation_level: 'master' },
      { user_id: 'user-3', username: 'top3', avatar_url: null, reputation: 1500, reputation_level: 'expert' },
    ];

    mockRpc.mockResolvedValue({ data: mockLeaderboard, error: null });

    render(<LeaderboardWidget />);

    await waitFor(() => {
      expect(screen.getByText('top1')).toBeInTheDocument();
      expect(screen.getByText('top2')).toBeInTheDocument();
      expect(screen.getByText('top3')).toBeInTheDocument();
    });
  });

  it('should display rank icons', async () => {
    const mockLeaderboard = [
      { user_id: 'user-1', username: 'first', avatar_url: null, reputation: 5000, reputation_level: 'legend' },
      { user_id: 'user-2', username: 'second', avatar_url: null, reputation: 3000, reputation_level: 'master' },
      { user_id: 'user-3', username: 'third', avatar_url: null, reputation: 1500, reputation_level: 'expert' },
    ];

    mockRpc.mockResolvedValue({ data: mockLeaderboard, error: null });

    render(<LeaderboardWidget />);

    await waitFor(() => {
      expect(screen.getByText('🥇')).toBeInTheDocument();
      expect(screen.getByText('🥈')).toBeInTheDocument();
      expect(screen.getByText('🥉')).toBeInTheDocument();
    });
  });

  it('should show empty state when no data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    render(<LeaderboardWidget />);

    await waitFor(() => {
      expect(screen.getByText(/Sin datos de reputación/i)).toBeInTheDocument();
    });
  });

  it('should call RPC with correct limit', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    render(<LeaderboardWidget />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_reputation_leaderboard', { p_limit: 5 });
    });
  });
});
