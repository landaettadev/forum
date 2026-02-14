/*
  # TS Rating Database Schema
  
  Complete forum database structure for TS Rating.
  
  1. New Tables
    - `profiles` - Extended user profiles
    - `categories` - Top-level forum categories
    - `forums` - Subforos within categories
    - `threads` - Forum threads
    - `posts` - Posts within threads
    - `post_images` - Images attached to posts
    - `thanks` - Thanks given to posts
    - `private_messages` - Private messages
    - `reports` - Content reports
    - `verifications` - User verification requests
    - `user_follows` - User following relationships
  
  2. Security
    - Enable RLS on all tables
    - Public read for non-private content
    - Authenticated users can create content
    - Private zones for verified users only
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  bio text DEFAULT '',
  signature text DEFAULT '',
  location_country text DEFAULT '',
  location_city text DEFAULT '',
  role text DEFAULT 'user' CHECK (role IN ('user', 'mod', 'admin')),
  is_verified boolean DEFAULT false,
  is_vip boolean DEFAULT false,
  posts_count integer DEFAULT 0,
  thanks_received integer DEFAULT 0,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly viewable"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly viewable"
  ON categories FOR SELECT
  TO public
  USING (NOT is_private OR (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = true
  )));

CREATE POLICY "Only admins can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create forums table
CREATE TABLE IF NOT EXISTS forums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text DEFAULT '',
  country_code text,
  city text,
  threads_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  last_post_id uuid,
  display_order integer DEFAULT 0,
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE forums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Forums are publicly viewable"
  ON forums FOR SELECT
  TO public
  USING (NOT is_private OR (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = true
  )));

CREATE POLICY "Only admins can manage forums"
  ON forums FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create threads table
CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id uuid REFERENCES forums(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  is_hot boolean DEFAULT false,
  views_count integer DEFAULT 0,
  replies_count integer DEFAULT 0,
  last_post_id uuid,
  last_post_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Threads are publicly viewable"
  ON threads FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM forums WHERE id = threads.forum_id AND (
      NOT is_private OR (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = true
      ))
    )
  ));

CREATE POLICY "Authenticated users can create threads"
  ON threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own threads"
  ON threads FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ))
  WITH CHECK (auth.uid() = author_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

CREATE POLICY "Authors and mods can delete threads"
  ON threads FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_first_post boolean DEFAULT false,
  thanks_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are publicly viewable"
  ON posts FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM threads t
    JOIN forums f ON t.forum_id = f.id
    WHERE t.id = posts.thread_id AND (
      NOT f.is_private OR (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_verified = true
      ))
    )
  ));

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ))
  WITH CHECK (auth.uid() = author_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

CREATE POLICY "Authors and mods can delete posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Create post_images table
CREATE TABLE IF NOT EXISTS post_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post images are publicly viewable"
  ON post_images FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can add images"
  ON post_images FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM posts WHERE id = post_images.post_id AND author_id = auth.uid()
  ));

-- Create thanks table
CREATE TABLE IF NOT EXISTS thanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE thanks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thanks are publicly viewable"
  ON thanks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can give thanks"
  ON thanks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own thanks"
  ON thanks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create private_messages table
CREATE TABLE IF NOT EXISTS private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON private_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send messages"
  ON private_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update messages they received"
  ON private_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Mods and admins can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

CREATE POLICY "Mods and admins can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create verification requests"
  ON verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own verifications"
  ON verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

CREATE POLICY "Mods and admins can update verifications"
  ON verifications FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('mod', 'admin')
  ));

-- Create user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are publicly viewable"
  ON user_follows FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can follow others"
  ON user_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON user_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forums_category ON forums(category_id);
CREATE INDEX IF NOT EXISTS idx_threads_forum ON threads(forum_id);
CREATE INDEX IF NOT EXISTS idx_threads_author ON threads(author_id);
CREATE INDEX IF NOT EXISTS idx_threads_last_post ON threads(last_post_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_thanks_post ON thanks(post_id);
CREATE INDEX IF NOT EXISTS idx_thanks_user ON thanks(user_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_to ON private_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_from ON private_messages(from_user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();