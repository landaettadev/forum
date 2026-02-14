'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { getDateFnsLocale } from '@/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';
import { History, Loader2, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

type EditHistoryEntry = {
  id: string;
  editor_username: string;
  editor_avatar: string | null;
  previous_content: string;
  new_content: string;
  edit_reason: string | null;
  created_at: string;
};

type EditHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
};

export function EditHistoryModal({ isOpen, onClose, postId }: EditHistoryModalProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const tc = useTranslations('common');
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<EditHistoryEntry | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_post_edit_history', { p_post_id: postId });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching edit history:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (isOpen && postId) {
      fetchHistory();
    }
  }, [isOpen, postId, fetchHistory]);

  // Simple diff highlighting
  const _highlightDiff = (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    
    return {
      removed: oldLines,
      added: newLines
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de ediciones
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 forum-text-muted">
            Este post no tiene historial de ediciones
          </div>
        ) : (
          <div className="space-y-4">
            {/* Edit history list */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {history.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedEntry?.id === entry.id
                        ? 'border-[hsl(var(--forum-accent))] bg-[hsl(var(--forum-accent))]/5'
                        : 'border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))]/50'
                    }`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={entry.editor_avatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {entry.editor_username?.substring(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {entry.editor_username || tc('deletedUser')}
                        </span>
                      </div>
                      <span className="text-xs forum-text-muted">
                        {formatDistanceToNow(new Date(entry.created_at), { 
                          addSuffix: true, 
                          locale: dateLocale 
                        })}
                      </span>
                    </div>
                    
                    <div className="text-xs forum-text-muted">
                      {tc('editNumber', { num: history.length - index })}
                      {entry.edit_reason && (
                        <span className="ml-2">• {tc('editReason', { reason: entry.edit_reason })}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Selected edit diff view */}
            {selectedEntry && (
              <div className="border-t border-[hsl(var(--forum-border))] pt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  Cambios en esta edición
                  <ArrowRight className="h-4 w-4" />
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-red-500 mb-1">Antes</div>
                    <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-sm max-h-40 overflow-auto">
                      <pre className="whitespace-pre-wrap text-xs">
                        {selectedEntry.previous_content}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-green-500 mb-1">Después</div>
                    <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-sm max-h-40 overflow-auto">
                      <pre className="whitespace-pre-wrap text-xs">
                        {selectedEntry.new_content}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
