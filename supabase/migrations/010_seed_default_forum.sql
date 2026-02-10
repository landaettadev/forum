-- Seed a default General forum so threads can be created
-- This runs with superuser privileges, bypassing RLS

INSERT INTO forums (name, slug, description, display_order, is_private)
SELECT 'General', 'general', 'Foro general de discusión', 0, false
WHERE NOT EXISTS (SELECT 1 FROM forums WHERE slug = 'general');
