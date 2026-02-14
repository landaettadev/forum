'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Coins, ShoppingBag, Clock, Star } from 'lucide-react';
import Link from 'next/link';

interface ShopItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  cost: number;
  category: string;
  icon_emoji: string;
  duration_hours: number | null;
}

interface Purchase {
  id: string;
  cost: number;
  expires_at: string | null;
  created_at: string;
  item: ShopItem;
}

export default function ShopPage() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const fetchShopData = useCallback(async () => {
    try {
      const { data: shopItems } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
        .order('cost');

      setItems(shopItems || []);

      if (user) {
        const { data: userPurchases } = await supabase
          .from('shop_purchases')
          .select('*, item:shop_items(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPurchases((userPurchases as any) || []);
      }
    } catch {
      // Shop tables may not exist yet
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchShopData();
  }, [user, fetchShopData]);

  const handlePurchase = async (itemSlug: string) => {
    if (!user) {
      toast.error('Debes iniciar sesión para comprar');
      return;
    }

    setPurchasing(itemSlug);
    try {
      const { data, error } = await supabase.rpc('purchase_shop_item', {
        p_user_id: user.id,
        p_item_slug: itemSlug,
      });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = data as any;
      if (result?.success) {
        toast.success('¡Compra exitosa!', {
          description: `Te quedan ${result.remaining_balance} puntos`,
        });
        fetchShopData();
      } else {
        toast.error(result?.error || 'Error al comprar');
      }
    } catch {
      toast.error('Error al procesar la compra');
    } finally {
      setPurchasing(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const balance = (profile as any)?.reputation_score || profile?.points || 0;

  const categoryLabels: Record<string, string> = {
    boost: '🚀 Impulsos',
    cosmetic: '🎨 Cosméticos',
    feature: '⚡ Funcionalidades',
  };

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShopItem[]>);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold forum-text flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" /> Tienda de Puntos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gasta tus puntos de reputación en mejoras y cosméticos
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--forum-surface-alt))] border border-[hsl(var(--forum-border))]">
            <Coins className="h-5 w-5 text-yellow-500" />
            <span className="font-bold text-lg">{balance}</span>
            <span className="text-sm text-muted-foreground">puntos</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando tienda...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">La tienda estará disponible pronto</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([category, categoryItems]) => (
              <section key={category}>
                <h2 className="text-lg font-semibold mb-4 forum-text">
                  {categoryLabels[category] || category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryItems.map((item) => (
                    <Card key={item.id} className="forum-surface border-[hsl(var(--forum-border))]">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <span className="text-3xl">{item.icon_emoji}</span>
                          <div className="flex items-center gap-1 text-yellow-500 font-bold">
                            <Coins className="h-4 w-4" />
                            {item.cost}
                          </div>
                        </div>
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {item.description}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="pt-0">
                        <div className="flex items-center justify-between w-full">
                          {item.duration_hours && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {item.duration_hours >= 720
                                ? `${Math.round(item.duration_hours / 720)} mes`
                                : item.duration_hours >= 24
                                  ? `${Math.round(item.duration_hours / 24)} días`
                                  : `${item.duration_hours}h`}
                            </span>
                          )}
                          {!item.duration_hours && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3" /> Permanente
                            </span>
                          )}
                          <Button
                            size="sm"
                            className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]"
                            disabled={!user || balance < item.cost || purchasing === item.slug}
                            onClick={() => handlePurchase(item.slug)}
                          >
                            {purchasing === item.slug ? 'Comprando...' : 'Comprar'}
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Purchase History */}
        {purchases.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4 forum-text">Mis compras recientes</h2>
            <div className="space-y-2">
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between forum-surface rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <span>{(p.item as any)?.icon_emoji || '🎁'}</span>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <span>{(p.item as any)?.name || 'Item'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground text-xs">
                    <span className="flex items-center gap-1 text-yellow-500">
                      <Coins className="h-3 w-3" /> -{p.cost}
                    </span>
                    {p.expires_at && (
                      <span>
                        Expira: {new Date(p.expires_at).toLocaleDateString('es')}
                      </span>
                    )}
                    <span>{new Date(p.created_at).toLocaleDateString('es')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!user && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-3">Inicia sesión para comprar items</p>
            <Link href="/login">
              <Button className="bg-[hsl(var(--forum-accent))] hover:bg-[hsl(var(--forum-accent-hover))]">
                Iniciar sesión
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
