import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Prevent build from failing if env vars are missing
// This allows the build to proceed until it actually needs to fetch data
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as ReturnType<typeof createClient>, {
      get: () => {
        throw new Error(
          'Supabase client could not be initialized. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
        );
      },
    });

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  signature: string;
  location_country: string;
  location_city: string;
  role: 'user' | 'mod' | 'admin';
  moderator_type: 'super' | 'basic' | 'country' | null;
  moderated_countries: string[] | null;
  is_verified: boolean;
  is_vip: boolean;
  is_suspended: boolean;
  suspended_until: string | null;
  posts_count: number;
  threads_count: number;
  thanks_received: number;
  points: number;
  activity_badge: string | null;
  likes_received: number;
  dislikes_received: number;
  warning_points: number;
  total_warnings_received: number;
  is_escort: boolean;
  escort_verified_at: string | null;
  escort_verified_by: string | null;
  last_seen_at: string;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  is_private: boolean;
  created_at: string;
};

export type Forum = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  country_code: string | null;
  city: string | null;
  threads_count: number;
  posts_count: number;
  last_post_id: string | null;
  display_order: number;
  is_private: boolean;
  forum_type: 'support' | 'news' | 'rules' | null;
  created_at: string;
};

export type Thread = {
  id: string;
  forum_id: string;
  author_id: string;
  title: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_hot: boolean;
  views_count: number;
  replies_count: number;
  last_post_id: string | null;
  last_post_at: string;
  last_post_author_id: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  thread_id: string;
  author_id: string;
  content: string;
  is_first_post: boolean;
  thanks_count: number;
  ip_address?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  updated_at: string;
};

export type Continent = {
  id: string;
  name: string;
  slug: string;
  name_es?: string;
  name_en?: string;
  display_order: number;
  created_at: string;
};

export type Country = {
  id: string;
  continent_id: string;
  name: string;
  slug: string;
  name_es?: string;
  name_en?: string;
  flag_emoji?: string;
  iso_code?: string;
  capacity_level: 'high' | 'medium' | 'low';
  display_order: number;
  created_at: string;
};

export type CountryOption = Pick<Country, 'id' | 'name' | 'slug' | 'flag_emoji'>;

export type Region = {
  id: string;
  country_id: string;
  name: string;
  slug: string;
  forum_id?: string;
  display_order: number;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id?: string;
  reported_user_id: string;
  post_id?: string;
  thread_id?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
};

export type ModerationLog = {
  id: string;
  moderator_id?: string;
  target_user_id: string;
  target_post_id?: string;
  target_thread_id?: string;
  action: string;
  reason?: string;
  details?: Record<string, unknown>;
  created_at: string;
};

export type UserSuspension = {
  id: string;
  user_id: string;
  suspended_by?: string;
  reason: string;
  starts_at: string;
  expires_at?: string;
  is_permanent: boolean;
  is_active: boolean;
  lifted_at?: string;
  lifted_by?: string;
  created_at: string;
};

export type MediaGalleryItem = {
  id: string;
  user_id: string;
  post_id?: string;
  thread_id?: string;
  url: string;
  thumbnail_url?: string;
  media_type: 'image' | 'video' | 'gif';
  title?: string;
  description?: string;
  is_nsfw: boolean;
  is_approved: boolean;
  views_count: number;
  created_at: string;
};

export type EscortAd = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  country_id?: string;
  region_id?: string;
  city?: string;
  neighborhood?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
  website?: string;
  age?: number;
  height?: number;
  weight?: number;
  ethnicity?: string;
  hair_color?: string;
  eye_color?: string;
  body_type?: string;
  services: string[];
  rates: Record<string, number>;
  currency: string;
  availability: Record<string, string[]>;
  incall: boolean;
  outcall: boolean;
  status: 'pending' | 'active' | 'paused' | 'rejected' | 'expired';
  is_verified: boolean;
  is_featured: boolean;
  is_vip: boolean;
  views_count: number;
  contacts_count: number;
  favorites_count: number;
  published_at?: string;
  expires_at?: string;
  last_bump_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: Profile;
  country?: Country;
  region?: Region;
  photos?: EscortAdPhoto[];
};

export type EscortAdPhoto = {
  id: string;
  ad_id: string;
  url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  is_verified: boolean;
  display_order: number;
  created_at: string;
};

// =============================================
// BANNER ADS SYSTEM TYPES
// =============================================

export type BannerAdZone = {
  id: string;
  zone_type: 'home_country' | 'city';
  country_id: string;
  region_id?: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  country?: Country;
  region?: Region;
};

export type BannerBookingStatus = 'pending' | 'approved' | 'active' | 'rejected' | 'expired' | 'cancelled';

export type BannerPosition = 'header' | 'sidebar_top' | 'sidebar_bottom' | 'footer' | 'content';

export type BannerFormat = '728x90' | '300x250';

export type BannerBooking = {
  id: string;
  user_id: string;
  zone_id: string;
  position: BannerPosition;
  format: BannerFormat;
  image_url?: string;
  click_url?: string;
  start_date: string;
  end_date: string;
  duration_days: 7 | 15 | 30 | 90 | 180;
  price_usd: number;
  status: BannerBookingStatus;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  user?: Profile;
  zone?: BannerAdZone;
};

export type BannerFallback = {
  id: string;
  zone_id?: string;
  position: BannerPosition;
  format: BannerFormat;
  code_html: string;
  label?: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  // Joined
  zone?: BannerAdZone;
};

export type BannerImpression = {
  id: string;
  booking_id?: string;
  fallback_id?: string;
  zone_id?: string;
  position?: string;
  event_type: 'impression' | 'click';
  ip_address?: string;
  user_agent?: string;
  created_at: string;
};

export type ZoneAlert = {
  id: string;
  user_id: string;
  country_id?: string;
  region_id?: string;
  is_active: boolean;
  notify_email: boolean;
  notify_push: boolean;
  created_at: string;
  country?: Country;
  region?: Region;
};
