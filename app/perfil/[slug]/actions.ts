'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleFollow(profileId: string, follow: boolean): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id === profileId) return false

  if (follow) {
    const { error } = await supabase
      .from('profile_follows')
      .upsert(
        { follower_id: user.id, following_id: profileId },
        { onConflict: 'follower_id,following_id', ignoreDuplicates: true }
      )
    return !error
  }

  const { error } = await supabase
    .from('profile_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', profileId)
  return !error
}
