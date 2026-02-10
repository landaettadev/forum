-- Add translation columns for country names in all supported languages
ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS name_fr TEXT,
  ADD COLUMN IF NOT EXISTS name_pt TEXT,
  ADD COLUMN IF NOT EXISTS name_de TEXT,
  ADD COLUMN IF NOT EXISTS name_it TEXT,
  ADD COLUMN IF NOT EXISTS name_ja TEXT,
  ADD COLUMN IF NOT EXISTS name_zh TEXT,
  ADD COLUMN IF NOT EXISTS name_ru TEXT,
  ADD COLUMN IF NOT EXISTS name_ar TEXT,
  ADD COLUMN IF NOT EXISTS name_ko TEXT,
  ADD COLUMN IF NOT EXISTS name_hi TEXT,
  ADD COLUMN IF NOT EXISTS name_tr TEXT,
  ADD COLUMN IF NOT EXISTS name_pl TEXT,
  ADD COLUMN IF NOT EXISTS name_nl TEXT,
  ADD COLUMN IF NOT EXISTS name_sv TEXT,
  ADD COLUMN IF NOT EXISTS name_id TEXT,
  ADD COLUMN IF NOT EXISTS name_th TEXT;

-- Update existing countries with translations
-- United States
UPDATE countries SET
  name_fr = 'États-Unis',
  name_pt = 'Estados Unidos',
  name_de = 'Vereinigte Staaten',
  name_it = 'Stati Uniti',
  name_ja = 'アメリカ合衆国',
  name_zh = '美国',
  name_ru = 'Соединенные Штаты',
  name_ar = 'الولايات المتحدة',
  name_ko = '미국',
  name_hi = 'संयुक्त राज्य अमेरिका',
  name_tr = 'Amerika Birleşik Devletleri',
  name_pl = 'Stany Zjednoczone',
  name_nl = 'Verenigde Staten',
  name_sv = 'Förenta staterna',
  name_id = 'Amerika Serikat',
  name_th = 'สหรัฐอเมริกา'
WHERE slug = 'united-states';

-- Mexico
UPDATE countries SET
  name_fr = 'Mexique',
  name_pt = 'México',
  name_de = 'Mexiko',
  name_it = 'Messico',
  name_ja = 'メキシコ',
  name_zh = '墨西哥',
  name_ru = 'Мексика',
  name_ar = 'المكسيك',
  name_ko = '멕시코',
  name_hi = 'मेक्सिको',
  name_tr = 'Meksika',
  name_pl = 'Meksyk',
  name_nl = 'Mexico',
  name_sv = 'Mexiko',
  name_id = 'Meksiko',
  name_th = 'เม็กซิโก'
WHERE slug = 'mexico';

-- Canada
UPDATE countries SET
  name_fr = 'Canada',
  name_pt = 'Canadá',
  name_de = 'Kanada',
  name_it = 'Canada',
  name_ja = 'カナダ',
  name_zh = '加拿大',
  name_ru = 'Канада',
  name_ar = 'كندا',
  name_ko = '캐나다',
  name_hi = 'कनाडा',
  name_tr = 'Kanada',
  name_pl = 'Kanada',
  name_nl = 'Canada',
  name_sv = 'Kanada',
  name_id = 'Kanada',
  name_th = 'แคนาดา'
WHERE slug = 'canada';

-- Spain
UPDATE countries SET
  name_fr = 'Espagne',
  name_pt = 'Espanha',
  name_de = 'Spanien',
  name_it = 'Spagna',
  name_ja = 'スペイン',
  name_zh = '西班牙',
  name_ru = 'Испания',
  name_ar = 'إسبانيا',
  name_ko = '스페인',
  name_hi = 'स्पेन',
  name_tr = 'İspanya',
  name_pl = 'Hiszpania',
  name_nl = 'Spanje',
  name_sv = 'Spanien',
  name_id = 'Spanyol',
  name_th = 'สเปน'
WHERE slug = 'spain';

-- France
UPDATE countries SET
  name_fr = 'France',
  name_pt = 'França',
  name_de = 'Frankreich',
  name_it = 'Francia',
  name_ja = 'フランス',
  name_zh = '法国',
  name_ru = 'Франция',
  name_ar = 'فرنسا',
  name_ko = '프랑스',
  name_hi = 'फ्रांस',
  name_tr = 'Fransa',
  name_pl = 'Francja',
  name_nl = 'Frankrijk',
  name_sv = 'Frankrike',
  name_id = 'Prancis',
  name_th = 'ฝรั่งเศส'
WHERE slug = 'france';

-- United Kingdom
UPDATE countries SET
  name_fr = 'Royaume-Uni',
  name_pt = 'Reino Unido',
  name_de = 'Vereinigtes Königreich',
  name_it = 'Regno Unito',
  name_ja = 'イギリス',
  name_zh = '英国',
  name_ru = 'Великобритания',
  name_ar = 'المملكة المتحدة',
  name_ko = '영국',
  name_hi = 'यूनाइटेड किंगडम',
  name_tr = 'Birleşik Krallık',
  name_pl = 'Wielka Brytania',
  name_nl = 'Verenigd Koninkrijk',
  name_sv = 'Storbritannien',
  name_id = 'Britania Raya',
  name_th = 'สหราชอาณาจักร'
WHERE slug = 'united-kingdom';

-- Germany
UPDATE countries SET
  name_fr = 'Allemagne',
  name_pt = 'Alemanha',
  name_de = 'Deutschland',
  name_it = 'Germania',
  name_ja = 'ドイツ',
  name_zh = '德国',
  name_ru = 'Германия',
  name_ar = 'ألمانيا',
  name_ko = '독일',
  name_hi = 'जर्मनी',
  name_tr = 'Almanya',
  name_pl = 'Niemcy',
  name_nl = 'Duitsland',
  name_sv = 'Tyskland',
  name_id = 'Jerman',
  name_th = 'เยอรมนี'
WHERE slug = 'germany';

-- Italy
UPDATE countries SET
  name_fr = 'Italie',
  name_pt = 'Itália',
  name_de = 'Italien',
  name_it = 'Italia',
  name_ja = 'イタリア',
  name_zh = '意大利',
  name_ru = 'Италия',
  name_ar = 'إيطاليا',
  name_ko = '이탈리아',
  name_hi = 'इटली',
  name_tr = 'İtalya',
  name_pl = 'Włochy',
  name_nl = 'Italië',
  name_sv = 'Italien',
  name_id = 'Italia',
  name_th = 'อิตาลี'
WHERE slug = 'italy';

-- Argentina
UPDATE countries SET
  name_fr = 'Argentine',
  name_pt = 'Argentina',
  name_de = 'Argentinien',
  name_it = 'Argentina',
  name_ja = 'アルゼンチン',
  name_zh = '阿根廷',
  name_ru = 'Аргентина',
  name_ar = 'الأرجنتين',
  name_ko = '아르헨티나',
  name_hi = 'अर्जेंटीना',
  name_tr = 'Arjantin',
  name_pl = 'Argentyna',
  name_nl = 'Argentinië',
  name_sv = 'Argentina',
  name_id = 'Argentina',
  name_th = 'อาร์เจนตินา'
WHERE slug = 'argentina';

-- Brazil
UPDATE countries SET
  name_fr = 'Brésil',
  name_pt = 'Brasil',
  name_de = 'Brasilien',
  name_it = 'Brasile',
  name_ja = 'ブラジル',
  name_zh = '巴西',
  name_ru = 'Бразилия',
  name_ar = 'البرازيل',
  name_ko = '브라질',
  name_hi = 'ब्राज़ील',
  name_tr = 'Brezilya',
  name_pl = 'Brazylia',
  name_nl = 'Brazilië',
  name_sv = 'Brasilien',
  name_id = 'Brasil',
  name_th = 'บราซิล'
WHERE slug = 'brazil';

-- Colombia
UPDATE countries SET
  name_fr = 'Colombie',
  name_pt = 'Colômbia',
  name_de = 'Kolumbien',
  name_it = 'Colombia',
  name_ja = 'コロンビア',
  name_zh = '哥伦比亚',
  name_ru = 'Колумбия',
  name_ar = 'كولومبيا',
  name_ko = '콜롬비아',
  name_hi = 'कोलंबिया',
  name_tr = 'Kolombiya',
  name_pl = 'Kolumbia',
  name_nl = 'Colombia',
  name_sv = 'Colombia',
  name_id = 'Kolombia',
  name_th = 'โคลอมเบีย'
WHERE slug = 'colombia';

-- Chile
UPDATE countries SET
  name_fr = 'Chili',
  name_pt = 'Chile',
  name_de = 'Chile',
  name_it = 'Cile',
  name_ja = 'チリ',
  name_zh = '智利',
  name_ru = 'Чили',
  name_ar = 'تشيلي',
  name_ko = '칠레',
  name_hi = 'चिली',
  name_tr = 'Şili',
  name_pl = 'Chile',
  name_nl = 'Chili',
  name_sv = 'Chile',
  name_id = 'Chili',
  name_th = 'ชิลี'
WHERE slug = 'chile';

-- Peru
UPDATE countries SET
  name_fr = 'Pérou',
  name_pt = 'Peru',
  name_de = 'Peru',
  name_it = 'Perù',
  name_ja = 'ペルー',
  name_zh = '秘鲁',
  name_ru = 'Перу',
  name_ar = 'بيرو',
  name_ko = '페루',
  name_hi = 'पेरू',
  name_tr = 'Peru',
  name_pl = 'Peru',
  name_nl = 'Peru',
  name_sv = 'Peru',
  name_id = 'Peru',
  name_th = 'เปรู'
WHERE slug = 'peru';

-- Venezuela
UPDATE countries SET
  name_fr = 'Venezuela',
  name_pt = 'Venezuela',
  name_de = 'Venezuela',
  name_it = 'Venezuela',
  name_ja = 'ベネズエラ',
  name_zh = '委内瑞拉',
  name_ru = 'Венесуэла',
  name_ar = 'فنزويلا',
  name_ko = '베네수엘라',
  name_hi = 'वेनेज़ुएला',
  name_tr = 'Venezuela',
  name_pl = 'Wenezuela',
  name_nl = 'Venezuela',
  name_sv = 'Venezuela',
  name_id = 'Venezuela',
  name_th = 'เวเนซุเอลา'
WHERE slug = 'venezuela';

-- Japan
UPDATE countries SET
  name_fr = 'Japon',
  name_pt = 'Japão',
  name_de = 'Japan',
  name_it = 'Giappone',
  name_ja = '日本',
  name_zh = '日本',
  name_ru = 'Япония',
  name_ar = 'اليابان',
  name_ko = '일본',
  name_hi = 'जापान',
  name_tr = 'Japonya',
  name_pl = 'Japonia',
  name_nl = 'Japan',
  name_sv = 'Japan',
  name_id = 'Jepang',
  name_th = 'ญี่ปุ่น'
WHERE slug = 'japan';

-- Continue with remaining countries using English name as fallback for now
-- This ensures the migration doesn't fail
UPDATE countries SET
  name_fr = COALESCE(name_fr, name_en, name),
  name_pt = COALESCE(name_pt, name_es, name_en, name),
  name_de = COALESCE(name_de, name_en, name),
  name_it = COALESCE(name_it, name_en, name),
  name_ja = COALESCE(name_ja, name_en, name),
  name_zh = COALESCE(name_zh, name_en, name),
  name_ru = COALESCE(name_ru, name_en, name),
  name_ar = COALESCE(name_ar, name_en, name),
  name_ko = COALESCE(name_ko, name_en, name),
  name_hi = COALESCE(name_hi, name_en, name),
  name_tr = COALESCE(name_tr, name_en, name),
  name_pl = COALESCE(name_pl, name_en, name),
  name_nl = COALESCE(name_nl, name_en, name),
  name_sv = COALESCE(name_sv, name_en, name),
  name_id = COALESCE(name_id, name_en, name),
  name_th = COALESCE(name_th, name_en, name)
WHERE name_fr IS NULL OR name_pt IS NULL OR name_de IS NULL;
