'use client';

import { useEffect, useRef } from 'react';

/**
 * Client component that applies syntax highlighting to all <pre><code> blocks
 * within the given container using highlight.js loaded from CDN.
 */
export function CodeHighlight({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const codeBlocks = ref.current.querySelectorAll('pre code');
    if (codeBlocks.length === 0) return;

    // Dynamically load highlight.js from CDN only when needed
    const loadAndHighlight = async () => {
      if (!(window as any).hljs) {
        // Load CSS
        if (!document.querySelector('link[href*="highlight.js"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
          document.head.appendChild(link);
        }

        // Load JS
        await new Promise<void>((resolve, reject) => {
          if ((window as any).hljs) { resolve(); return; }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
      }

      // Highlight all code blocks in this container
      const hljs = (window as any).hljs;
      if (hljs) {
        codeBlocks.forEach((block) => {
          hljs.highlightElement(block);
        });
      }
    };

    loadAndHighlight().catch(() => {
      // Silently fail — code blocks just won't be highlighted
    });
  }, [content]);

  return <div ref={ref} />;
}
