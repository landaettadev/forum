-- =============================================
-- Geographic Data Migration - Countries & Cities
-- Organized by capacity level
-- =============================================

-- Clear existing data to avoid conflicts
ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS name_es TEXT,
  ADD COLUMN IF NOT EXISTS name_en TEXT;

DELETE FROM regions;
DELETE FROM countries;
DELETE FROM continents;

-- =============================================
-- CONTINENTS
-- =============================================
INSERT INTO continents (name, slug, name_es, name_en, display_order) VALUES
('América del Norte', 'america-norte', 'América del Norte', 'North America', 1),
('Europa Occidental', 'europa-occidental', 'Europa Occidental', 'Western Europe', 2),
('Asia', 'asia', 'Asia', 'Asia', 3),
('América Latina', 'america-latina', 'América Latina', 'Latin America', 4),
('Europa', 'europa', 'Europa', 'Europe', 5);

-- =============================================
-- 🟢 ALTA CAPACIDAD - AMÉRICA DEL NORTE
-- =============================================

-- United States
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'United States', 'united-states', 'Estados Unidos', 'United States', '🇺🇸', 'US', 'high', 1
FROM continents c WHERE c.slug = 'america-norte';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'New York', 'new-york', 'Nueva York', 'New York', 1
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Miami', 'miami', 'Miami', 'Miami', 2
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Los Angeles', 'los-angeles', 'Los Ángeles', 'Los Angeles', 3
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Las Vegas', 'las-vegas', 'Las Vegas', 'Las Vegas', 4
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Houston', 'houston', 'Houston', 'Houston', 5
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Chicago', 'chicago', 'Chicago', 'Chicago', 6
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'San Francisco', 'san-francisco', 'San Francisco', 'San Francisco', 7
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Washington D.C.', 'washington-dc', 'Washington D.C.', 'Washington D.C.', 8
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Boston', 'boston', 'Boston', 'Boston', 9
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Seattle', 'seattle', 'Seattle', 'Seattle', 10
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Atlanta', 'atlanta', 'Atlanta', 'Atlanta', 11
FROM countries co WHERE co.slug = 'united-states';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Dallas', 'dallas', 'Dallas', 'Dallas', 12
FROM countries co WHERE co.slug = 'united-states';

-- Mexico
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Mexico', 'mexico', 'México', 'Mexico', '🇲🇽', 'MX', 'high', 2
FROM continents c WHERE c.slug = 'america-norte';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Ciudad de México', 'cdmx', 'Ciudad de México', 'Mexico City', 1
FROM countries co WHERE co.slug = 'mexico';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Guadalajara', 'guadalajara', 'Guadalajara', 'Guadalajara', 2
FROM countries co WHERE co.slug = 'mexico';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Monterrey', 'monterrey', 'Monterrey', 'Monterrey', 3
FROM countries co WHERE co.slug = 'mexico';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Cancún', 'cancun', 'Cancún', 'Cancun', 4
FROM countries co WHERE co.slug = 'mexico';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Tijuana', 'tijuana', 'Tijuana', 'Tijuana', 5
FROM countries co WHERE co.slug = 'mexico';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Puebla', 'puebla', 'Puebla', 'Puebla', 6
FROM countries co WHERE co.slug = 'mexico';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Mérida', 'merida', 'Mérida', 'Merida', 7
FROM countries co WHERE co.slug = 'mexico';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Querétaro', 'queretaro', 'Querétaro', 'Queretaro', 8
FROM countries co WHERE co.slug = 'mexico';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Oaxaca', 'oaxaca', 'Oaxaca', 'Oaxaca', 9
FROM countries co WHERE co.slug = 'mexico';

-- Canada
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Canada', 'canada', 'Canadá', 'Canada', '🇨🇦', 'CA', 'high', 3
FROM continents c WHERE c.slug = 'america-norte';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Toronto', 'toronto', 'Toronto', 'Toronto', 1
FROM countries co WHERE co.slug = 'canada';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Vancouver', 'vancouver', 'Vancouver', 'Vancouver', 2
FROM countries co WHERE co.slug = 'canada';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Montreal', 'montreal', 'Montreal', 'Montreal', 3
FROM countries co WHERE co.slug = 'canada';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Calgary', 'calgary', 'Calgary', 'Calgary', 4
FROM countries co WHERE co.slug = 'canada';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Ottawa', 'ottawa', 'Ottawa', 'Ottawa', 5
FROM countries co WHERE co.slug = 'canada';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Edmonton', 'edmonton', 'Edmonton', 'Edmonton', 6
FROM countries co WHERE co.slug = 'canada';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Québec', 'quebec', 'Québec', 'Quebec City', 7
FROM countries co WHERE co.slug = 'canada';

-- =============================================
-- 🟢 ALTA CAPACIDAD - EUROPA OCCIDENTAL
-- =============================================

-- España
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'España', 'espana', 'España', 'Spain', '🇪🇸', 'ES', 'high', 1
FROM continents c WHERE c.slug = 'europa-occidental';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Madrid', 'madrid', 'Madrid', 'Madrid', 1
FROM countries co WHERE co.slug = 'espana';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Barcelona', 'barcelona', 'Barcelona', 'Barcelona', 2
FROM countries co WHERE co.slug = 'espana';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Valencia', 'valencia', 'Valencia', 'Valencia', 3
FROM countries co WHERE co.slug = 'espana';

-- France
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'France', 'france', 'Francia', 'France', '🇫🇷', 'FR', 'high', 2
FROM continents c WHERE c.slug = 'europa-occidental';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Paris', 'paris', 'París', 'Paris', 1
FROM countries co WHERE co.slug = 'france';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Marseille', 'marseille', 'Marsella', 'Marseille', 2
FROM countries co WHERE co.slug = 'france';

-- Germany
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Germany', 'germany', 'Alemania', 'Germany', '🇩🇪', 'DE', 'high', 3
FROM continents c WHERE c.slug = 'europa-occidental';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Berlin', 'berlin', 'Berlín', 'Berlin', 1
FROM countries co WHERE co.slug = 'germany';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Frankfurt', 'frankfurt', 'Fráncfort', 'Frankfurt', 2
FROM countries co WHERE co.slug = 'germany';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Munich', 'munich', 'Múnich', 'Munich', 3
FROM countries co WHERE co.slug = 'germany';

-- Italy
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Italy', 'italy', 'Italia', 'Italy', '🇮🇹', 'IT', 'high', 4
FROM continents c WHERE c.slug = 'europa-occidental';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Milan', 'milan', 'Milán', 'Milan', 1
FROM countries co WHERE co.slug = 'italy';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Rome', 'rome', 'Roma', 'Rome', 2
FROM countries co WHERE co.slug = 'italy';

-- United Kingdom
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'United Kingdom', 'united-kingdom', 'Reino Unido', 'United Kingdom', '🇬🇧', 'GB', 'high', 5
FROM continents c WHERE c.slug = 'europa-occidental';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'London', 'london', 'Londres', 'London', 1
FROM countries co WHERE co.slug = 'united-kingdom';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Manchester', 'manchester', 'Mánchester', 'Manchester', 2
FROM countries co WHERE co.slug = 'united-kingdom';

-- Netherlands
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Netherlands', 'netherlands', 'Países Bajos', 'Netherlands', '🇳🇱', 'NL', 'high', 6
FROM continents c WHERE c.slug = 'europa-occidental';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Amsterdam', 'amsterdam', 'Ámsterdam', 'Amsterdam', 1
FROM countries co WHERE co.slug = 'netherlands';

-- Switzerland
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Switzerland', 'switzerland', 'Suiza', 'Switzerland', '🇨🇭', 'CH', 'high', 7
FROM continents c WHERE c.slug = 'europa-occidental';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Zurich', 'zurich', 'Zúrich', 'Zurich', 1
FROM countries co WHERE co.slug = 'switzerland';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Geneva', 'geneva', 'Ginebra', 'Geneva', 2
FROM countries co WHERE co.slug = 'switzerland';

-- =============================================
-- 🟢 ALTA CAPACIDAD - ASIA (concentrada en ciudades)
-- =============================================

-- Japan
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Japan', 'japan', 'Japón', 'Japan', '🇯🇵', 'JP', 'high', 1
FROM continents c WHERE c.slug = 'asia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Tokyo', 'tokyo', 'Tokio', 'Tokyo', 1
FROM countries co WHERE co.slug = 'japan';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Osaka', 'osaka', 'Osaka', 'Osaka', 2
FROM countries co WHERE co.slug = 'japan';

-- South Korea
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'South Korea', 'south-korea', 'Corea del Sur', 'South Korea', '🇰🇷', 'KR', 'high', 2
FROM continents c WHERE c.slug = 'asia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Seoul', 'seoul', 'Seúl', 'Seoul', 1
FROM countries co WHERE co.slug = 'south-korea';

-- Thailand
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Thailand', 'thailand', 'Tailandia', 'Thailand', '🇹🇭', 'TH', 'high', 3
FROM continents c WHERE c.slug = 'asia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Bangkok', 'bangkok', 'Bangkok', 'Bangkok', 1
FROM countries co WHERE co.slug = 'thailand';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Phuket', 'phuket', 'Phuket', 'Phuket', 2
FROM countries co WHERE co.slug = 'thailand';

-- Singapore
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Singapore', 'singapore', 'Singapur', 'Singapore', '🇸🇬', 'SG', 'high', 4
FROM continents c WHERE c.slug = 'asia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Singapore City', 'singapore-city', 'Singapur', 'Singapore City', 1
FROM countries co WHERE co.slug = 'singapore';

-- Hong Kong
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Hong Kong', 'hong-kong', 'Hong Kong', 'Hong Kong', '🇭🇰', 'HK', 'high', 5
FROM continents c WHERE c.slug = 'asia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Hong Kong', 'hong-kong-city', 'Hong Kong', 'Hong Kong', 1
FROM countries co WHERE co.slug = 'hong-kong';

-- =============================================
-- 🟡 MEDIA CAPACIDAD - AMÉRICA LATINA
-- =============================================

-- Colombia
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Colombia', 'colombia', 'Colombia', 'Colombia', '🇨🇴', 'CO', 'medium', 1
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Bogotá', 'bogota', 'Bogotá', 'Bogota', 1
FROM countries co WHERE co.slug = 'colombia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Medellín', 'medellin', 'Medellín', 'Medellin', 2
FROM countries co WHERE co.slug = 'colombia';

-- Argentina
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Argentina', 'argentina', 'Argentina', 'Argentina', '🇦🇷', 'AR', 'medium', 2
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Buenos Aires', 'buenos-aires', 'Buenos Aires', 'Buenos Aires', 1
FROM countries co WHERE co.slug = 'argentina';

-- Brasil
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Brasil', 'brasil', 'Brasil', 'Brazil', '🇧🇷', 'BR', 'medium', 3
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'São Paulo', 'sao-paulo', 'São Paulo', 'Sao Paulo', 1
FROM countries co WHERE co.slug = 'brasil';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Rio de Janeiro', 'rio-de-janeiro', 'Río de Janeiro', 'Rio de Janeiro', 2
FROM countries co WHERE co.slug = 'brasil';

-- Chile
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Chile', 'chile', 'Chile', 'Chile', '🇨🇱', 'CL', 'medium', 4
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Santiago', 'santiago', 'Santiago', 'Santiago', 1
FROM countries co WHERE co.slug = 'chile';

-- Peru
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Peru', 'peru', 'Perú', 'Peru', '🇵🇪', 'PE', 'medium', 5
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Lima', 'lima', 'Lima', 'Lima', 1
FROM countries co WHERE co.slug = 'peru';

-- Panama
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Panama', 'panama', 'Panamá', 'Panama', '🇵🇦', 'PA', 'medium', 6
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Ciudad de Panamá', 'panama-city', 'Ciudad de Panamá', 'Panama City', 1
FROM countries co WHERE co.slug = 'panama';

-- Costa Rica
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Costa Rica', 'costa-rica', 'Costa Rica', 'Costa Rica', '🇨🇷', 'CR', 'medium', 7
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'San José', 'san-jose', 'San José', 'San Jose', 1
FROM countries co WHERE co.slug = 'costa-rica';

-- Dominican Republic
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Dominican Republic', 'dominican-republic', 'República Dominicana', 'Dominican Republic', '🇩🇴', 'DO', 'medium', 8
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Santo Domingo', 'santo-domingo', 'Santo Domingo', 'Santo Domingo', 1
FROM countries co WHERE co.slug = 'dominican-republic';

-- Puerto Rico
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Puerto Rico', 'puerto-rico', 'Puerto Rico', 'Puerto Rico', '🇵🇷', 'PR', 'medium', 9
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'San Juan', 'san-juan', 'San Juan', 'San Juan', 1
FROM countries co WHERE co.slug = 'puerto-rico';

-- Uruguay
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Uruguay', 'uruguay', 'Uruguay', 'Uruguay', '🇺🇾', 'UY', 'medium', 10
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Montevideo', 'montevideo', 'Montevideo', 'Montevideo', 1
FROM countries co WHERE co.slug = 'uruguay';

-- Ecuador
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Ecuador', 'ecuador', 'Ecuador', 'Ecuador', '🇪🇨', 'EC', 'medium', 11
FROM continents c WHERE c.slug = 'america-latina';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Quito', 'quito', 'Quito', 'Quito', 1
FROM countries co WHERE co.slug = 'ecuador';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Guayaquil', 'guayaquil', 'Guayaquil', 'Guayaquil', 2
FROM countries co WHERE co.slug = 'ecuador';

-- =============================================
-- 🟡 MEDIA CAPACIDAD - EUROPA
-- =============================================

-- Portugal
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Portugal', 'portugal', 'Portugal', 'Portugal', '🇵🇹', 'PT', 'medium', 1
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Lisbon', 'lisbon', 'Lisboa', 'Lisbon', 1
FROM countries co WHERE co.slug = 'portugal';

-- Poland
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Poland', 'poland', 'Polonia', 'Poland', '🇵🇱', 'PL', 'medium', 2
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Warsaw', 'warsaw', 'Varsovia', 'Warsaw', 1
FROM countries co WHERE co.slug = 'poland';

-- Romania
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Romania', 'romania', 'Rumania', 'Romania', '🇷🇴', 'RO', 'medium', 3
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Bucharest', 'bucharest', 'Bucarest', 'Bucharest', 1
FROM countries co WHERE co.slug = 'romania';

-- Czech Republic
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Czech Republic', 'czech-republic', 'República Checa', 'Czech Republic', '🇨🇿', 'CZ', 'medium', 4
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Prague', 'prague', 'Praga', 'Prague', 1
FROM countries co WHERE co.slug = 'czech-republic';

-- Austria
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Austria', 'austria', 'Austria', 'Austria', '🇦🇹', 'AT', 'medium', 5
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Vienna', 'vienna', 'Viena', 'Vienna', 1
FROM countries co WHERE co.slug = 'austria';

-- Sweden
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Sweden', 'sweden', 'Suecia', 'Sweden', '🇸🇪', 'SE', 'medium', 6
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Stockholm', 'stockholm', 'Estocolmo', 'Stockholm', 1
FROM countries co WHERE co.slug = 'sweden';

-- Denmark
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Denmark', 'denmark', 'Dinamarca', 'Denmark', '🇩🇰', 'DK', 'medium', 7
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Copenhagen', 'copenhagen', 'Copenhague', 'Copenhagen', 1
FROM countries co WHERE co.slug = 'denmark';

-- Finland
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Finland', 'finland', 'Finlandia', 'Finland', '🇫🇮', 'FI', 'medium', 8
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Helsinki', 'helsinki', 'Helsinki', 'Helsinki', 1
FROM countries co WHERE co.slug = 'finland';

-- Ireland
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Ireland', 'ireland', 'Irlanda', 'Ireland', '🇮🇪', 'IE', 'medium', 9
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Dublin', 'dublin', 'Dublín', 'Dublin', 1
FROM countries co WHERE co.slug = 'ireland';

-- Greece
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Greece', 'greece', 'Grecia', 'Greece', '🇬🇷', 'GR', 'medium', 10
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Athens', 'athens', 'Atenas', 'Athens', 1
FROM countries co WHERE co.slug = 'greece';

-- Croatia
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Croatia', 'croatia', 'Croacia', 'Croatia', '🇭🇷', 'HR', 'medium', 11
FROM continents c WHERE c.slug = 'europa';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Zagreb', 'zagreb', 'Zagreb', 'Zagreb', 1
FROM countries co WHERE co.slug = 'croatia';

-- =============================================
-- 🟡 MEDIA CAPACIDAD - ASIA (puntual)
-- =============================================

-- Turkey
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Turkey', 'turkey', 'Turquía', 'Turkey', '🇹🇷', 'TR', 'medium', 6
FROM continents c WHERE c.slug = 'asia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Istanbul', 'istanbul', 'Estambul', 'Istanbul', 1
FROM countries co WHERE co.slug = 'turkey';

-- Malaysia
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Malaysia', 'malaysia', 'Malasia', 'Malaysia', '🇲🇾', 'MY', 'medium', 7
FROM continents c WHERE c.slug = 'asia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Kuala Lumpur', 'kuala-lumpur', 'Kuala Lumpur', 'Kuala Lumpur', 1
FROM countries co WHERE co.slug = 'malaysia';

-- Israel
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Israel', 'israel', 'Israel', 'Israel', '🇮🇱', 'IL', 'medium', 8
FROM continents c WHERE c.slug = 'asia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Tel Aviv', 'tel-aviv', 'Tel Aviv', 'Tel Aviv', 1
FROM countries co WHERE co.slug = 'israel';

-- Philippines
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Philippines', 'philippines', 'Filipinas', 'Philippines', '🇵🇭', 'PH', 'medium', 9
FROM continents c WHERE c.slug = 'asia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Manila', 'manila', 'Manila', 'Manila', 1
FROM countries co WHERE co.slug = 'philippines';

-- Indonesia
INSERT INTO countries (continent_id, name, slug, name_es, name_en, flag_emoji, iso_code, capacity_level, display_order)
SELECT c.id, 'Indonesia', 'indonesia', 'Indonesia', 'Indonesia', '🇮🇩', 'ID', 'medium', 10
FROM continents c WHERE c.slug = 'asia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Jakarta', 'jakarta', 'Yakarta', 'Jakarta', 1
FROM countries co WHERE co.slug = 'indonesia';

INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT co.id, 'Bali', 'bali', 'Bali', 'Bali', 2
FROM countries co WHERE co.slug = 'indonesia';
