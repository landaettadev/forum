-- =============================================
-- Settings: Notification & Privacy preferences on profiles
-- Verification: Add type (escort/moderator) and extra fields
-- =============================================

-- 1. NOTIFICATION PREFERENCES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_replies boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_mentions boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_messages boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_follows boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_email_replies boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_email_messages boolean DEFAULT false;

-- 2. PRIVACY PREFERENCES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_show_online boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_show_activity boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_show_profile boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_allow_messages text DEFAULT 'everyone' CHECK (privacy_allow_messages IN ('everyone', 'verified', 'nobody'));

-- 3. VERIFICATION TYPE & EXTRA FIELDS
-- Allow moderator requests without a photo (originally NOT NULL)
ALTER TABLE verifications ALTER COLUMN photo_url DROP NOT NULL;

ALTER TABLE verifications ADD COLUMN IF NOT EXISTS verification_type text DEFAULT 'escort' CHECK (verification_type IN ('escort', 'moderator'));
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS contact_info text;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS languages text[];
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id);
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS motivation text;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS availability text;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id);
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS rejection_reason text;
