-- Add extensive list of cities/regions for all countries
-- This migration adds many more cities to provide rich subforum options

WITH new_regions AS (
  SELECT * FROM (VALUES
    -- United States (adding more major cities)
    ('united-states', 'Phoenix', 'phoenix', 'Phoenix', 13),
    ('united-states', 'San Diego', 'san-diego', 'San Diego', 14),
    ('united-states', 'Atlanta', 'atlanta', 'Atlanta', 15),
    ('united-states', 'Dallas', 'dallas', 'Dallas', 16),
    ('united-states', 'San Antonio', 'san-antonio', 'San Antonio', 17),
    ('united-states', 'Philadelphia', 'philadelphia', 'Filadelfia', 18),
    ('united-states', 'Austin', 'austin', 'Austin', 19),
    ('united-states', 'Jacksonville', 'jacksonville', 'Jacksonville', 20),
    ('united-states', 'Columbus', 'columbus', 'Columbus', 21),
    ('united-states', 'Charlotte', 'charlotte', 'Charlotte', 22),
    ('united-states', 'Indianapolis', 'indianapolis', 'Indianápolis', 23),
    ('united-states', 'Denver', 'denver', 'Denver', 24),
    ('united-states', 'Nashville', 'nashville', 'Nashville', 25),
    ('united-states', 'Portland', 'portland-or', 'Portland', 26),
    ('united-states', 'Las Vegas', 'las-vegas', 'Las Vegas', 27),
    ('united-states', 'Detroit', 'detroit', 'Detroit', 28),
    ('united-states', 'Memphis', 'memphis', 'Memphis', 29),
    ('united-states', 'Louisville', 'louisville', 'Louisville', 30),
    ('united-states', 'Milwaukee', 'milwaukee', 'Milwaukee', 31),
    ('united-states', 'Baltimore', 'baltimore', 'Baltimore', 32),
    ('united-states', 'Albuquerque', 'albuquerque', 'Albuquerque', 33),
    ('united-states', 'Tucson', 'tucson', 'Tucson', 34),
    ('united-states', 'Fresno', 'fresno', 'Fresno', 35),
    ('united-states', 'Sacramento', 'sacramento', 'Sacramento', 36),
    ('united-states', 'Kansas City', 'kansas-city', 'Kansas City', 37),
    ('united-states', 'Mesa', 'mesa', 'Mesa', 38),
    ('united-states', 'Omaha', 'omaha', 'Omaha', 39),
    ('united-states', 'Raleigh', 'raleigh', 'Raleigh', 40),
    ('united-states', 'Virginia Beach', 'virginia-beach', 'Virginia Beach', 41),
    ('united-states', 'Minneapolis', 'minneapolis', 'Minneapolis', 42),
    ('united-states', 'Tampa', 'tampa', 'Tampa', 43),
    ('united-states', 'Cleveland', 'cleveland', 'Cleveland', 44),
    ('united-states', 'New Orleans', 'new-orleans', 'Nueva Orleans', 45),
    ('united-states', 'Salt Lake City', 'salt-lake-city', 'Salt Lake City', 46),
    ('united-states', 'Pittsburgh', 'pittsburgh', 'Pittsburgh', 47),
    ('united-states', 'Cincinnati', 'cincinnati', 'Cincinnati', 48),
    
    -- Canada (adding more cities)
    ('canada', 'Winnipeg', 'winnipeg', 'Winnipeg', 6),
    ('canada', 'Halifax', 'halifax', 'Halifax', 7),
    ('canada', 'Edmonton', 'edmonton', 'Edmonton', 8),
    ('canada', 'Quebec City', 'quebec', 'Québec', 9),
    ('canada', 'Victoria', 'victoria', 'Victoria', 10),
    ('canada', 'Regina', 'regina', 'Regina', 11),
    ('canada', 'Saskatoon', 'saskatoon', 'Saskatoon', 12),
    ('canada', 'St. Johns', 'st-johns', 'St. John''s', 13),
    ('canada', 'London', 'london-ca', 'London', 14),
    ('canada', 'Kitchener', 'kitchener', 'Kitchener', 15),
    ('canada', 'Windsor', 'windsor', 'Windsor', 16),
    ('canada', 'Oshawa', 'oshawa', 'Oshawa', 17),
    ('canada', 'Barrie', 'barrie', 'Barrie', 18),
    ('canada', 'Kelowna', 'kelowna', 'Kelowna', 19),
    ('canada', 'Abbotsford', 'abbotsford', 'Abbotsford', 20),
    
    -- Mexico (adding more cities)
    ('mexico', 'Leon', 'leon', 'León', 8),
    ('mexico', 'Toluca', 'toluca', 'Toluca', 9),
    ('mexico', 'Puebla', 'puebla', 'Puebla', 10),
    ('mexico', 'Tijuana', 'tijuana', 'Tijuana', 11),
    ('mexico', 'Ciudad Juarez', 'ciudad-juarez', 'Ciudad Juárez', 12),
    ('mexico', 'Zapopan', 'zapopan', 'Zapopan', 13),
    ('mexico', 'Merida', 'merida-mx', 'Mérida', 14),
    ('mexico', 'San Luis Potosi', 'san-luis-potosi', 'San Luis Potosí', 15),
    ('mexico', 'Aguascalientes', 'aguascalientes', 'Aguascalientes', 16),
    ('mexico', 'Hermosillo', 'hermosillo', 'Hermosillo', 17),
    ('mexico', 'Saltillo', 'saltillo', 'Saltillo', 18),
    ('mexico', 'Mexicali', 'mexicali', 'Mexicali', 19),
    ('mexico', 'Culiacan', 'culiacan', 'Culiacán', 20),
    ('mexico', 'Queretaro', 'queretaro', 'Querétaro', 21),
    ('mexico', 'Morelia', 'morelia', 'Morelia', 22),
    ('mexico', 'Chihuahua', 'chihuahua', 'Chihuahua', 23),
    ('mexico', 'Torreon', 'torreon', 'Torreón', 24),
    ('mexico', 'Cancun', 'cancun', 'Cancún', 25),
    ('mexico', 'Acapulco', 'acapulco', 'Acapulco', 26),
    ('mexico', 'Veracruz', 'veracruz', 'Veracruz', 27),
    
    -- Colombia (expanding)
    ('colombia', 'Cali', 'cali', 'Cali', 3),
    ('colombia', 'Barranquilla', 'barranquilla', 'Barranquilla', 4),
    ('colombia', 'Cartagena', 'cartagena-co', 'Cartagena', 5),
    ('colombia', 'Cucuta', 'cucuta', 'Cúcuta', 6),
    ('colombia', 'Bucaramanga', 'bucaramanga', 'Bucaramanga', 7),
    ('colombia', 'Pereira', 'pereira', 'Pereira', 8),
    ('colombia', 'Santa Marta', 'santa-marta', 'Santa Marta', 9),
    ('colombia', 'Ibague', 'ibague', 'Ibagué', 10),
    ('colombia', 'Pasto', 'pasto', 'Pasto', 11),
    ('colombia', 'Manizales', 'manizales', 'Manizales', 12),
    ('colombia', 'Neiva', 'neiva', 'Neiva', 13),
    ('colombia', 'Villavicencio', 'villavicencio', 'Villavicencio', 14),
    
    -- Argentina (expanding)
    ('argentina', 'Cordoba', 'cordoba-ar', 'Córdoba', 2),
    ('argentina', 'Rosario', 'rosario', 'Rosario', 3),
    ('argentina', 'Mendoza', 'mendoza', 'Mendoza', 4),
    ('argentina', 'La Plata', 'la-plata', 'La Plata', 5),
    ('argentina', 'San Miguel de Tucuman', 'tucuman', 'San Miguel de Tucumán', 6),
    ('argentina', 'Mar del Plata', 'mar-del-plata', 'Mar del Plata', 7),
    ('argentina', 'Salta', 'salta', 'Salta', 8),
    ('argentina', 'Santa Fe', 'santa-fe-ar', 'Santa Fe', 9),
    ('argentina', 'San Juan', 'san-juan-ar', 'San Juan', 10),
    ('argentina', 'Resistencia', 'resistencia', 'Resistencia', 11),
    ('argentina', 'Neuquen', 'neuquen', 'Neuquén', 12),
    ('argentina', 'Posadas', 'posadas', 'Posadas', 13),
    ('argentina', 'Bahia Blanca', 'bahia-blanca', 'Bahía Blanca', 14),
    
    -- Brasil (expanding)
    ('brasil', 'Brasilia', 'brasilia', 'Brasília', 3),
    ('brasil', 'Belo Horizonte', 'belo-horizonte', 'Belo Horizonte', 4),
    ('brasil', 'Salvador', 'salvador-br', 'Salvador', 5),
    ('brasil', 'Fortaleza', 'fortaleza', 'Fortaleza', 6),
    ('brasil', 'Curitiba', 'curitiba', 'Curitiba', 7),
    ('brasil', 'Manaus', 'manaus', 'Manaos', 8),
    ('brasil', 'Recife', 'recife', 'Recife', 9),
    ('brasil', 'Porto Alegre', 'porto-alegre', 'Porto Alegre', 10),
    ('brasil', 'Belem', 'belem', 'Belém', 11),
    ('brasil', 'Goiania', 'goiania', 'Goiânia', 12),
    ('brasil', 'Guarulhos', 'guarulhos', 'Guarulhos', 13),
    ('brasil', 'Campinas', 'campinas', 'Campinas', 14),
    ('brasil', 'Sao Luis', 'sao-luis', 'São Luís', 15),
    ('brasil', 'Natal', 'natal', 'Natal', 16),
    ('brasil', 'Maceio', 'maceio', 'Maceió', 17),
    ('brasil', 'Campo Grande', 'campo-grande', 'Campo Grande', 18),
    ('brasil', 'Joao Pessoa', 'joao-pessoa', 'João Pessoa', 19),
    ('brasil', 'Teresina', 'teresina', 'Teresina', 20),
    
    -- Chile (expanding)
    ('chile', 'Valparaiso', 'valparaiso', 'Valparaíso', 2),
    ('chile', 'Concepcion', 'concepcion', 'Concepción', 3),
    ('chile', 'La Serena', 'la-serena', 'La Serena', 4),
    ('chile', 'Antofagasta', 'antofagasta', 'Antofagasta', 5),
    ('chile', 'Temuco', 'temuco', 'Temuco', 6),
    ('chile', 'Rancagua', 'rancagua', 'Rancagua', 7),
    ('chile', 'Talca', 'talca', 'Talca', 8),
    ('chile', 'Arica', 'arica', 'Arica', 9),
    ('chile', 'Puerto Montt', 'puerto-montt', 'Puerto Montt', 10),
    ('chile', 'Coquimbo', 'coquimbo', 'Coquimbo', 11),
    ('chile', 'Osorno', 'osorno', 'Osorno', 12),
    
    -- Peru (expanding)
    ('peru', 'Cusco', 'cusco', 'Cusco', 2),
    ('peru', 'Arequipa', 'arequipa', 'Arequipa', 3),
    ('peru', 'Trujillo', 'trujillo', 'Trujillo', 4),
    ('peru', 'Chiclayo', 'chiclayo', 'Chiclayo', 5),
    ('peru', 'Piura', 'piura', 'Piura', 6),
    ('peru', 'Iquitos', 'iquitos', 'Iquitos', 7),
    ('peru', 'Huancayo', 'huancayo', 'Huancayo', 8),
    ('peru', 'Tacna', 'tacna', 'Tacna', 9),
    ('peru', 'Pucallpa', 'pucallpa', 'Pucallpa', 10),
    ('peru', 'Cajamarca', 'cajamarca', 'Cajamarca', 11),
    
    -- Spain (expanding)
    ('espana', 'Seville', 'sevilla', 'Sevilla', 4),
    ('espana', 'Bilbao', 'bilbao', 'Bilbao', 5),
    ('espana', 'Malaga', 'malaga', 'Málaga', 6),
    ('espana', 'Murcia', 'murcia', 'Murcia', 7),
    ('espana', 'Palma', 'palma', 'Palma de Mallorca', 8),
    ('espana', 'Las Palmas', 'las-palmas', 'Las Palmas', 9),
    ('espana', 'Alicante', 'alicante', 'Alicante', 10),
    ('espana', 'Cordoba', 'cordoba-es', 'Córdoba', 11),
    ('espana', 'Vigo', 'vigo', 'Vigo', 12),
    ('espana', 'Gijon', 'gijon', 'Gijón', 13),
    ('espana', 'Granada', 'granada', 'Granada', 14),
    ('espana', 'Vitoria', 'vitoria', 'Vitoria-Gasteiz', 15),
    ('espana', 'La Coruna', 'la-coruna', 'La Coruña', 16),
    ('espana', 'Pamplona', 'pamplona', 'Pamplona', 17),
    ('espana', 'Santander', 'santander', 'Santander', 18),
    ('espana', 'Toledo', 'toledo', 'Toledo', 19),
    ('espana', 'Salamanca', 'salamanca', 'Salamanca', 20),
    
    -- Venezuela (expanding)
    ('venezuela', 'Maracaibo', 'maracaibo', 'Maracaibo', 2),
    ('venezuela', 'Valencia', 'valencia-ve', 'Valencia', 3),
    ('venezuela', 'Barquisimeto', 'barquisimeto', 'Barquisimeto', 4),
    ('venezuela', 'Maracay', 'maracay', 'Maracay', 5),
    ('venezuela', 'Ciudad Guayana', 'ciudad-guayana', 'Ciudad Guayana', 6),
    ('venezuela', 'Maturin', 'maturin', 'Maturín', 7),
    ('venezuela', 'Barcelona', 'barcelona-ve', 'Barcelona', 8),
    ('venezuela', 'Cumana', 'cumana', 'Cumaná', 9),
    ('venezuela', 'Merida', 'merida-ve', 'Mérida', 10),
    
    -- Dominican Republic (expanding)
    ('dominican-republic', 'Santiago de los Caballeros', 'santiago-caballeros', 'Santiago de los Caballeros', 2),
    ('dominican-republic', 'La Romana', 'la-romana', 'La Romana', 3),
    ('dominican-republic', 'San Pedro de Macoris', 'san-pedro-macoris', 'San Pedro de Macorís', 4),
    ('dominican-republic', 'Puerto Plata', 'puerto-plata', 'Puerto Plata', 5),
    ('dominican-republic', 'San Cristobal', 'san-cristobal', 'San Cristóbal', 6),
    
    -- Ecuador (expanding)
    ('ecuador', 'Cuenca', 'cuenca', 'Cuenca', 3),
    ('ecuador', 'Manta', 'manta', 'Manta', 4),
    ('ecuador', 'Machala', 'machala', 'Machala', 5),
    ('ecuador', 'Portoviejo', 'portoviejo', 'Portoviejo', 6),
    ('ecuador', 'Ambato', 'ambato', 'Ambato', 7),
    ('ecuador', 'Riobamba', 'riobamba', 'Riobamba', 8),
    ('ecuador', 'Loja', 'loja', 'Loja', 9),
    
    -- France (expanding)
    ('france', 'Lyon', 'lyon', 'Lyon', 3),
    ('france', 'Nice', 'nice', 'Niza', 4),
    ('france', 'Toulouse', 'toulouse', 'Toulouse', 5),
    ('france', 'Nantes', 'nantes', 'Nantes', 6),
    ('france', 'Strasbourg', 'strasbourg', 'Estrasburgo', 7),
    ('france', 'Montpellier', 'montpellier', 'Montpellier', 8),
    ('france', 'Bordeaux', 'bordeaux', 'Burdeos', 9),
    ('france', 'Lille', 'lille', 'Lille', 10),
    ('france', 'Rennes', 'rennes', 'Rennes', 11),
    ('france', 'Reims', 'reims', 'Reims', 12),
    ('france', 'Le Havre', 'le-havre', 'Le Havre', 13),
    ('france', 'Saint-Etienne', 'saint-etienne', 'Saint-Étienne', 14),
    ('france', 'Toulon', 'toulon', 'Tolón', 15),
    
    -- Germany (expanding)
    ('germany', 'Hamburg', 'hamburg', 'Hamburgo', 4),
    ('germany', 'Cologne', 'cologne', 'Colonia', 5),
    ('germany', 'Frankfurt', 'frankfurt', 'Fráncfort', 6),
    ('germany', 'Stuttgart', 'stuttgart', 'Stuttgart', 7),
    ('germany', 'Dusseldorf', 'dusseldorf', 'Düsseldorf', 8),
    ('germany', 'Dortmund', 'dortmund', 'Dortmund', 9),
    ('germany', 'Essen', 'essen', 'Essen', 10),
    ('germany', 'Leipzig', 'leipzig', 'Leipzig', 11),
    ('germany', 'Bremen', 'bremen', 'Bremen', 12),
    ('germany', 'Dresden', 'dresden', 'Dresde', 13),
    ('germany', 'Hannover', 'hannover', 'Hanóver', 14),
    ('germany', 'Nuremberg', 'nuremberg', 'Núremberg', 15),
    ('germany', 'Duisburg', 'duisburg', 'Duisburgo', 16),
    
    -- Italy (expanding)
    ('italy', 'Naples', 'napoli', 'Nápoles', 3),
    ('italy', 'Florence', 'florencia', 'Florencia', 4),
    ('italy', 'Turin', 'torino', 'Turín', 5),
    ('italy', 'Bologna', 'bologna', 'Bolonia', 6),
    ('italy', 'Palermo', 'palermo', 'Palermo', 7),
    ('italy', 'Genoa', 'genova', 'Génova', 8),
    ('italy', 'Verona', 'verona', 'Verona', 9),
    ('italy', 'Venice', 'venezia', 'Venecia', 10),
    ('italy', 'Catania', 'catania', 'Catania', 11),
    ('italy', 'Bari', 'bari', 'Bari', 12),
    ('italy', 'Messina', 'messina', 'Mesina', 13),
    ('italy', 'Padua', 'padova', 'Padua', 14),
    
    -- United Kingdom (expanding)
    ('united-kingdom', 'Birmingham', 'birmingham', 'Birmingham', 3),
    ('united-kingdom', 'Edinburgh', 'edinburgh', 'Edimburgo', 4),
    ('united-kingdom', 'Glasgow', 'glasgow', 'Glasgow', 5),
    ('united-kingdom', 'Liverpool', 'liverpool', 'Liverpool', 6),
    ('united-kingdom', 'Leeds', 'leeds', 'Leeds', 7),
    ('united-kingdom', 'Sheffield', 'sheffield', 'Sheffield', 8),
    ('united-kingdom', 'Bristol', 'bristol', 'Bristol', 9),
    ('united-kingdom', 'Newcastle', 'newcastle', 'Newcastle', 10),
    ('united-kingdom', 'Belfast', 'belfast', 'Belfast', 11),
    ('united-kingdom', 'Cardiff', 'cardiff', 'Cardiff', 12),
    ('united-kingdom', 'Nottingham', 'nottingham', 'Nottingham', 13),
    ('united-kingdom', 'Leicester', 'leicester', 'Leicester', 14),
    
    -- Netherlands (expanding)
    ('netherlands', 'Rotterdam', 'rotterdam', 'Róterdam', 2),
    ('netherlands', 'The Hague', 'the-hague', 'La Haya', 3),
    ('netherlands', 'Utrecht', 'utrecht', 'Utrecht', 4),
    ('netherlands', 'Eindhoven', 'eindhoven', 'Eindhoven', 5),
    ('netherlands', 'Groningen', 'groningen', 'Groninga', 6),
    ('netherlands', 'Tilburg', 'tilburg', 'Tilburgo', 7),
    
    -- Switzerland (expanding)
    ('switzerland', 'Basel', 'basel', 'Basilea', 3),
    ('switzerland', 'Lausanne', 'lausanne', 'Lausana', 4),
    ('switzerland', 'Bern', 'bern', 'Berna', 5),
    ('switzerland', 'Lucerne', 'lucerne', 'Lucerna', 6),
    ('switzerland', 'Lugano', 'lugano', 'Lugano', 7),
    
    -- Portugal (expanding)
    ('portugal', 'Porto', 'porto', 'Oporto', 2),
    ('portugal', 'Braga', 'braga', 'Braga', 3),
    ('portugal', 'Coimbra', 'coimbra', 'Coímbra', 4),
    ('portugal', 'Faro', 'faro', 'Faro', 5),
    ('portugal', 'Funchal', 'funchal', 'Funchal', 6),
    
    -- Japan (expanding)
    ('japan', 'Nagoya', 'nagoya', 'Nagoya', 3),
    ('japan', 'Fukuoka', 'fukuoka', 'Fukuoka', 4),
    ('japan', 'Sapporo', 'sapporo', 'Sapporo', 5),
    ('japan', 'Kobe', 'kobe', 'Kobe', 6),
    ('japan', 'Kyoto', 'kyoto', 'Kioto', 7),
    ('japan', 'Kawasaki', 'kawasaki', 'Kawasaki', 8),
    ('japan', 'Saitama', 'saitama', 'Saitama', 9),
    ('japan', 'Hiroshima', 'hiroshima', 'Hiroshima', 10),
    ('japan', 'Sendai', 'sendai', 'Sendai', 11),
    
    -- South Korea (expanding)
    ('south-korea', 'Busan', 'busan', 'Busan', 2),
    ('south-korea', 'Incheon', 'incheon', 'Incheon', 3),
    ('south-korea', 'Daegu', 'daegu', 'Daegu', 4),
    ('south-korea', 'Daejeon', 'daejeon', 'Daejeon', 5),
    ('south-korea', 'Gwangju', 'gwangju', 'Gwangju', 6),
    ('south-korea', 'Suwon', 'suwon', 'Suwon', 7),
    
    -- Thailand (expanding)
    ('thailand', 'Chiang Mai', 'chiang-mai', 'Chiang Mai', 3),
    ('thailand', 'Phuket', 'phuket', 'Phuket', 4),
    ('thailand', 'Pattaya', 'pattaya', 'Pattaya', 5),
    ('thailand', 'Nakhon Ratchasima', 'nakhon-ratchasima', 'Nakhon Ratchasima', 6),
    ('thailand', 'Chiang Rai', 'chiang-rai', 'Chiang Rai', 7),
    ('thailand', 'Hat Yai', 'hat-yai', 'Hat Yai', 8),
    
    -- Indonesia (expanding)
    ('indonesia', 'Surabaya', 'surabaya', 'Surabaya', 3),
    ('indonesia', 'Yogyakarta', 'yogyakarta', 'Yogyakarta', 4),
    ('indonesia', 'Bandung', 'bandung', 'Bandung', 5),
    ('indonesia', 'Medan', 'medan', 'Medan', 6),
    ('indonesia', 'Semarang', 'semarang', 'Semarang', 7),
    ('indonesia', 'Makassar', 'makassar', 'Makassar', 8),
    ('indonesia', 'Palembang', 'palembang', 'Palembang', 9),
    ('indonesia', 'Denpasar', 'denpasar', 'Denpasar', 10),
    
    -- Philippines (expanding)
    ('philippines', 'Cebu', 'cebu', 'Cebú', 2),
    ('philippines', 'Davao', 'davao', 'Dávao', 3),
    ('philippines', 'Quezon City', 'quezon-city', 'Ciudad Quezón', 4),
    ('philippines', 'Zamboanga', 'zamboanga', 'Zamboanga', 5),
    ('philippines', 'Cagayan de Oro', 'cagayan-de-oro', 'Cagayán de Oro', 6),
    ('philippines', 'Iloilo', 'iloilo', 'Iloilo', 7),
    ('philippines', 'Bacolod', 'bacolod', 'Bacolod', 8),
    
    -- Malaysia (expanding)
    ('malaysia', 'Penang', 'penang', 'Penang', 2),
    ('malaysia', 'Johor Bahru', 'johor-bahru', 'Johor Bahru', 3),
    ('malaysia', 'Ipoh', 'ipoh', 'Ipoh', 4),
    ('malaysia', 'Malacca', 'malacca', 'Malaca', 5),
    ('malaysia', 'Kota Kinabalu', 'kota-kinabalu', 'Kota Kinabalu', 6),
    
    -- Turkey (expanding)
    ('turkey', 'Ankara', 'ankara', 'Ankara', 2),
    ('turkey', 'Izmir', 'izmir', 'Esmirna', 3),
    ('turkey', 'Bursa', 'bursa', 'Bursa', 4),
    ('turkey', 'Antalya', 'antalya', 'Antalya', 5),
    ('turkey', 'Adana', 'adana', 'Adana', 6),
    ('turkey', 'Gaziantep', 'gaziantep', 'Gaziantep', 7),
    ('turkey', 'Konya', 'konya', 'Konya', 8),
    
    -- Costa Rica (expanding)
    ('costa-rica', 'Limon', 'limon', 'Limón', 2),
    ('costa-rica', 'Alajuela', 'alajuela', 'Alajuela', 3),
    ('costa-rica', 'Heredia', 'heredia', 'Heredia', 4),
    ('costa-rica', 'Puntarenas', 'puntarenas', 'Puntarenas', 5),
    ('costa-rica', 'Cartago', 'cartago-cr', 'Cartago', 6),
    
    -- Panama (expanding)
    ('panama', 'Colon', 'colon', 'Colón', 2),
    ('panama', 'David', 'david', 'David', 3),
    ('panama', 'Santiago', 'santiago-pa', 'Santiago', 4),
    ('panama', 'Chitre', 'chitre', 'Chitré', 5),
    
    -- Uruguay (expanding)
    ('uruguay', 'Salto', 'salto', 'Salto', 2),
    ('uruguay', 'Paysandu', 'paysandu', 'Paysandú', 3),
    ('uruguay', 'Maldonado', 'maldonado', 'Maldonado', 4),
    ('uruguay', 'Rivera', 'rivera', 'Rivera', 5),
    
    -- Paraguay (expanding)
    ('paraguay', 'Ciudad del Este', 'ciudad-del-este', 'Ciudad del Este', 2),
    ('paraguay', 'San Lorenzo', 'san-lorenzo-py', 'San Lorenzo', 3),
    ('paraguay', 'Encarnacion', 'encarnacion', 'Encarnación', 4),
    ('paraguay', 'Capiata', 'capiata', 'Capiatá', 5),
    
    -- Bolivia (expanding)
    ('bolivia', 'Cochabamba', 'cochabamba', 'Cochabamba', 2),
    ('bolivia', 'El Alto', 'el-alto', 'El Alto', 3),
    ('bolivia', 'Oruro', 'oruro', 'Oruro', 4),
    ('bolivia', 'Tarija', 'tarija', 'Tarija', 5),
    ('bolivia', 'Potosi', 'potosi', 'Potosí', 6),
    
    -- Guatemala (expanding)
    ('guatemala', 'Quetzaltenango', 'quetzaltenango', 'Quetzaltenango', 2),
    ('guatemala', 'Escuintla', 'escuintla', 'Escuintla', 3),
    ('guatemala', 'Antigua', 'antigua', 'Antigua Guatemala', 4),
    ('guatemala', 'Coban', 'coban', 'Cobán', 5),
    
    -- Honduras (expanding)
    ('honduras', 'San Pedro Sula', 'san-pedro-sula', 'San Pedro Sula', 2),
    ('honduras', 'La Ceiba', 'la-ceiba', 'La Ceiba', 3),
    ('honduras', 'Choloma', 'choloma', 'Choloma', 4),
    ('honduras', 'El Progreso', 'el-progreso', 'El Progreso', 5),
    
    -- El Salvador (expanding)
    ('el-salvador', 'Santa Ana', 'santa-ana-sv', 'Santa Ana', 2),
    ('el-salvador', 'San Miguel', 'san-miguel-sv', 'San Miguel', 3),
    ('el-salvador', 'Mejicanos', 'mejicanos', 'Mejicanos', 4),
    ('el-salvador', 'Soyapango', 'soyapango', 'Soyapango', 5),
    
    -- Nicaragua (expanding)
    ('nicaragua', 'Leon', 'leon-ni', 'León', 2),
    ('nicaragua', 'Masaya', 'masaya', 'Masaya', 3),
    ('nicaragua', 'Chinandega', 'chinandega', 'Chinandega', 4),
    ('nicaragua', 'Matagalpa', 'matagalpa', 'Matagalpa', 5),
    
    -- Puerto Rico (expanding)
    ('puerto-rico', 'Bayamon', 'bayamon', 'Bayamón', 2),
    ('puerto-rico', 'Carolina', 'carolina', 'Carolina', 3),
    ('puerto-rico', 'Ponce', 'ponce', 'Ponce', 4),
    ('puerto-rico', 'Caguas', 'caguas', 'Caguas', 5),
    ('puerto-rico', 'Mayaguez', 'mayaguez', 'Mayagüez', 6),
    
    -- Cuba (expanding)
    ('cuba', 'Santiago de Cuba', 'santiago-cuba', 'Santiago de Cuba', 2),
    ('cuba', 'Camaguey', 'camaguey', 'Camagüey', 3),
    ('cuba', 'Holguin', 'holguin', 'Holguín', 4),
    ('cuba', 'Santa Clara', 'santa-clara', 'Santa Clara', 5),
    ('cuba', 'Guantanamo', 'guantanamo', 'Guantánamo', 6)
  ) AS v(country_slug, name_en, slug, name_es, display_order)
)
INSERT INTO regions (country_id, name, slug, name_es, name_en, display_order)
SELECT c.id, v.name_en, v.slug, v.name_es, v.name_en, v.display_order
FROM new_regions v
JOIN countries c ON c.slug = v.country_slug
ON CONFLICT (country_id, slug) DO NOTHING;
