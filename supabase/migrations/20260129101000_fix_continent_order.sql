-- Fix continent display order
-- Desired order: 1. North America, 2. Latin America, 3. Western Europe, 4. Europe, 5. Asia

UPDATE continents SET display_order = 1 WHERE slug = 'america-norte';
UPDATE continents SET display_order = 2 WHERE slug = 'america-latina';
UPDATE continents SET display_order = 3 WHERE slug = 'europa-occidental';
UPDATE continents SET display_order = 4 WHERE slug = 'europa';
UPDATE continents SET display_order = 5 WHERE slug = 'asia';
