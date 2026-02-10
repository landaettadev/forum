# Test Suite - Forum Features

Este directorio contiene las pruebas automatizadas para todas las funcionalidades del foro.

## Estructura

```
__tests__/
├── components/           # Tests de componentes React
│   ├── notifications.test.tsx
│   ├── reactions.test.tsx
│   ├── follow-block.test.tsx
│   ├── polls.test.tsx
│   ├── subscriptions-reports.test.tsx
│   ├── messages.test.tsx
│   ├── profile-reputation.test.tsx
│   └── online-status.test.tsx
├── integration/          # Tests de integración
│   └── rpc-functions.test.ts
└── lib/                  # Utilidades y mocks
    ├── supabase-mock.ts
    ├── validation.test.ts
    └── sanitize.test.ts
```

## Comandos

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con UI interactiva
npm run test:ui

# Ejecutar tests con coverage
npm run test:coverage
```

## Cobertura de Tests

### Componentes UI

| Componente | Archivo Test | Casos |
|------------|--------------|-------|
| NotificationList | `notifications.test.tsx` | Loading, display, mark read, empty state |
| NotificationBell | `notifications.test.tsx` | Unread count, mark all read |
| PostReactions | `reactions.test.tsx` | Fetch, toggle, optimistic updates |
| FollowButton | `follow-block.test.tsx` | Check status, toggle, callbacks |
| BlockButton | `follow-block.test.tsx` | Check status, confirmation dialog |
| PollDisplay | `polls.test.tsx` | Fetch, vote, results, closed state |
| PollCreator | `polls.test.tsx` | Create, validate, options |
| SubscribeButton | `subscriptions-reports.test.tsx` | Toggle subscription |
| ReportButton | `subscriptions-reports.test.tsx` | Dialog, submit, validation |
| ConversationList | `messages.test.tsx` | Fetch, display, select |
| ChatView | `messages.test.tsx` | Messages, send, realtime |
| ReputationBadge | `profile-reputation.test.tsx` | Levels, icons, sizes |
| ProfileStats | `profile-reputation.test.tsx` | Fetch stats, display |
| OnlineIndicator | `online-status.test.tsx` | Status indicators |
| useOnlinePresence | `online-status.test.tsx` | Presence tracking |

### Funciones RPC (Backend)

| Función | Casos de Test |
|---------|---------------|
| `get_profile_stats` | Returns all required fields |
| `update_user_presence` | Updates presence |
| `mark_user_offline` | Marks offline |
| `get_online_users` | Returns user list |
| `get_online_users_count` | Returns count |
| `get_reputation_leaderboard` | Returns ranked users |
| `add_reputation` | Updates reputation |
| `get_user_notifications` | Returns notifications |
| `mark_notification_read` | Marks as read |
| `mark_all_notifications_read` | Marks all read |
| `toggle_thread_subscription` | Toggle subscription |
| `is_subscribed_to_thread` | Check subscription |
| `create_report` | Create report |
| `toggle_user_follow` | Toggle follow |
| `is_following_user` | Check follow |
| `toggle_user_block` | Toggle block |
| `is_user_blocked` | Check block |
| `get_post_reactions` | Get reactions |
| `toggle_reaction` | Toggle reaction |
| `get_poll_with_results` | Get poll data |
| `vote_on_poll` | Submit vote |
| `create_poll` | Create poll |
| `get_user_conversations` | Get conversations |
| `send_private_message` | Send message |
| `mark_conversation_read` | Mark read |

## Mocks

### Supabase Mock (`lib/supabase-mock.ts`)

Proporciona helpers para mockear el cliente de Supabase:

```typescript
import { createMockSupabase, mockUser, generateMockNotification } from '../lib/supabase-mock';

// Crear mock de supabase
const { supabase, mocks } = createMockSupabase();

// Usar generadores de datos
const notification = generateMockNotification({ title: 'Test' });
const conversation = generateMockConversation({ unread_count: 5 });
const reaction = generateMockReaction({ count: 10 });
const poll = generateMockPoll({ user_voted: true });
const stats = generateMockProfileStats({ reputation: 500 });
```

## Escribir Nuevos Tests

### Test de Componente

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyComponent } from '@/components/my-component';

// Mock supabase
const mockRpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args) => mockRpc(...args) },
}));

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    
    render(<MyComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });
});
```

### Test de RPC

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('My RPC Function', () => {
  it('should return expected data', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ 
      data: { success: true }, 
      error: null 
    });

    const result = await mockRpc('my_function', { param: 'value' });

    expect(result.data.success).toBe(true);
  });
});
```

## CI/CD

Los tests se ejecutan automáticamente en:
- Pull Requests
- Push a main/develop
- Deploy previews

## Troubleshooting

### Tests fallan con "Cannot find module"
```bash
npm install
```

### Tests de componentes fallan con DOM errors
Asegúrate de que `vitest.setup.ts` incluye el cleanup:
```typescript
afterEach(() => {
  cleanup();
});
```

### Mocks no funcionan
Verifica que los mocks estén antes de los imports del componente:
```typescript
vi.mock('@/lib/supabase', () => ({ ... })); // ✅ Correcto

import { MyComponent } from '@/components/my-component';
```
