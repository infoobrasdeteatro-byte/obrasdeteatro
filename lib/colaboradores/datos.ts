import { clienteAnonimo } from '@/lib/supabase/anonimo'
import type { ColaboradorPublico } from './colaboradores'

/**
 * Lecturas públicas de colaboradores, con el cliente anónimo: la RLS solo deja
 * ver los activos, y aquí se vuelve a filtrar para que la consulta diga lo
 * que quiere. Si la consulta falla (por ejemplo, antes de aplicar la
 * migración), se devuelve una lista vacía y la franja o la página no se pintan.
 */
export async function colaboradoresActivos(): Promise<ColaboradorPublico[]> {
  const { data, error } = await clienteAnonimo()
    .from('colaboradores')
    .select('id, nombre, tipo, descripcion, pais_code, url_web, logo_url, orden')
    .eq('activo', true)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) {
    console.error('colaboradores: no se pudieron leer:', error.message)
    return []
  }
  return data ?? []
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
