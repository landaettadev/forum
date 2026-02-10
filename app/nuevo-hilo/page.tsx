'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createThread } from './actions';
import { AlertTriangle, Loader2, BarChart3, Plus, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const RichTextEditor = dynamic(
  () => import('@/components/editor/rich-text-editor'),
  { 
    ssr: false,
    loading: () => (
      <div className="border border-[hsl(var(--forum-border))] rounded-lg p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
      </div>
    )
  }
);

export default function NuevoHiloPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </div>
    }>
      <NuevoHiloContent />
    </Suspense>
  );
}

function NuevoHiloContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const t = useTranslations('thread');
  const tCommon = useTranslations('common');
  const tEditor = useTranslations('editor');
  const tForum = useTranslations('forum');
  const [loading, setLoading] = useState(false);
  const [forums, setForums] = useState<any[]>([]);
  const [selectedForum, setSelectedForum] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isNsfw, setIsNsfw] = useState(false);
  const [tag, setTag] = useState<'review' | 'ask' | 'general' | ''>('');
  const [selectedRegion, setSelectedRegion] = useState('');
  
  // Poll state
  const [includePoll, setIncludePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollShowResults, setPollShowResults] = useState(false);
  const tPoll = useTranslations('poll');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchForums = async () => {
      const { data, error } = await supabase
        .from('forums')
        .select('id, name, slug')
        .order('display_order');

      if (error) {
        console.error('Error fetching forums:', error);
      }

      if (data && data.length > 0) {
        setForums(data);
        // Auto-select first forum if none was provided via URL
        if (!searchParams?.get('foro')) {
          setSelectedForum(data[0].id);
        }
      }
    };

    fetchForums();

    const forumId = searchParams?.get('foro');
    if (forumId) {
      setSelectedForum(forumId);
    }

    const regionParam = searchParams?.get('region');
    if (regionParam) {
      setSelectedRegion(regionParam);
    }
  }, [user, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile) {
      toast.error(t('loginRequired'));
      return;
    }

    if (title.length < 5) {
      toast.error(t('titleMinError'));
      return;
    }

    if (content.length < 10) {
      toast.error(t('contentMinError'));
      return;
    }

    const forumToUse = selectedForum || (forums.length > 0 ? forums[0].id : '');

    if (!tag) {
      toast.error(tForum('selectTagPlaceholder'));
      return;
    }

    setLoading(true);

    try {
      const result = await createThread({
        forumId: forumToUse || undefined,
        title,
        content,
        authorId: user.id,
        tag: tag || 'general',
        regionId: selectedRegion || undefined,
      });

      if (result.success && result.threadId) {
        // Create poll if included
        if (includePoll && pollQuestion.trim()) {
          const validOptions = pollOptions.filter(o => o.trim());
          if (validOptions.length >= 2) {
            await supabase.rpc('create_poll', {
              p_thread_id: result.threadId,
              p_question: pollQuestion.trim(),
              p_options: validOptions,
              p_user_id: user.id,
              p_allow_multiple: pollAllowMultiple,
              p_show_results_before_vote: pollShowResults,
              p_ends_at: null
            });
          }
        }
        
        toast.success(t('createSuccess'));
        router.push(`/hilo/${result.threadId}`);
      } else {
        toast.error(t('createError'), {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 w-full">
        <Breadcrumbs items={[{ label: t('createTitle') }]} />

        <div className="flex gap-6">
          <main className="flex-1">
            <Card>
              <CardHeader>
                <CardTitle>{t('createTitle')}</CardTitle>
                <CardDescription>
                  {t('createDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Tag Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="tag">{tForum('selectTag')} *</Label>
                    <Select
                      value={tag}
                      onValueChange={(value: 'review' | 'ask' | 'general') => setTag(value)}
                      disabled={loading}
                    >
                      <SelectTrigger id="tag">
                        <SelectValue placeholder={tForum('selectTagPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="review">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">⭐</span>
                            {tForum('tagReview')}
                          </div>
                        </SelectItem>
                        <SelectItem value="ask">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">❓</span>
                            {tForum('tagAsk')}
                          </div>
                        </SelectItem>
                        <SelectItem value="general">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">💬</span>
                            {tForum('tagGeneral')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">{t('titleLabel')} *</Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder={t('titlePlaceholder')}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={loading}
                      required
                      minLength={5}
                      className="text-lg"
                    />
                    <p className="text-xs forum-text-muted">
                      {t('minTitleHint')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('contentLabel')} *</Label>
                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder={t('contentPlaceholder')}
                      userId={user?.id}
                      minHeight="600px"
                      disabled={loading}
                    />
                    <p className="text-xs forum-text-muted">
                      {t('minContentHint')}
                    </p>
                  </div>

                  {/* Poll Section */}
                  <div className="space-y-4 p-4 bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))] rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
                        <div>
                          <Label htmlFor="include-poll" className="cursor-pointer">{tPoll('createPoll')}</Label>
                          <p className="text-xs forum-text-muted">{t('pollDescription')}</p>
                        </div>
                      </div>
                      <Switch
                        id="include-poll"
                        checked={includePoll}
                        onCheckedChange={setIncludePoll}
                        disabled={loading}
                      />
                    </div>

                    {includePoll && (
                      <div className="space-y-4 pt-4 border-t border-[hsl(var(--forum-border))]">
                        <div>
                          <Label htmlFor="poll-question">{tPoll('question')}</Label>
                          <Input
                            id="poll-question"
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder={tPoll('questionPlaceholder')}
                            className="mt-1"
                            maxLength={200}
                          />
                        </div>

                        <div>
                          <Label>{tPoll('options')}</Label>
                          <div className="space-y-2 mt-1">
                            {pollOptions.map((option, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...pollOptions];
                                    newOptions[index] = e.target.value;
                                    setPollOptions(newOptions);
                                  }}
                                  placeholder={`${tPoll('option')} ${index + 1}`}
                                  maxLength={100}
                                />
                                {pollOptions.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 flex-shrink-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          {pollOptions.length < 10 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setPollOptions([...pollOptions, ''])}
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {tPoll('addOption')}
                            </Button>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              id="poll-multiple"
                              checked={pollAllowMultiple}
                              onCheckedChange={setPollAllowMultiple}
                            />
                            <Label htmlFor="poll-multiple" className="text-sm cursor-pointer">
                              {tPoll('allowMultiple')}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="poll-results"
                              checked={pollShowResults}
                              onCheckedChange={setPollShowResults}
                            />
                            <Label htmlFor="poll-results" className="text-sm cursor-pointer">
                              {tPoll('showResultsBeforeVote')}
                            </Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* NSFW Toggle */}
                  <div className="flex items-center justify-between p-4 bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))] rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div>
                        <Label htmlFor="nsfw" className="cursor-pointer">{t('nsfwLabel')}</Label>
                        <p className="text-xs forum-text-muted">{t('nsfwDescription')}</p>
                      </div>
                    </div>
                    <Switch
                      id="nsfw"
                      checked={isNsfw}
                      onCheckedChange={setIsNsfw}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-[hsl(var(--forum-border))]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={loading}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
                    >
                      {loading ? t('publishing') : t('publish')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
