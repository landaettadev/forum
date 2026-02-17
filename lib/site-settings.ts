import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SocialLinks {
  twitter: string;
  instagram: string;
  telegram: string;
  tiktok: string;
  discord: string;
  reddit: string;
}

export async function getSocialLinks(): Promise<SocialLinks> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .like('key', 'social_%');

  if (error) {
    console.error('Error fetching social links:', error);
    return {
      twitter: '',
      instagram: '',
      telegram: '',
      tiktok: '',
      discord: '',
      reddit: '',
    };
  }

  const settings: Record<string, string> = {};
  data?.forEach((row) => {
    settings[row.key] = row.value || '';
  });

  return {
    twitter: settings['social_twitter'] || '',
    instagram: settings['social_instagram'] || '',
    telegram: settings['social_telegram'] || '',
    tiktok: settings['social_tiktok'] || '',
    discord: settings['social_discord'] || '',
    reddit: settings['social_reddit'] || '',
  };
}

export async function updateSocialLink(key: string, value: string): Promise<boolean> {
  const { error } = await supabase
    .from('site_settings')
    .update({ value })
    .eq('key', key);

  if (error) {
    console.error('Error updating social link:', error);
    return false;
  }

  return true;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value');

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  const settings: Record<string, string> = {};
  data?.forEach((row) => {
    settings[row.key] = row.value || '';
  });

  return settings;
}
