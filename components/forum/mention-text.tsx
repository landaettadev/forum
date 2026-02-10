'use client';

import Link from 'next/link';
import { parseMentions } from '@/lib/mentions';

type MentionTextProps = {
  content: string;
  className?: string;
};

export function MentionText({ content, className = '' }: MentionTextProps) {
  const segments = parseMentions(content);

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'mention') {
          return (
            <Link
              key={index}
              href={`/usuaria/${segment.username}`}
              className="text-[hsl(var(--forum-accent))] hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              @{segment.username}
            </Link>
          );
        }
        return <span key={index}>{segment.content}</span>;
      })}
    </span>
  );
}
