'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { 
  Mail, Shield, ShieldCheck, Crown, BadgeCheck, Gem, Star, 
  Award, ThumbsUp, MessageSquare, Calendar, Flame, Heart,
  Users, TrendingUp, Sparkles, Trophy, Medal, Zap, Info,
  CheckCircle, Target, Gift
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeDef = {
  nameKey: string; descKey: string; reqKey: string;
  icon: LucideIcon; colorClass: string; automatic: boolean;
};
type CategoryDef = {
  nameKey: string; descKey: string; icon: LucideIcon; badges: BadgeDef[];
};

const BADGE_CATEGORIES: CategoryDef[] = [
  { nameKey:'catSystem', descKey:'catSystemDesc', icon:CheckCircle, badges:[
    { nameKey:'emailVerified', descKey:'emailVerifiedDesc', reqKey:'emailVerifiedReq', icon:Mail, colorClass:'bg-sky-500', automatic:true },
  ]},
  { nameKey:'catRoles', descKey:'catRolesDesc', icon:Shield, badges:[
    { nameKey:'admin', descKey:'adminDesc', reqKey:'adminReq', icon:Crown, colorClass:'bg-gradient-to-r from-red-500 to-orange-500', automatic:false },
    { nameKey:'superMod', descKey:'superModDesc', reqKey:'superModReq', icon:ShieldCheck, colorClass:'bg-gradient-to-r from-purple-500 to-pink-500', automatic:false },
    { nameKey:'moderator', descKey:'moderatorDesc', reqKey:'moderatorReq', icon:Shield, colorClass:'bg-blue-600', automatic:false },
  ]},
  { nameKey:'catVerification', descKey:'catVerificationDesc', icon:BadgeCheck, badges:[
    { nameKey:'verifiedAccount', descKey:'verifiedAccountDesc', reqKey:'verifiedAccountReq', icon:BadgeCheck, colorClass:'bg-gradient-to-r from-blue-500 to-cyan-500', automatic:false },
    { nameKey:'vip', descKey:'vipDesc', reqKey:'vipReq', icon:Star, colorClass:'bg-gradient-to-r from-yellow-400 to-amber-500 text-black', automatic:false },
  ]},
  { nameKey:'catEscort', descKey:'catEscortDesc', icon:Gem, badges:[
    { nameKey:'escort', descKey:'escortDesc', reqKey:'escortReq', icon:Gem, colorClass:'bg-fuchsia-500', automatic:true },
    { nameKey:'escortVerified', descKey:'escortVerifiedDesc', reqKey:'escortVerifiedReq', icon:Gem, colorClass:'bg-gradient-to-r from-fuchsia-500 to-pink-500', automatic:false },
    { nameKey:'escortTopRated', descKey:'escortTopRatedDesc', reqKey:'escortTopRatedReq', icon:Trophy, colorClass:'bg-gradient-to-r from-amber-400 to-yellow-500 text-black', automatic:true },
  ]},
  { nameKey:'catReputation', descKey:'catReputationDesc', icon:ThumbsUp, badges:[
    { nameKey:'trusted', descKey:'trustedDesc', reqKey:'trustedReq', icon:ThumbsUp, colorClass:'bg-green-500', automatic:true },
    { nameKey:'highlyRated', descKey:'highlyRatedDesc', reqKey:'highlyRatedReq', icon:Heart, colorClass:'bg-gradient-to-r from-pink-500 to-rose-500', automatic:true },
    { nameKey:'legendary', descKey:'legendaryDesc', reqKey:'legendaryReq', icon:Flame, colorClass:'bg-gradient-to-r from-orange-500 to-red-500', automatic:true },
  ]},
  { nameKey:'catActivity', descKey:'catActivityDesc', icon:MessageSquare, badges:[
    { nameKey:'activePoster', descKey:'activePosterDesc', reqKey:'activePosterReq', icon:MessageSquare, colorClass:'bg-indigo-500', automatic:true },
    { nameKey:'prolificWriter', descKey:'prolificWriterDesc', reqKey:'prolificWriterReq', icon:Zap, colorClass:'bg-violet-500', automatic:true },
    { nameKey:'threadCreator', descKey:'threadCreatorDesc', reqKey:'threadCreatorReq', icon:TrendingUp, colorClass:'bg-teal-500', automatic:true },
    { nameKey:'veteran', descKey:'veteranDesc', reqKey:'veteranReq', icon:Medal, colorClass:'bg-slate-500', automatic:true },
    { nameKey:'foundingMember', descKey:'foundingMemberDesc', reqKey:'foundingMemberReq', icon:Sparkles, colorClass:'bg-gradient-to-r from-amber-500 to-orange-500', automatic:true },
    { nameKey:'helpful', descKey:'helpfulDesc', reqKey:'helpfulReq', icon:Award, colorClass:'bg-emerald-500', automatic:true },
    { nameKey:'communityPillar', descKey:'communityPillarDesc', reqKey:'communityPillarReq', icon:Users, colorClass:'bg-gradient-to-r from-cyan-500 to-blue-500', automatic:true },
  ]},
];

const POINTS_SYSTEM = [
  { actionKey: 'actionCreateThread', points: 10, icon: TrendingUp },
  { actionKey: 'actionPostReply', points: 2, icon: MessageSquare },
  { actionKey: 'actionReceiveLike', points: 5, icon: ThumbsUp },
  { actionKey: 'actionReceiveThank', points: 3, icon: Gift },
  { actionKey: 'actionHelpfulPost', points: 10, icon: Award },
  { actionKey: 'actionFeaturedThread', points: 25, icon: Star },
];

export default function ReputacionPage() {
  const t = useTranslations('reputationPage');

  return (
    <div className="min-h-screen forum-bg-primary">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: t('breadcrumb') }
          ]}
        />

        <div className="mt-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Trophy className="h-10 w-10 text-yellow-500" />
              {t('title')}
            </h1>
            <p className="text-lg forum-text-secondary max-w-2xl mx-auto">
              {t('description')}
            </p>
          </div>

          <Tabs defaultValue="badges" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
              <TabsTrigger value="badges">
                <Award className="h-4 w-4 mr-2" />
                {t('badgesTab')}
              </TabsTrigger>
              <TabsTrigger value="points">
                <Target className="h-4 w-4 mr-2" />
                {t('pointsTab')}
              </TabsTrigger>
              <TabsTrigger value="faq">
                <Info className="h-4 w-4 mr-2" />
                {t('faqTab')}
              </TabsTrigger>
            </TabsList>

            {/* BADGES TAB */}
            <TabsContent value="badges" className="space-y-6">
              {BADGE_CATEGORIES.map((category, catIdx) => {
                const CategoryIcon = category.icon;
                return (
                  <Card key={catIdx} className="forum-bg-secondary border-[hsl(var(--forum-border))]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CategoryIcon className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
                        {t(category.nameKey)}
                      </CardTitle>
                      <CardDescription>
                        {t(category.descKey)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {category.badges.map((badge, badgeIdx) => {
                          const BadgeIcon = badge.icon;
                          return (
                            <div 
                              key={badgeIdx}
                              className="p-4 rounded-lg forum-bg-primary border border-[hsl(var(--forum-border))] hover:border-[hsl(var(--forum-accent))] transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <Badge className={`${badge.colorClass} px-2 py-1 flex items-center gap-1`}>
                                  <BadgeIcon className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">
                                    {t(badge.nameKey)}
                                  </span>
                                </Badge>
                                {badge.automatic && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                    {t('auto')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm forum-text-secondary mt-2">
                                {t(badge.descKey)}
                              </p>
                              <div className="mt-3 pt-3 border-t border-[hsl(var(--forum-border))]">
                                <p className="text-xs font-medium text-[hsl(var(--forum-accent))]">
                                  {t('howToGet')}
                                </p>
                                <p className="text-xs forum-text-muted mt-1">
                                  {t(badge.reqKey)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* POINTS TAB */}
            <TabsContent value="points" className="space-y-6">
              <Card className="forum-bg-secondary border-[hsl(var(--forum-border))]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
                    {t('pointsSystem')}
                  </CardTitle>
                  <CardDescription>
                    {t('pointsSystemDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {POINTS_SYSTEM.map((item, index) => {
                      const ItemIcon = item.icon;
                      return (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-4 rounded-lg forum-bg-primary border border-[hsl(var(--forum-border))]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[hsl(var(--forum-accent-muted))]">
                              <ItemIcon className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
                            </div>
                            <span className="font-medium">
                              {t(item.actionKey)}
                            </span>
                          </div>
                          <Badge className="bg-green-500 hover:bg-green-600">
                            +{item.points} pts
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-[hsl(var(--forum-accent-muted))] border border-[hsl(var(--forum-accent))]">
                    <h3 className="font-semibold text-[hsl(var(--forum-accent))] mb-2">
                      💡 {t('proTip')}
                    </h3>
                    <p className="text-sm forum-text-secondary">
                      {t('proTipText')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="forum-bg-secondary border-[hsl(var(--forum-border))]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
                    {t('likesAndThanks')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg forum-bg-primary border border-[hsl(var(--forum-border))]">
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsUp className="h-5 w-5 text-green-500" />
                        <h4 className="font-semibold">{t('likesTitle')}</h4>
                      </div>
                      <p className="text-sm forum-text-secondary">
                        {t('likesDesc')}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg forum-bg-primary border border-[hsl(var(--forum-border))]">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="h-5 w-5 text-emerald-500" />
                        <h4 className="font-semibold">{t('thanksTitle')}</h4>
                      </div>
                      <p className="text-sm forum-text-secondary">
                        {t('thanksDesc')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ TAB */}
            <TabsContent value="faq" className="space-y-6">
              <Card className="forum-bg-secondary border-[hsl(var(--forum-border))]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-[hsl(var(--forum-accent))]" />
                    {t('faqTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="p-4 rounded-lg forum-bg-primary border border-[hsl(var(--forum-border))]">
                      <h4 className="font-semibold mb-2">{t(`faq${n}Q`)}</h4>
                      <p className="text-sm forum-text-secondary">{t(`faq${n}A`)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
