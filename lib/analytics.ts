/**
 * Sistema de Analytics para TransForo
 * Soporta Google Analytics 4 y eventos personalizados
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-WYP0TL8804';

// Verificar si está habilitado
export const isAnalyticsEnabled = () => {
  return typeof window !== 'undefined' && !!GA_MEASUREMENT_ID && process.env.NODE_ENV === 'production';
};

/**
 * Track page views
 */
export const pageview = (url: string) => {
  if (!isAnalyticsEnabled()) return;
  
  window.gtag?.('config', GA_MEASUREMENT_ID!, {
    page_path: url,
  });
};

/**
 * Track eventos personalizados
 */
export const event = (action: string, params?: Record<string, any>) => {
  if (!isAnalyticsEnabled()) return;
  
  window.gtag?.('event', action, params);
};

// Eventos predefinidos para TransForo
export const Analytics = {
  // User events
  userRegister: (method: string = 'email') => {
    event('sign_up', { method });
  },
  
  userLogin: (method: string = 'email') => {
    event('login', { method });
  },
  
  userLogout: () => {
    event('logout');
  },
  
  // Content events
  threadView: (threadId: string, title: string) => {
    event('view_item', {
      item_id: threadId,
      item_name: title,
      item_category: 'thread',
    });
  },
  
  threadCreate: (forumId: string, forumName: string) => {
    event('create_thread', {
      forum_id: forumId,
      forum_name: forumName,
    });
  },
  
  postCreate: (threadId: string) => {
    event('create_post', {
      thread_id: threadId,
    });
  },
  
  postLike: (postId: string) => {
    event('like_post', {
      post_id: postId,
    });
  },
  
  // Search events
  search: (query: string, type: string = 'all') => {
    event('search', {
      search_term: query,
      search_type: type,
    });
  },
  
  // Upload events
  imageUpload: (success: boolean, fileSize?: number) => {
    event('image_upload', {
      success,
      file_size: fileSize,
    });
  },
  
  // Social events
  userFollow: (targetUserId: string) => {
    event('follow_user', {
      target_user_id: targetUserId,
    });
  },
  
  messagesSent: () => {
    event('send_message');
  },
  
  // Moderation events
  reportSubmit: (type: string, reason: string) => {
    event('submit_report', {
      report_type: type,
      reason,
    });
  },
  
  // Settings events
  themeChange: (theme: 'light' | 'dark') => {
    event('change_theme', { theme });
  },
  
  languageChange: (language: string) => {
    event('change_language', { language });
  },
  
  // Error events
  error: (errorMessage: string, errorType: string = 'unknown') => {
    event('exception', {
      description: errorMessage,
      error_type: errorType,
      fatal: false,
    });
  },
};

/**
 * Inicializar Google Analytics
 */
export const initGA = () => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics ID not found');
    return;
  }
  
  // Script ya debe estar cargado en el HTML
  console.log('Google Analytics initialized:', GA_MEASUREMENT_ID);
};

/**
 * Track timing events (performance)
 */
export const timing = (
  category: string,
  variable: string,
  value: number,
  label?: string
) => {
  if (!isAnalyticsEnabled()) return;
  
  event('timing_complete', {
    name: variable,
    value,
    event_category: category,
    event_label: label,
  });
};

/**
 * Set user properties
 */
export const setUserProperties = (properties: Record<string, any>) => {
  if (!isAnalyticsEnabled()) return;
  
  window.gtag?.('set', 'user_properties', properties);
};

/**
 * Set user ID (para tracking cross-device)
 */
export const setUserId = (userId: string) => {
  if (!isAnalyticsEnabled()) return;
  
  window.gtag?.('config', GA_MEASUREMENT_ID!, {
    user_id: userId,
  });
};
