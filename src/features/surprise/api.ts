import { supabase } from '@/lib/supabase';
import { SurpriseContent, SurpriseCategory } from '@/types';

// @edge: fetches ALL surprise_content rows (no pagination/limit) — table growth causes linear response time increase. Fine for current scale (~50 items) but will degrade.
export async function fetchSurpriseContent(
  category?: SurpriseCategory,
): Promise<SurpriseContent[]> {
  let query = supabase
    .from('surprise_content')
    .select('*')
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
