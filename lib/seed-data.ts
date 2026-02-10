export const seedData = {
  categories: [
    { name: 'Información', slug: 'informacion', description: 'Reglas, anuncios y presentaciones', display_order: 0, is_private: false },
    { name: 'Américas', slug: 'americas', description: 'Foros por países de América', display_order: 1, is_private: false },
    { name: 'Europa', slug: 'europa', description: 'Foros por países de Europa', display_order: 2, is_private: false },
    { name: 'Asia y Oceanía', slug: 'asia-oceania', description: 'Foros de Asia y Oceanía', display_order: 3, is_private: false },
    { name: 'Comunidad y Discusión', slug: 'comunidad', description: 'Temas de interés general', display_order: 4, is_private: false },
    { name: 'Zona Privada', slug: 'zona-privada', description: 'Solo para usuarias verificadas', display_order: 5, is_private: true },
    { name: 'Off-Topic', slug: 'off-topic', description: 'Charla libre y entretenimiento', display_order: 6, is_private: false },
  ],

  forums: {
    informacion: [
      { name: 'Reglas del foro', slug: 'reglas', description: 'Lee las reglas antes de participar', display_order: 0 },
      { name: 'Anuncios oficiales', slug: 'anuncios', description: 'Comunicados del equipo', display_order: 1 },
      { name: 'Presentaciones', slug: 'presentaciones', description: 'Preséntate ante la comunidad', display_order: 2 },
    ],

    americas: [
      // Estados Unidos
      { name: '🇺🇸 Estados Unidos', slug: 'usa', description: 'Subforos de USA', display_order: 0, country_code: 'US' },
      { name: 'California', slug: 'usa-california', description: '', display_order: 1, country_code: 'US', city: 'California', parent: 'usa' },
      { name: 'Florida', slug: 'usa-florida', description: '', display_order: 2, country_code: 'US', city: 'Florida', parent: 'usa' },
      { name: 'Texas', slug: 'usa-texas', description: '', display_order: 3, country_code: 'US', city: 'Texas', parent: 'usa' },
      { name: 'New York', slug: 'usa-newyork', description: '', display_order: 4, country_code: 'US', city: 'New York', parent: 'usa' },
      { name: 'Nevada', slug: 'usa-nevada', description: 'Las Vegas', display_order: 5, country_code: 'US', city: 'Nevada', parent: 'usa' },
      { name: 'Illinois', slug: 'usa-illinois', description: 'Chicago', display_order: 6, country_code: 'US', city: 'Illinois', parent: 'usa' },
      { name: 'Otros estados USA', slug: 'usa-otros', description: '', display_order: 7, country_code: 'US', city: 'Otros', parent: 'usa' },

      // Canadá
      { name: '🇨🇦 Canadá', slug: 'canada', description: '', display_order: 10, country_code: 'CA' },
      { name: 'Toronto', slug: 'canada-toronto', description: '', display_order: 11, country_code: 'CA', city: 'Toronto', parent: 'canada' },
      { name: 'Vancouver', slug: 'canada-vancouver', description: '', display_order: 12, country_code: 'CA', city: 'Vancouver', parent: 'canada' },
      { name: 'Montreal', slug: 'canada-montreal', description: '', display_order: 13, country_code: 'CA', city: 'Montreal', parent: 'canada' },

      // México
      { name: '🇲🇽 México', slug: 'mexico', description: '', display_order: 20, country_code: 'MX' },
      { name: 'CDMX / Ciudad de México', slug: 'mexico-cdmx', description: '', display_order: 21, country_code: 'MX', city: 'CDMX', parent: 'mexico' },
      { name: 'Guadalajara', slug: 'mexico-guadalajara', description: '', display_order: 22, country_code: 'MX', city: 'Guadalajara', parent: 'mexico' },
      { name: 'Monterrey', slug: 'mexico-monterrey', description: '', display_order: 23, country_code: 'MX', city: 'Monterrey', parent: 'mexico' },
      { name: 'Tijuana', slug: 'mexico-tijuana', description: '', display_order: 24, country_code: 'MX', city: 'Tijuana', parent: 'mexico' },
      { name: 'Cancún / Riviera Maya', slug: 'mexico-cancun', description: '', display_order: 25, country_code: 'MX', city: 'Cancún', parent: 'mexico' },
      { name: 'Puebla', slug: 'mexico-puebla', description: '', display_order: 26, country_code: 'MX', city: 'Puebla', parent: 'mexico' },
      { name: 'Otras ciudades México', slug: 'mexico-otras', description: '', display_order: 27, country_code: 'MX', city: 'Otras', parent: 'mexico' },

      // Colombia
      { name: '🇨🇴 Colombia', slug: 'colombia', description: '', display_order: 30, country_code: 'CO' },
      { name: 'Bogotá', slug: 'colombia-bogota', description: '', display_order: 31, country_code: 'CO', city: 'Bogotá', parent: 'colombia' },
      { name: 'Medellín', slug: 'colombia-medellin', description: '', display_order: 32, country_code: 'CO', city: 'Medellín', parent: 'colombia' },
      { name: 'Cali', slug: 'colombia-cali', description: '', display_order: 33, country_code: 'CO', city: 'Cali', parent: 'colombia' },
      { name: 'Cartagena', slug: 'colombia-cartagena', description: '', display_order: 34, country_code: 'CO', city: 'Cartagena', parent: 'colombia' },
      { name: 'Barranquilla', slug: 'colombia-barranquilla', description: '', display_order: 35, country_code: 'CO', city: 'Barranquilla', parent: 'colombia' },

      // Argentina
      { name: '🇦🇷 Argentina', slug: 'argentina', description: '', display_order: 40, country_code: 'AR' },
      { name: 'Buenos Aires / CABA', slug: 'argentina-buenosaires', description: '', display_order: 41, country_code: 'AR', city: 'Buenos Aires', parent: 'argentina' },
      { name: 'Córdoba', slug: 'argentina-cordoba', description: '', display_order: 42, country_code: 'AR', city: 'Córdoba', parent: 'argentina' },
      { name: 'Rosario', slug: 'argentina-rosario', description: '', display_order: 43, country_code: 'AR', city: 'Rosario', parent: 'argentina' },
      { name: 'Mendoza', slug: 'argentina-mendoza', description: '', display_order: 44, country_code: 'AR', city: 'Mendoza', parent: 'argentina' },

      // Chile
      { name: '🇨🇱 Chile', slug: 'chile', description: '', display_order: 50, country_code: 'CL' },
      { name: 'Santiago', slug: 'chile-santiago', description: '', display_order: 51, country_code: 'CL', city: 'Santiago', parent: 'chile' },
      { name: 'Viña del Mar / Valparaíso', slug: 'chile-vina', description: '', display_order: 52, country_code: 'CL', city: 'Viña del Mar', parent: 'chile' },

      // España
      { name: '🇪🇸 España', slug: 'espana', description: '', display_order: 100, country_code: 'ES' },
      { name: 'Madrid', slug: 'espana-madrid', description: '', display_order: 101, country_code: 'ES', city: 'Madrid', parent: 'espana' },
      { name: 'Barcelona', slug: 'espana-barcelona', description: '', display_order: 102, country_code: 'ES', city: 'Barcelona', parent: 'espana' },
      { name: 'Valencia', slug: 'espana-valencia', description: '', display_order: 103, country_code: 'ES', city: 'Valencia', parent: 'espana' },
      { name: 'Sevilla', slug: 'espana-sevilla', description: '', display_order: 104, country_code: 'ES', city: 'Sevilla', parent: 'espana' },
      { name: 'Málaga / Costa del Sol', slug: 'espana-malaga', description: '', display_order: 105, country_code: 'ES', city: 'Málaga', parent: 'espana' },
    ],

    europa: [
      { name: '🇪🇸 España', slug: 'espana', description: '', display_order: 0, country_code: 'ES' },
      { name: 'Madrid', slug: 'espana-madrid', description: '', display_order: 1, country_code: 'ES', city: 'Madrid' },
      { name: 'Barcelona', slug: 'espana-barcelona', description: '', display_order: 2, country_code: 'ES', city: 'Barcelona' },
      { name: 'Valencia', slug: 'espana-valencia', description: '', display_order: 3, country_code: 'ES', city: 'Valencia' },

      { name: '🇵🇹 Portugal', slug: 'portugal', description: '', display_order: 10, country_code: 'PT' },
      { name: 'Lisboa', slug: 'portugal-lisboa', description: '', display_order: 11, country_code: 'PT', city: 'Lisboa' },
      { name: 'Porto', slug: 'portugal-porto', description: '', display_order: 12, country_code: 'PT', city: 'Porto' },

      { name: '🇫🇷 Francia', slug: 'francia', description: '', display_order: 20, country_code: 'FR' },
      { name: 'París', slug: 'francia-paris', description: '', display_order: 21, country_code: 'FR', city: 'París' },

      { name: '🇬🇧 Reino Unido', slug: 'uk', description: '', display_order: 30, country_code: 'GB' },
      { name: 'Londres', slug: 'uk-londres', description: '', display_order: 31, country_code: 'GB', city: 'Londres' },

      { name: '🇩🇪 Alemania', slug: 'alemania', description: '', display_order: 40, country_code: 'DE' },
      { name: 'Berlín', slug: 'alemania-berlin', description: '', display_order: 41, country_code: 'DE', city: 'Berlín' },
      { name: 'Frankfurt', slug: 'alemania-frankfurt', description: '', display_order: 42, country_code: 'DE', city: 'Frankfurt' },
    ],

    'asia-oceania': [
      { name: '🇹🇭 Tailandia', slug: 'tailandia', description: '', display_order: 0, country_code: 'TH' },
      { name: 'Bangkok', slug: 'tailandia-bangkok', description: '', display_order: 1, country_code: 'TH', city: 'Bangkok' },
      { name: 'Pattaya', slug: 'tailandia-pattaya', description: '', display_order: 2, country_code: 'TH', city: 'Pattaya' },
      { name: 'Phuket', slug: 'tailandia-phuket', description: '', display_order: 3, country_code: 'TH', city: 'Phuket' },

      { name: '🇵🇭 Filipinas', slug: 'filipinas', description: '', display_order: 10, country_code: 'PH' },
      { name: 'Manila', slug: 'filipinas-manila', description: '', display_order: 11, country_code: 'PH', city: 'Manila' },

      { name: '🇯🇵 Japón', slug: 'japon', description: '', display_order: 20, country_code: 'JP' },
      { name: 'Tokio', slug: 'japon-tokio', description: '', display_order: 21, country_code: 'JP', city: 'Tokio' },

      { name: '🇦🇺 Australia', slug: 'australia', description: '', display_order: 30, country_code: 'AU' },
      { name: 'Sydney', slug: 'australia-sydney', description: '', display_order: 31, country_code: 'AU', city: 'Sydney' },
      { name: 'Melbourne', slug: 'australia-melbourne', description: '', display_order: 32, country_code: 'AU', city: 'Melbourne' },
    ],

    comunidad: [
      { name: '💄 Imagen y Estilo', slug: 'imagen-estilo', description: 'Moda, maquillaje, fotos', display_order: 0 },
      { name: 'Moda y outfits', slug: 'moda-outfits', description: '', display_order: 1 },
      { name: 'Maquillaje', slug: 'maquillaje', description: '', display_order: 2 },
      { name: 'Fotos y sesiones', slug: 'fotos-sesiones', description: '', display_order: 3 },

      { name: '💡 Tips del Trabajo', slug: 'tips-trabajo', description: 'Marketing, tarifas, promoción', display_order: 10 },
      { name: 'Marketing y promoción', slug: 'marketing', description: '', display_order: 11 },
      { name: 'Redes sociales', slug: 'redes-sociales', description: '', display_order: 12 },
      { name: 'Fotografía', slug: 'fotografia', description: '', display_order: 13 },

      { name: '💪 Salud y Bienestar', slug: 'salud-bienestar', description: 'Cuidado personal y salud', display_order: 20 },
      { name: 'Cuidado personal', slug: 'cuidado-personal', description: '', display_order: 21 },
      { name: 'Prevención y salud', slug: 'prevencion-salud', description: '', display_order: 22 },

      { name: '📱 Tecnología', slug: 'tecnologia', description: 'Apps, herramientas, seguridad', display_order: 30 },
      { name: 'Apps y herramientas', slug: 'apps-herramientas', description: '', display_order: 31 },
      { name: 'Páginas web', slug: 'paginas-web', description: '', display_order: 32 },

      { name: '⚖️ Legal y Derechos', slug: 'legal-derechos', description: 'Documentos, trámites, derechos', display_order: 40 },
      { name: 'Documentos y trámites', slug: 'documentos-tramites', description: '', display_order: 41 },
      { name: 'Derechos trans', slug: 'derechos-trans', description: '', display_order: 42 },
    ],

    'zona-privada': [
      { name: '⚠️ Alertas y Seguridad', slug: 'alertas-seguridad', description: 'Solo verificadas', display_order: 0 },
      { name: 'Lista negra de clientes', slug: 'lista-negra', description: '', display_order: 1 },
      { name: 'Alertas por ciudad', slug: 'alertas-ciudad', description: '', display_order: 2 },
      { name: 'Experiencias negativas', slug: 'experiencias-negativas', description: '', display_order: 3 },

      { name: '💰 Negocios', slug: 'negocios', description: 'Solo verificadas', display_order: 10 },
      { name: 'Oportunidades', slug: 'oportunidades', description: '', display_order: 11 },
      { name: 'Colaboraciones', slug: 'colaboraciones', description: '', display_order: 12 },
      { name: 'Viajes de trabajo', slug: 'viajes-trabajo', description: '', display_order: 13 },
    ],

    'off-topic': [
      { name: '☕ Café General', slug: 'cafe-general', description: 'Charla libre', display_order: 0 },
      { name: 'Charla libre', slug: 'charla-libre', description: '', display_order: 1 },
      { name: 'Música, cine, series', slug: 'entretenimiento', description: '', display_order: 2 },
      { name: 'Noticias', slug: 'noticias', description: '', display_order: 3 },
      { name: 'Memes y humor', slug: 'memes-humor', description: '', display_order: 4 },
    ],
  },
};
