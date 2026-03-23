import { supabase } from '@/lib/supabase';
import { SurpriseContent, SurpriseCategory } from '@/types';
import { unwrapList } from '@/utils/supabaseQuery';

// @edge: fetches ALL surprise_content rows (no pagination/limit) — table growth causes linear response time increase. Fine for current scale (~50 items) but will degrade.
export async function fetchSurpriseContent(
  category?: SurpriseCategory,
): Promise<SurpriseContent[]> {
  let query = supabase
    .from('surprise_content')
    .select('*')
    .order('created_at', { ascending: false });

  // @boundary: category param is typed as SurpriseCategory enum but Supabase doesn't validate against the TS enum — if a value outside the enum is passed, the query runs but returns 0 rows (no error). The DB column may or may not have a CHECK constraint.
  if (category) {
    query = query.eq('category', category);
  }

  return unwrapList(await query);
}
