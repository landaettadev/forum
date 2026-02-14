import { headers } from 'next/headers';

export type GeoData = {
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  ip?: string;
};

export async function getGeoFromIP(): Promise<GeoData> {
  try {
    const headersList = headers();
    
    // Try to get IP from various headers (works with Vercel, Cloudflare, etc.)
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIP = headersList.get('x-real-ip');
    const cfConnectingIP = headersList.get('cf-connecting-ip');
    
    // Vercel provides geo data directly in headers
    const vercelCountry = headersList.get('x-vercel-ip-country');
    const vercelCity = headersList.get('x-vercel-ip-city');
    const vercelRegion = headersList.get('x-vercel-ip-country-region');
    
    // If Vercel provides geo data, use it directly
    if (vercelCountry) {
      return {
        countryCode: vercelCountry,
        city: vercelCity || undefined,
        region: vercelRegion || undefined,
        ip: cfConnectingIP || realIP || forwardedFor?.split(',')[0] || undefined,
      };
    }

    // Cloudflare provides country in header
    const cfCountry = headersList.get('cf-ipcountry');
    if (cfCountry) {
      return {
        countryCode: cfCountry,
        ip: cfConnectingIP || realIP || forwardedFor?.split(',')[0] || undefined,
      };
    }

    const ip = cfConnectingIP || realIP || forwardedFor?.split(',')[0];
    
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      return {};
    }

    // Fallback: Use ipapi.co (free tier, HTTPS, 1000 req/day)
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) {
      return { ip };
    }

    const data = await response.json();
    
    if (!data.error) {
      return {
        country: data.country_name,
        countryCode: data.country_code,
        city: data.city,
        region: data.region,
        ip,
      };
    }

    return { ip };
  } catch (error) {
    console.error('Error getting geo data:', error);
    return {};
  }
}

// Map country codes to our database country slugs
export const countryCodeToSlug: Record<string, string> = {
  'ES': 'espana',
  'MX': 'mexico',
  'AR': 'argentina',
  'CO': 'colombia',
  'CL': 'chile',
  'PE': 'peru',
  'VE': 'venezuela',
  'EC': 'ecuador',
  'UY': 'uruguay',
  'PY': 'paraguay',
  'BO': 'bolivia',
  'CR': 'costa-rica',
  'PA': 'panama',
  'DO': 'republica-dominicana',
  'GT': 'guatemala',
  'HN': 'honduras',
  'SV': 'el-salvador',
  'NI': 'nicaragua',
  'CU': 'cuba',
  'PR': 'puerto-rico',
  'US': 'estados-unidos',
  'CA': 'canada',
  'BR': 'brasil',
  'PT': 'portugal',
  'FR': 'francia',
  'DE': 'alemania',
  'IT': 'italia',
  'GB': 'reino-unido',
  'NL': 'paises-bajos',
  'BE': 'belgica',
  'CH': 'suiza',
  'AT': 'austria',
  'PL': 'polonia',
  'CZ': 'republica-checa',
  'SE': 'suecia',
  'NO': 'noruega',
  'DK': 'dinamarca',
  'FI': 'finlandia',
  'RU': 'rusia',
  'UA': 'ucrania',
  'TR': 'turquia',
  'GR': 'grecia',
  'RO': 'rumania',
  'HU': 'hungria',
  'JP': 'japon',
  'CN': 'china',
  'KR': 'corea-del-sur',
  'TH': 'tailandia',
  'PH': 'filipinas',
  'ID': 'indonesia',
  'MY': 'malasia',
  'SG': 'singapur',
  'VN': 'vietnam',
  'IN': 'india',
  'AU': 'australia',
  'NZ': 'nueva-zelanda',
  'ZA': 'sudafrica',
  'EG': 'egipto',
  'MA': 'marruecos',
  'AE': 'emiratos-arabes',
  'SA': 'arabia-saudita',
  'IL': 'israel',
};

export function getCountrySlugFromCode(countryCode: string): string | undefined {
  return countryCodeToSlug[countryCode.toUpperCase()];
}
