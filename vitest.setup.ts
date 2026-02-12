/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extender matchers de jest-dom
expect.extend(matchers);

// Cleanup después de cada test
afterEach(() => {
  cleanup();
});

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock de next-intl (evita errores por falta de NextIntlClientProvider en tests)
// y retorna traducciones reales (es) para que los tests puedan afirmar textos.
vi.mock('next-intl', async () => {
  const esMessages = (await import('./messages/es.json')).default as Record<string, any>;

  const interpolate = (message: unknown, values?: Record<string, any>) => {
    if (typeof message !== 'string') return undefined;
    if (!values) return message;
    return message.replace(/\{(\w+)\}/g, (_match, key) => {
      const value = values[key];
      return value === undefined || value === null ? `{${key}}` : String(value);
    });
  };

  return {
    useLocale: () => 'es',
    useTranslations: (namespace?: string) => (key: string, values?: Record<string, any>) => {
      if (!namespace) return key;
      const msg = esMessages?.[namespace]?.[key];
      return interpolate(msg, values) ?? msg ?? key;
    },
    NextIntlClientProvider: ({ children }: { children: any }) => children,
  };
});

// Mock de Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  },
}));
