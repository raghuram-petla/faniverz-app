import { supabase } from '@/lib/supabase';
import type { EntityFollow, FeedEntityType } from '@shared/types';

export async function fetchUserFollows(userId: string): Promise<EntityFollow[]> {
  const { data, error } = await supabase
    .from('entity_follows')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function followEntity(
  userId: string,
  entityType: FeedEntityType,
  entityId: string,
): Promise<void> {
  const { error } = await supabase
    .from('entity_follows')
    .insert({ user_id: userId, entity_type: entityType, entity_id: entityId });
  if (error) throw error;
}

export async function unfollowEntity(
  userId: string,
  entityType: FeedEntityType,
  entityId: string,
): Promise<void> {
  const { error } = await supabase
    .from('entity_follows')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  if (error) throw error;
}
