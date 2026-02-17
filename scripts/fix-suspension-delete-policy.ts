/**
 * Applies the missing DELETE RLS policy for user_suspensions table.
 * Usage: npx tsx scripts/fix-suspension-delete-policy.ts
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('Applying DELETE policy for user_suspensions...');

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE POLICY IF NOT EXISTS "Only admins can delete suspensions"
        ON user_suspensions FOR DELETE
        TO authenticated
        USING (EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        ));
    `
  });

  if (error) {
    console.log('RPC exec_sql not available. Please run this SQL manually in the Supabase Dashboard > SQL Editor:');
    console.log(`
CREATE POLICY "Only admins can delete suspensions"
  ON user_suspensions FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));
    `);
  } else {
    console.log('✅ Policy applied successfully!');
  }
}

main().catch(console.error);
