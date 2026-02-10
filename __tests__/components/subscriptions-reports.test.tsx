import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubscribeButton } from '@/components/forum/subscribe-button';
import { ReportButton } from '@/components/forum/report-button';

// Mock supabase
const mockRpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

// Mock auth context
const mockUser = { id: 'test-user-123' };
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

describe('SubscribeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check subscription status on mount', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<SubscribeButton threadId="thread-123" />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('is_subscribed_to_thread', {
        p_thread_id: 'thread-123',
        p_user_id: 'test-user-123',
      });
    });
  });

  it('should show bell-off icon when not subscribed', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<SubscribeButton threadId="thread-123" />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  it('should show filled bell icon when subscribed', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    render(<SubscribeButton threadId="thread-123" />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-[hsl(var(--forum-accent))]');
    });
  });

  it('should toggle subscription on click', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: false, error: null }) // initial check
      .mockResolvedValueOnce({ data: { success: true, subscribed: true }, error: null }); // toggle

    render(<SubscribeButton threadId="thread-123" />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('toggle_thread_subscription', {
        p_thread_id: 'thread-123',
        p_user_id: 'test-user-123',
      });
    });
  });

  it('should show label when showLabel is true', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<SubscribeButton threadId="thread-123" showLabel />);

    await waitFor(() => {
      expect(screen.getByText('Suscribirse')).toBeInTheDocument();
    });
  });

  it('should show "Suscrito" when subscribed and showLabel is true', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    render(<SubscribeButton threadId="thread-123" showLabel />);

    await waitFor(() => {
      expect(screen.getByText('Suscrito')).toBeInTheDocument();
    });
  });
});

describe('ReportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render report button', () => {
    render(<ReportButton targetType="post" targetId="post-123" />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should open dialog when clicked', async () => {
    render(<ReportButton targetType="post" targetId="post-123" />);
    
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Reportar publicación')).toBeInTheDocument();
    });
  });

  it('should show all report reasons', async () => {
    render(<ReportButton targetType="post" targetId="post-123" />);
    
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Selecciona un motivo')).toBeInTheDocument();
    });
  });

  it('should submit report with valid data', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    render(<ReportButton targetType="post" targetId="post-123" />);
    
    // Open dialog
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Reportar publicación')).toBeInTheDocument();
    });

    // Select reason - click on the select trigger
    const selectTrigger = screen.getByText('Selecciona un motivo');
    fireEvent.click(selectTrigger);

    // Wait for dropdown and select spam
    await waitFor(() => {
      const spamOption = screen.getByText('Spam');
      fireEvent.click(spamOption);
    });

    // Add description
    const descriptionInput = screen.getByPlaceholderText('Proporciona más detalles sobre el problema...');
    fireEvent.change(descriptionInput, { target: { value: 'This is spam content' } });

    // Submit
    const submitButton = screen.getByText('Enviar reporte');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('create_report', {
        p_target_type: 'post',
        p_target_id: 'post-123',
        p_reason: 'spam',
        p_description: 'This is spam content',
      });
    });
  });

  it('should show error when already reported', async () => {
    const { toast } = await import('sonner');
    mockRpc.mockResolvedValue({ data: { success: false, error: 'Already reported' }, error: null });

    render(<ReportButton targetType="post" targetId="post-123" />);
    
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Reportar publicación')).toBeInTheDocument();
    });

    // Select reason
    const selectTrigger = screen.getByText('Selecciona un motivo');
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      const spamOption = screen.getByText('Spam');
      fireEvent.click(spamOption);
    });

    // Submit
    const submitButton = screen.getByText('Enviar reporte');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Ya has reportado este contenido');
    });
  });

  it('should have submit button disabled initially without reason', async () => {
    render(<ReportButton targetType="post" targetId="post-123" />);
    
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Reportar publicación')).toBeInTheDocument();
    });

    // Submit button should be present
    const submitButton = screen.getByText('Enviar reporte');
    expect(submitButton).toBeInTheDocument();
  });

  it('should show correct label for thread target type', async () => {
    render(<ReportButton targetType="thread" targetId="thread-123" />);
    
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('Reportar hilo')).toBeInTheDocument();
    });
  });

  it('should show correct label for user target type', async () => {
    render(<ReportButton targetType="user" targetId="user-123" />);
    
    // Find the trigger button specifically (not the dialog buttons)
    const triggerButton = screen.getByRole('button');
    fireEvent.click(triggerButton);
    
    await waitFor(() => {
      expect(screen.getByText('Reportar usuario')).toBeInTheDocument();
    });
  });
});
