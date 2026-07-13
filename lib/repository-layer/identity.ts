import { createClient } from '@/lib/supabase/server'
import type { Identity } from './types'

export async function getIdentity(userId: string): Promise<Identity | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, tipo_perfil, idioma, pais')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    userId: data.id,
    profileType: data.tipo_perfil,
    language: data.idioma,
    country: data.pais,
    timezone: null,
  }
}
