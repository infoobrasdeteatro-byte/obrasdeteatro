import { unstable_cache } from 'next/cache'
import { clienteAnonimo } from '@/lib/supabase/anonimo'
import { leerTodasLasPaginas } from '@/lib/espacios/paginar'

export type PerfilPublicoSitemap = { slug: string; updated_at: string | null }

/**
 * Perfiles con ficha pública en /perfil/[slug]: los mismos filtros que la
 * propia ficha (público, verificado, activo, sin extinción ni baja).
 */
export async function leerPerfilesPublicos(): Promise<PerfilPublicoSitemap[]> {
  const cliente = clienteAnonimo()
  const { data, error } = await leerTodasLasPaginas<PerfilPublicoSitemap>((desde, hasta) =>
    cliente
      .from('profiles')
      .select('slug, updated_at')
      .eq('perfil_publico', true)
      .eq('verificado', true)
      .eq('activo', true)
      .is('extincion_solicitada_at', null)
      .is('deleted_at', null)
      .not('slug', 'is', null)
      .order('slug', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, hasta),
  )

  if (error) throw new Error(`perfiles: no se pudieron leer los públicos: ${error.message}`)
  return data.filter(p => !!p.slug)
}

const perfilesCacheados = unstable_cache(leerPerfilesPublicos, ['perfiles-publicos-sitemap'], {
  revalidate: 3600,
  tags: ['perfiles'],
})

/** Para el sitemap: un fallo deja la lista vacía esa vez, sin romperlo. */
export async function perfilesPublicos(): Promise<PerfilPublicoSitemap[]> {
  try {
    return await perfilesCacheados()
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    return []
  }
}
