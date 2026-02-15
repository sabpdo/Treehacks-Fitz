import { supabase } from '../../lib/supabase';

/**
 * Link a shopping item (by URL) to a wardrobe/closet item.
 * If a row with this shopping_link exists, update its closet_item_id.
 * Otherwise insert a new row.
 *
 * Required table in Supabase:
 *   create table shopping_items (
 *     id uuid primary key default gen_random_uuid(),
 *     shopping_link text not null unique,
 *     closet_item_id uuid references closet_items(id),
 *     created_at timestamptz default now(),
 *     updated_at timestamptz default now()
 *   );
 */
export async function linkShoppingItemToWardrobe(
  shoppingLink: string,
  closetItemId: string
): Promise<void> {
  const link = (shoppingLink || '').trim();
  if (!link) return;

  const { data: existing } = await supabase
    .from('shopping_items')
    .select('id')
    .eq('shopping_link', link)
    .maybeSingle();

  const now = new Date().toISOString();
  if (existing?.id) {
    await supabase
      .from('shopping_items')
      .update({ closet_item_id: closetItemId, updated_at: now })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('shopping_items')
      .insert({
        shopping_link: link,
        closet_item_id: closetItemId,
        created_at: now,
        updated_at: now,
      });
  }
}
