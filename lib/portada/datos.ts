import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Datos reales de la portada.
 *
 * CLIENTE ANÓNIMO SIN COOKIES, y es deliberado. El cliente de
 * lib/supabase/server lee las cookies de la petición: eso vuelve dinámica la
 * página (adiós a la revalidación cada 10 minutos) y, peor, haría que la RLS
 * decidiera con la sesión de quien visita, de modo que un administrador
 * podría dejar en caché cifras que el público no puede ver. Con la clave
 * anónima y sin sesión, la RLS evalúa exactamente lo que ve un visitante sin
 * cuenta, que es lo que la portada debe contar.
 *
 * Decisión aprobada por Dirección el 2026-10-06 (revisión del PR #59): no
 * cambiar a lib/supabase/server. Si algún día hiciera falta leer algo que
 * solo ve un usuario con sesión, eso no va en la portada cacheada.
 *
 * Los filtros repiten los de las páginas públicas para que las cifras de la
 * portada y los listados digan lo mismo:
 *   - obras          → /obras            (is_published, sin borrar)
 *   - perfiles       → /directorio       (público, verificado, activo, sin
 *                                          extinción, sin borrar, con slug)
 *   - convocatorias  → /convocatoria     (estado 'publicado', sin borrar) y,
 *                                          además, abiertas: sin fecha límite
 *                                          o con ella aún por llegar, el mismo
 *                                          criterio que «vencida» en su ficha
 *   - noticias       → /noticias         (solo la vista noticias_publicas)
 *
 * Si una consulta falla, su dato llega como `null`: nunca se sustituye por
 * una cifra o un contenido de relleno.
 */

/** Por debajo de estas cifras la portada no enseña el número, sino un texto cualitativo verdadero. */
export const UMBRALES = { obras: 100, perfiles: 50, companias: 25, convocatorias: 5 } as const

export interface ObraPortada {
  title: string
  author: string | null
  slug: string
  genre: string | null
  year: number | null
}

export interface ConvocatoriaPortada {
  id: string
  title: string
  category: string | null
  location: string | null
  deadline: string | null
}

export interface NoticiaPortada {
  id: string
  titular: string
  fuente_nombre: string | null
}

export interface DatosPortada {
  obras: number | null
  perfiles: number | null
  companias: number | null
  convocatoriasPublicadas: number | null
  convocatoriasAbiertas: number | null
  ultimasObras: ObraPortada[] | null
  ultimasConvocatorias: ConvocatoriaPortada[] | null
  ultimasNoticias: NoticiaPortada[] | null
}

/** Una cifra solo se muestra si existe y supera su umbral. */
export function superaUmbral(valor: number | null, umbral: number): valor is number {
  return valor !== null && valor > umbral
}

function clienteAnonimo() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function avisar(dato: string, error: { message: string } | null) {
  if (error) console.error(`portada: no se pudo leer ${dato}:`, error.message)
}

export async function obtenerDatosPortada(): Promise<DatosPortada> {
  const supabase = clienteAnonimo()
  const ahora = new Date().toISOString()

  const obrasPublicas = () =>
    supabase.from('works').select('id', { count: 'exact', head: true })
      .eq('is_published', true)
      .is('deleted_at', null)

  const perfilesPublicos = () =>
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('perfil_publico', true)
      .eq('verificado', true)
      .eq('activo', true)
      .is('extincion_solicitada_at', null)
      .is('deleted_at', null)
      .not('slug', 'is', null)

  const convocatoriasPublicadas = () =>
    supabase.from('calls').select('id', { count: 'exact', head: true })
      .eq('estado', 'publicado')
      .is('deleted_at', null)

  const [
    rObras, rPerfiles, rCompanias, rPublicadas, rAbiertas,
    rUltimasObras, rUltimasConvocatorias, rUltimasNoticias,
  ] = await Promise.all([
    obrasPublicas(),
    perfilesPublicos(),
    perfilesPublicos().eq('tipo_perfil', 'compania'),
    convocatoriasPublicadas(),
    convocatoriasPublicadas().or(`deadline.is.null,deadline.gte.${ahora}`),
    supabase.from('works')
      .select('title, author, slug, genre, year')
      .eq('is_published', true)
      .is('deleted_at', null)
      .not('slug', 'is', null)
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(3),
    supabase.from('calls')
      .select('id, title, category, location, deadline')
      .eq('estado', 'publicado')
      .is('deleted_at', null)
      .or(`deadline.is.null,deadline.gte.${ahora}`)
      .order('fecha_publicacion', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(4),
    supabase.from('noticias_publicas')
      .select('id, titular, fuente_nombre')
      .order('publicado_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(3),
  ])

  avisar('el número de obras', rObras.error)
  avisar('el número de perfiles', rPerfiles.error)
  avisar('el número de compañías', rCompanias.error)
  avisar('el número de convocatorias publicadas', rPublicadas.error)
  avisar('el número de convocatorias abiertas', rAbiertas.error)
  avisar('las últimas obras', rUltimasObras.error)
  avisar('las últimas convocatorias', rUltimasConvocatorias.error)
  avisar('las últimas noticias', rUltimasNoticias.error)

  const cifra = (r: { count: number | null; error: unknown }) => (r.error ? null : r.count)

  return {
    obras: cifra(rObras),
    perfiles: cifra(rPerfiles),
    companias: cifra(rCompanias),
    convocatoriasPublicadas: cifra(rPublicadas),
    convocatoriasAbiertas: cifra(rAbiertas),
    ultimasObras: rUltimasObras.error
      ? null
      : (rUltimasObras.data ?? []).flatMap(o => (o.slug ? [{ ...o, slug: o.slug }] : [])),
    ultimasConvocatorias: rUltimasConvocatorias.error ? null : rUltimasConvocatorias.data ?? [],
    ultimasNoticias: rUltimasNoticias.error
      ? null
      : (rUltimasNoticias.data ?? []).flatMap(n =>
          n.id && n.titular ? [{ id: n.id, titular: n.titular, fuente_nombre: n.fuente_nombre }] : []
        ),
  }
}
