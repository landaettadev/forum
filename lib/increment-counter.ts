import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Atomic counter increment via RPC with read-then-write fallback.
 * Centralises the duplicated pattern found across Server Actions.
 *
 * @param supabase - The Supabase client to use (server or middleware)
 * @param table    - Target table name (must be whitelisted in the RPC)
 * @param column   - Counter column name
 * @param rowId    - UUID of the row to update
 * @param amount   - Increment amount (use negative for decrement)
 */
export async function incrementCounter(
  supabase: SupabaseClient,
  table: string,
  column: string,
  rowId: string,
  amount: number = 1
): Promise<void> {
  const { error: rpcErr } = await supabase.rpc('increment_counter', {
    table_name: table,
    column_name: column,
    row_id: rowId,
    amount,
  });

  if (rpcErr) {
    // Fallback: read-then-write (not atomic, but better than nothing)
    console.warn(`[increment_counter] RPC failed for ${table}.${column}, falling back:`, rpcErr.message);
    const { data: row } = await supabase
      .from(table)
      .select(column)
      .eq('id', rowId)
      .single();

    if (row) {
      const current = (row as unknown as Record<string, number>)[column] || 0;
      await supabase
        .from(table)
        .update({ [column]: Math.max(0, current + amount) })
        .eq('id', rowId);
    }
  }
}
