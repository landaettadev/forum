-- Reorder continents and add Slovenia
-- New order: 1. North America, 2. Latin America, 3. Europe, 4. Asia

-- Update continent display order
UPDATE continents SET display_order = 1 WHERE slug = 'america-norte';
UPDATE continents SET display_order = 2 WHERE slug = 'america-latina';
UPDATE continents SET display_order = 3 WHERE slug = 'europa-occidental';
UPDATE continents SET display_order = 4 WHERE slug = 'europa';
UPDATE continents SET display_order = 5 WHERE slug = 'asia';

-- Add Slovenia to Europe
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Slovenia', 'slovenia', 'Eslovenia', 'Slovenia', '🇸🇮', 'SI', 'medium', 12
FROM continents c WHERE c.slug = 'europa';

-- Add regions for Slovenia
INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Ljubljana', 'ljubljana', 'Liubliana', 'Ljubljana', 1
FROM countries co WHERE co.slug = 'slovenia';

-- Add translations for Slovenia to all languages
UPDATE countries SET
  name_fr = 'Slovénie',
  name_pt = 'Eslovênia',
  name_de = 'Slowenien',
  name_it = 'Slovenia',
  name_ja = 'スロベニア',
  name_zh = '斯洛文尼亚',
  name_ru = 'Словения',
  name_ar = 'سلوفينيا',
  name_ko = '슬로베니아',
  name_hi = 'स्लोवेनिया',
  name_tr = 'Slovenya',
  name_pl = 'Słowenia',
  name_nl = 'Slovenië',
  name_sv = 'Slovenien',
  name_id = 'Slovenia',
  name_th = 'สโลวีเนีย'
WHERE slug = 'slovenia';
