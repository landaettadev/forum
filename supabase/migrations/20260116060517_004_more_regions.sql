-- Adds additional key cities/regions per country to enrich subforums

WITH new_regions AS (
  SELECT * FROM (VALUES
    ('united-states', 'Phoenix', 'phoenix', 'Phoenix', 13),
    ('united-states', 'San Diego', 'san-diego', 'San Diego', 14),
    ('united-states', 'Atlanta', 'atlanta', 'Atlanta', 15),
    ('united-states', 'Dallas', 'dallas', 'Dallas', 16),
    ('canada', 'Winnipeg', 'winnipeg', 'Winnipeg', 6),
    ('canada', 'Halifax', 'halifax', 'Halifax', 7),
    ('canada', 'Edmonton', 'edmonton', 'Edmonton', 8),
    ('canada', 'Quebec City', 'quebec', 'Québec', 9),
    ('mexico', 'Leon', 'leon', 'León', 8),
    ('mexico', 'Toluca', 'toluca', 'Toluca', 9),
    ('colombia', 'Cali', 'cali', 'Cali', 3),
    ('colombia', 'Barranquilla', 'barranquilla', 'Barranquilla', 4),
    ('argentina', 'Cordoba', 'cordoba-ar', 'Córdoba', 2),
    ('argentina', 'Rosario', 'rosario', 'Rosario', 3),
    ('brasil', 'Brasilia', 'brasilia', 'Brasília', 3),
    ('brasil', 'Belo Horizonte', 'belo-horizonte', 'Belo Horizonte', 4),
    ('brasil', 'Salvador', 'salvador-br', 'Salvador', 5),
    ('chile', 'Valparaiso', 'valparaiso', 'Valparaíso', 2),
    ('chile', 'Concepcion', 'concepcion', 'Concepción', 3),
    ('peru', 'Cusco', 'cusco', 'Cusco', 2),
    ('peru', 'Arequipa', 'arequipa', 'Arequipa', 3),
    ('dominican-republic', 'Santiago de los Caballeros', 'santiago-caballeros', 'Santiago de los Caballeros', 2),
    ('ecuador', 'Cuenca', 'cuenca', 'Cuenca', 3),
    ('ecuador', 'Manta', 'manta', 'Manta', 4),
    ('espana', 'Seville', 'sevilla', 'Sevilla', 4),
    ('espana', 'Bilbao', 'bilbao', 'Bilbao', 5),
    ('france', 'Lyon', 'lyon', 'Lyon', 3),
    ('france', 'Nice', 'nice', 'Niza', 4),
    ('germany', 'Hamburg', 'hamburg', 'Hamburgo', 4),
    ('germany', 'Cologne', 'cologne', 'Colonia', 5),
    ('italy', 'Naples', 'napoli', 'Nápoles', 3),
    ('italy', 'Florence', 'florencia', 'Florencia', 4),
    ('united-kingdom', 'Birmingham', 'birmingham', 'Birmingham', 3),
    ('united-kingdom', 'Edinburgh', 'edinburgh', 'Edimburgo', 4),
    ('netherlands', 'Rotterdam', 'rotterdam', 'Róterdam', 2),
    ('switzerland', 'Basel', 'basel', 'Basilea', 3),
    ('portugal', 'Porto', 'porto', 'Oporto', 2),
    ('japan', 'Nagoya', 'nagoya', 'Nagoya', 3),
    ('japan', 'Fukuoka', 'fukuoka', 'Fukuoka', 4),
    ('south-korea', 'Busan', 'busan', 'Busan', 2),
    ('thailand', 'Chiang Mai', 'chiang-mai', 'Chiang Mai', 3),
    ('indonesia', 'Surabaya', 'surabaya', 'Surabaya', 3),
    ('indonesia', 'Yogyakarta', 'yogyakarta', 'Yogyakarta', 4),
    ('philippines', 'Cebu', 'cebu', 'Cebú', 2),
    ('philippines', 'Davao', 'davao', 'Dávao', 3),
    ('malaysia', 'Penang', 'penang', 'Penang', 2),
    ('turkey', 'Ankara', 'ankara', 'Ankara', 2)
  ) AS v(country_slug, name_en, slug, name_es, display_order)
)
INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT c.id, v.name_en, v.slug, v.name_es, v.name_en, v.display_order
FROM new_regions v
JOIN countries c ON c.slug = v.country_slug
ON CONFLICT (country_id, slug) DO NOTHING;
