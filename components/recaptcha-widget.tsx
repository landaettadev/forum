'use client';

import { useEffect, useState } from 'react';

interface RecaptchaProps {
  onVerify: (token: string | null) => void;
  className?: string;
  action?: string;
}

export function RecaptchaWidget({ onVerify, className, action = 'submit' }: RecaptchaProps) {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      setError('NEXT_PUBLIC_RECAPTCHA_SITE_KEY not configured');
      return;
    }

    if (document.querySelector('script[src*="recaptcha/api.js"]')) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setLoaded(true);
    };
    
    script.onerror = () => {
      setError('Failed to load reCAPTCHA');
    };

    document.head.appendChild(script);
  }, [siteKey]);

  // Execute reCAPTCHA when loaded
  useEffect(() => {
    if (!loaded || !siteKey) return;
    
    if (window.grecaptcha) {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(siteKey, { action }).then((token: string) => {
          onVerify(token);
        }).catch((err: Error) => {
          console.error('reCAPTCHA error:', err);
          setError('Error executing reCAPTCHA');
        });
      });
    }
  }, [loaded, siteKey, action, onVerify]);

  if (error) {
    return (
      <div className={`${className} p-3 border border-red-500 rounded bg-red-50 text-red-700 text-sm`}>
        <strong>reCAPTCHA Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        {loaded ? 'Protegido por reCAPTCHA v3' : 'Cargando reCAPTCHA...'}
      </div>
    </div>
  );
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}
