'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
}

interface TenorGif {
  id: string;
  media_formats: {
    gif: { url: string };
    tinygif: { url: string };
  };
  content_description: string;
}

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY || '';

export function GifPicker({ onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Load trending on mount
  useEffect(() => {
    if (!TENOR_API_KEY) return;
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    if (!TENOR_API_KEY) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20&media_filter=gif,tinygif`
      );
      const data = await res.json();
      setGifs(data.results || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = useCallback(async () => {
    if (!query.trim() || !TENOR_API_KEY) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `https://tenor.googleapis.com/v2/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=20&media_filter=gif,tinygif`
      );
      const data = await res.json();
      setGifs(data.results || []);
    } catch {
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  if (!TENOR_API_KEY) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        GIF picker no disponible (falta API key de Tenor)
      </div>
    );
  }

  return (
    <div className="w-80">
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Buscar GIFs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchGifs()}
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8 px-3" onClick={searchGifs} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1 max-h-[300px] overflow-y-auto">
        {gifs.map((gif) => (
          <button
            key={gif.id}
            className="relative rounded overflow-hidden hover:ring-2 hover:ring-[hsl(var(--forum-accent))] transition-all"
            onClick={() => onSelect(gif.media_formats.gif?.url || gif.media_formats.tinygif?.url)}
            title={gif.content_description}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gif.media_formats.tinygif?.url || gif.media_formats.gif?.url}
              alt={gif.content_description}
              className="w-full h-24 object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {gifs.length === 0 && searched && !loading && (
        <p className="text-center text-xs text-muted-foreground py-4">No se encontraron GIFs</p>
      )}

      <div className="text-center mt-2">
        <span className="text-[10px] text-muted-foreground">Powered by Tenor</span>
      </div>
    </div>
  );
}
