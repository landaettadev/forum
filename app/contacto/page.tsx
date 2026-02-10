'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageSquare, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function ContactPage() {
  const t = useTranslations('contact');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success(t('messageSent'), {
      description: t('messageSentDesc')
    });

    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8 w-full flex-1">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="forum-text-secondary">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="forum-surface border-[hsl(var(--forum-border))]">
            <CardHeader className="text-center">
              <Mail className="h-10 w-10 mx-auto mb-2 text-[hsl(var(--forum-accent))]" />
              <CardTitle className="text-lg">Email</CardTitle>
            </CardHeader>
            <CardContent className="text-center forum-text-secondary">
              <p>contacto@transforo.com</p>
            </CardContent>
          </Card>

          <Card className="forum-surface border-[hsl(var(--forum-border))]">
            <CardHeader className="text-center">
              <Clock className="h-10 w-10 mx-auto mb-2 text-[hsl(var(--forum-accent))]" />
              <CardTitle className="text-lg">{t('responseTime')}</CardTitle>
            </CardHeader>
            <CardContent className="text-center forum-text-secondary">
              <p>{t('responseTimeValue')}</p>
            </CardContent>
          </Card>

          <Card className="forum-surface border-[hsl(var(--forum-border))]">
            <CardHeader className="text-center">
              <Shield className="h-10 w-10 mx-auto mb-2 text-[hsl(var(--forum-accent))]" />
              <CardTitle className="text-lg">{t('prioritySupport')}</CardTitle>
            </CardHeader>
            <CardContent className="text-center forum-text-secondary">
              <p>{t('prioritySupportDesc')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="forum-surface border-[hsl(var(--forum-border))]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('sendMessage')}
              </CardTitle>
              <CardDescription>
                {t('formDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('name')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-[hsl(var(--forum-surface-alt))] border-[hsl(var(--forum-border))]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="bg-[hsl(var(--forum-surface-alt))] border-[hsl(var(--forum-border))]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">{t('subject')}</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="bg-[hsl(var(--forum-surface-alt))] border-[hsl(var(--forum-border))]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t('message')}</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    className="bg-[hsl(var(--forum-surface-alt))] border-[hsl(var(--forum-border))]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))] text-white"
                >
                  {isSubmitting ? t('sending') : t('sendBtn')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader>
                <CardTitle>{t('beforeContact')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 forum-text-secondary">
                <p>
                  {t('beforeContactDesc1')}{' '}
                  <a href="/faq" className="text-[hsl(var(--forum-accent))]">
                    {t('faq')}
                  </a>{' '}
                  {t('beforeContactDesc2')}
                </p>
                <p>
                  {t('moderationNote')}
                </p>
              </CardContent>
            </Card>

            <Card className="forum-surface border-[hsl(var(--forum-border))]">
              <CardHeader>
                <CardTitle>{t('queryTypes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 forum-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="text-[hsl(var(--forum-accent))]">•</span>
                    {t('queryType1')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[hsl(var(--forum-accent))]">•</span>
                    {t('queryType2')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[hsl(var(--forum-accent))]">•</span>
                    {t('queryType3')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[hsl(var(--forum-accent))]">•</span>
                    {t('queryType4')}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[hsl(var(--forum-accent))]">•</span>
                    {t('queryType5')}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
