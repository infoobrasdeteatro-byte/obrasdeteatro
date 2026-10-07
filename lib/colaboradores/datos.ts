import { unstable_cache } from 'next/cache'
import { clienteAnonimo } from '@/lib/supabase/anonimo'
import type { ColaboradorPublico } from './colaboradores'

/**
 * Lectura pública de los colaboradores activos, con el cliente anónimo: la
 * RLS solo deja ver los activos, y aquí se vuelve a filtrar para que la
 * consulta diga lo que quiere.
 *
 * CACHEADA 10 MINUTOS (unstable_cache, etiqueta «colaboradores»). La usan la
 * portada, /colaboradores y el pie de página, que está en TODAS las páginas:
 * sin caché, cada página haría su propia consulta. Activar o desactivar un
 * colaborador tarda como mucho esos 10 minutos en verse.
 *
 * Un error NO se cachea: la función cacheada lanza y quien llama recibe una
 * lista vacía solo esa vez (la franja, el enlace del pie o la página no se
 * pintan), y la siguiente petición vuelve a consultar.
 */
export const REVALIDAR_COLABORADORES = 600

export async function leerColaboradoresActivos(): Promise<ColaboradorPublico[]> {
  const { data, error } = await clienteAnonimo()
    .from('colaboradores')
    .select('id, nombre, tipo, descripcion, pais_code, url_web, logo_url, orden')
    .eq('activo', true)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) throw new Error(`colaboradores: no se pudieron leer: ${error.message}`)
  return data ?? []
}

const colaboradoresActivosCacheados = unstable_cache(leerColaboradoresActivos, ['colaboradores-activos'], {
  revalidate: REVALIDAR_COLABORADORES,
  tags: ['colaboradores'],
})

export async function colaboradoresActivos(): Promise<ColaboradorPublico[]> {
  try {
    return await colaboradoresActivosCacheados()
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    return []
  }
}

/** Para el pie de página: ¿hay al menos un colaborador activo? Misma lectura cacheada. */
export async function hayColaboradoresActivos(): Promise<boolean> {
  return (await colaboradoresActivos()).length > 0
}

/**
 * Dominios de las fuentes de Noticias vinculadas a un colaborador activo,
 * para el distintivo «Medio colaborador» en /noticias. Se cruzan por dominio
 * porque la vista noticias_publicas no expone fuente_id.
 */
export async function dominiosDeMediosColaboradores(): Promise<Set<string>> {
  const supabase = clienteAnonimo()
  const { data: colaboradores, error } = await supabase
    .from('colaboradores')
    .select('noticias_fuente_id')
    .eq('activo', true)
    .not('noticias_fuente_id', 'is', null)

  if (error) {
    console.error('colaboradores: no se pudieron leer las fuentes vinculadas:', error.message)
    return new Set()
  }
  const ids = (colaboradores ?? []).map(c => c.noticias_fuente_id).filter((v): v is string => v !== null)
  if (ids.length === 0) return new Set()

  const { data: fuentes, error: errorFuentes } = await supabase
    .from('noticias_fuentes_publicas')
    .select('dominio')
    .in('id', ids)

  if (errorFuentes) {
    console.error('colaboradores: no se pudieron leer las fuentes:', errorFuentes.message)
    return new Set()
  }
  return new Set((fuentes ?? []).map(f => f.dominio).filter((d): d is string => Boolean(d)))
}
