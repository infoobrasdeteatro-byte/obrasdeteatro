import { createClient } from '@/lib/supabase/server'
import type { ProfessionalProfilePublic } from './types'

export async function getProfessionalProfilePublic(userId: string): Promise<ProfessionalProfilePublic | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('nombre, apellidos, nombre_artistico, slug, bio, avatar_url, cover_url, perfil_publico, verificado, website_url')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    firstName: data.nombre,
    lastName: data.apellidos,
    artisticName: data.nombre_artistico,
    slug: data.slug,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    coverUrl: data.cover_url,
    isPublic: data.perfil_publico,
    isVerified: data.verificado,
    websiteUrl: data.website_url,
  }
}
