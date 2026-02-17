-- Fix: Add missing DELETE policy for user_suspensions table
-- Only admins can delete suspension records

DROP POLICY IF EXISTS "Only admins can delete suspensions" ON user_suspensions;

CREATE POLICY "Only admins can delete suspensions"
  ON user_suspensions FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));
