/**
 * Boletín: lectura del contenido de la semana y envío. Siempre con la clave de
 * servicio (los correos de los suscriptores no se leen con ninguna sesión).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { etiquetaTipo, lugarFormacion } from '@/lib/formacion/formacion'
import { rutaEpisodio } from '@/lib/mediateca/mediateca'
import {
  PLANES_DE_PAGO, asuntoBoletin, construirHtmlBoletin, contenidoVacio, crearTokenBaja, enviarLote,
  type CorreoBoletin,
  type ConfigBoletin, type ContenidoBoletin,
} from './boletin'

type Cliente = SupabaseClient<Database>
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000
const PAUSA_MS = 600
const LOTE = 100

/** Lo publicado en los últimos 7 días, de cada sección. */
export async function cargarContenido(supabase: Cliente, ahora: Date): Promise<ContenidoBoletin> {
  const desde = new Date(ahora.getTime() - SEMANA_MS).toISOString()
  const [noticias, convocatorias, formaciones, episodios] = await Promise.all([
    supabase.from('noticias').select('titular, pais_code, fuente_id, publicado_at')
      .eq('estado', 'publicada').gte('publicado_at', desde).order('publicado_at', { ascending: false }).limit(20),
    supabase.from('calls').select('id, title, pais_code, deadline')
      .eq('estado', 'publicado').is('deleted_at', null).gte('fecha_publicacion', desde)
      .or(`deadline.is.null,deadline.gt.${ahora.toISOString()}`)
      .order('deadline', { ascending: true, nullsFirst: false }).limit(20),
    supabase.from('formaciones').select('slug, titulo, tipo, modalidad, ciudad, pais_code')
      .eq('estado', 'publicado').gte('fecha_publicacion', desde).order('fecha_publicacion', { ascending: false }).limit(20),
    supabase.from('mediateca_episodios').select('slug, titulo, programa_id')
      .eq('estado', 'publicado').gte('fecha_publicacion', desde).order('fecha_publicacion', { ascending: false }).limit(20),
  ])
  for (const r of [noticias, convocatorias, formaciones, episodios]) {
    if (r.error) throw new Error(`boletin: no se pudo leer el contenido: ${r.error.message}`)
  }

  const idsFuente = [...new Set((noticias.data ?? []).map(n => n.fuente_id))]
  const idsPrograma = [...new Set((episodios.data ?? []).map(e => e.programa_id))]
  const [fuentes, programas] = await Promise.all([
    idsFuente.length ? supabase.from('noticias_fuentes').select('id, nombre').in('id', idsFuente) : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    idsPrograma.length ? supabase.from('mediateca_programas').select('id, slug, nombre').eq('activo', true).in('id', idsPrograma) : Promise.resolve({ data: [] as { id: string; slug: string; nombre: string }[] }),
  ])
  const fuente = new Map((fuentes.data ?? []).map(f => [f.id, f.nombre]))
  const programa = new Map((programas.data ?? []).map(p => [p.id, p]))

  return {
    noticias: (noticias.data ?? []).map(n => ({ titular: n.titular, fuente: fuente.get(n.fuente_id) ?? null, pais_code: n.pais_code })),
    convocatorias: convocatorias.data ?? [],
    formaciones: (formaciones.data ?? []).map(f => ({ slug: f.slug, titulo: f.titulo, tipo: etiquetaTipo(f.tipo), lugar: lugarFormacion(f) })),
    episodios: (episodios.data ?? []).flatMap(e => {
      const p = programa.get(e.programa_id)
      return p ? [{ titulo: e.titulo, programa: p.nombre, ruta: rutaEpisodio(p.slug, e.slug) }] : []
    }),
  }
}

export type Destinatario = { id: string; email: string; pago: boolean }

/**
 * Suscriptores confirmados. Con acceso 'pago', solo los que tienen un perfil
 * activo con plan de pago y el mismo correo.
 */
export async function cargarDestinatarios(supabase: Cliente, acceso: string): Promise<Destinatario[]> {
  const { data, error } = await supabase.from('boletin_suscriptores').select('id, email').eq('estado', 'confirmado').limit(50000)
  if (error) throw new Error(`boletin: no se pudieron leer los suscriptores: ${error.message}`)
  const lista = data ?? []
  if (!lista.length) return []

  const pagan = new Set<string>()
  for (let i = 0; i < lista.length; i += 500) {
    const { data: perfiles, error: e } = await supabase.from('profiles').select('email, plan')
      .in('email', lista.slice(i, i + 500).map(s => s.email))
      .eq('activo', true).is('deleted_at', null)
    if (e) throw new Error(`boletin: no se pudieron leer los perfiles: ${e.message}`)
    for (const p of perfiles ?? []) if (p.email && PLANES_DE_PAGO.has(p.plan)) pagan.add(p.email.toLowerCase())
  }
  return lista
    .map(s => ({ id: s.id, email: s.email, pago: pagan.has(s.email) }))
    .filter(d => acceso !== 'pago' || d.pago)
}

export type ResultadoEnvio = { enviado: boolean; motivo?: string; destinatarios: number; errores: number }

/**
 * Envía el boletín. Con `prueba`, solo a esa dirección y sin tocar a los
 * suscriptores. Sin contenido en la semana, no envía nada.
 */
export async function enviarBoletin(
  supabase: Cliente, config: ConfigBoletin, ahora: Date, opciones: { prueba?: string; fetcher?: typeof fetch } = {},
): Promise<ResultadoEnvio> {
  const contenido = await cargarContenido(supabase, ahora)
  if (contenidoVacio(contenido)) return { enviado: false, motivo: 'Sin novedades esta semana', destinatarios: 0, errores: 0 }

  const asunto = asuntoBoletin(config.nombre, contenido)
  const destinatarios: Destinatario[] = opciones.prueba
    ? [{ id: '00000000-0000-0000-0000-000000000000', email: opciones.prueba, pago: false }]
    : await cargarDestinatarios(supabase, config.acceso)
  if (!destinatarios.length) return { enviado: false, motivo: 'No hay suscriptores confirmados', destinatarios: 0, errores: 0 }

  let enviados = 0
  let errores = 0
  const correos: { d: Destinatario; correo: CorreoBoletin }[] = []
  for (const d of destinatarios) {
    const token = crearTokenBaja(d.id)
    if (!token) return { enviado: false, motivo: 'Falta la clave de los enlaces de baja', destinatarios: 0, errores: 0 }
    correos.push({ d, correo: { para: d.email, asunto, html: construirHtmlBoletin(config.nombre, contenido, token, ahora, !d.pago), tokenBaja: token } })
  }
  // De 100 en 100 por la API de lotes de Resend: un envío grande no agota el tiempo de la función.
  for (let i = 0; i < correos.length; i += LOTE) {
    const lote = correos.slice(i, i + LOTE)
    const ok = await enviarLote(lote.map(x => x.correo), config.nombre, opciones.fetcher)
    if (ok) {
      enviados += lote.length
      if (!opciones.prueba) {
        await supabase.from('boletin_suscriptores').update({ ultimo_envio_at: ahora.toISOString() }).in('id', lote.map(x => x.d.id))
      }
    } else {
      errores += lote.length
    }
    if (i + LOTE < correos.length) await new Promise(r => setTimeout(r, PAUSA_MS))
  }

  await supabase.from('boletin_envios').insert({
    enviado_at: ahora.toISOString(), destinatarios: enviados, errores, es_prueba: Boolean(opciones.prueba),
    noticias: contenido.noticias.length, convocatorias: contenido.convocatorias.length,
    formaciones: contenido.formaciones.length, episodios: contenido.episodios.length,
  })
  return { enviado: enviados > 0, destinatarios: enviados, errores }
}
