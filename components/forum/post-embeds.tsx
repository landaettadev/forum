'use client';

import { useMemo } from 'react';

const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})(?:[&?][\w=]*)?/g;
const TWITTER_REGEX = /(?:https?:\/\/)?(?:(?:twitter|x)\.com)\/(?:\w+)\/status\/(\d+)/g;
const TIKTOK_REGEX = /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/g;

interface EmbedMatch {
  type: 'youtube' | 'twitter' | 'tiktok';
  id: string;
  originalUrl: string;
}

function extractEmbeds(html: string): EmbedMatch[] {
  const embeds: EmbedMatch[] = [];
  const seen = new Set<string>();

  // Strip HTML tags for URL matching
  const text = html.replace(/<[^>]*>/g, ' ');

  let match;

  YOUTUBE_REGEX.lastIndex = 0;
  while ((match = YOUTUBE_REGEX.exec(text)) !== null) {
    const key = `youtube-${match[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      embeds.push({ type: 'youtube', id: match[1], originalUrl: match[0] });
    }
  }

  TWITTER_REGEX.lastIndex = 0;
  while ((match = TWITTER_REGEX.exec(text)) !== null) {
    const key = `twitter-${match[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      embeds.push({ type: 'twitter', id: match[1], originalUrl: match[0] });
    }
  }

  TIKTOK_REGEX.lastIndex = 0;
  while ((match = TIKTOK_REGEX.exec(text)) !== null) {
    const key = `tiktok-${match[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      embeds.push({ type: 'tiktok', id: match[1], originalUrl: match[0] });
    }
  }

  return embeds;
}

function YouTubeEmbed({ id }: { id: string }) {
  return (
    <div className="relative w-full max-w-[560px] aspect-video rounded-lg overflow-hidden my-3">
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        loading="lazy"
      />
    </div>
  );
}

function TwitterEmbed({ id }: { id: string }) {
  return (
    <div className="my-3 max-w-[550px]">
      <blockquote className="twitter-tweet" data-theme="dark">
        <a href={`https://twitter.com/i/status/${id}`}>Loading tweet...</a>
      </blockquote>
      <script async src="https://platform.twitter.com/widgets.js" />
    </div>
  );
}

function TikTokEmbed({ id }: { id: string }) {
  return (
    <div className="my-3 max-w-[325px]">
      <iframe
        src={`https://www.tiktok.com/embed/v2/${id}`}
        className="w-full min-h-[575px] rounded-lg"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

interface PostEmbedsProps {
  content: string;
}

export function PostEmbeds({ content }: PostEmbedsProps) {
  const embeds = useMemo(() => extractEmbeds(content), [content]);

  if (embeds.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {embeds.map((embed, i) => {
        switch (embed.type) {
          case 'youtube':
            return <YouTubeEmbed key={`yt-${embed.id}-${i}`} id={embed.id} />;
          case 'twitter':
            return <TwitterEmbed key={`tw-${embed.id}-${i}`} id={embed.id} />;
          case 'tiktok':
            return <TikTokEmbed key={`tt-${embed.id}-${i}`} id={embed.id} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
