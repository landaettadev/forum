-- Fix: allow moderator verification requests without a photo
ALTER TABLE verifications ALTER COLUMN photo_url DROP NOT NULL;
