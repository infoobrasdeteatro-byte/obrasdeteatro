/**
 * Mediateca: importación de episodios de un programa.
 *
 * Lee el RSS de YouTube del canal y el RSS del podcast, empareja los dos
 * (mismo episodio en vídeo y en audio → una sola ficha con los dos
 * reproductores) y escribe con la clave de servicio. Nunca borra ni pisa lo
 * que ya hay: solo añade episodios nuevos y rellena huecos (el vídeo de un
 * episodio que ya tenía audio, la duración que faltaba…). Lo retirado por
 * moderación sigue retirado.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { imagenCanalPodcast, leerFeedPodcast, leerFeedYoutube, urlFeedYoutube, claveEpisodio, type EpisodioFuente } from './feeds'

type Cliente = SupabaseClient<Database>

export type ProgramaImportable = {
  id: string
  nombre: string
  youtube_channel_id: string | null
  rss_url: string | null
  imagen_url?: string | null
  filtro_titulo?: string | null
}

export type ResultadoImportacion = { programa: string; nuevos: number; actualizados: number; error: string | null }

type Existente = {
  id: string
  titulo: string
  descripcion: string | null
  duracion_segundos: number | null
  imagen_url: string | null
  youtube_video_id: string | null
  audio_guid: string | null
  audio_url: string | null
  enlace_audio: string | null
}

const TIEMPO_MAX_MS = 15_000

async function descargar(url: string, fetcher: typeof fetch): Promise<string> {
  const r = await fetcher(url, {
    headers: { 'user-agent': 'ObrasDeTeatro-Mediateca/1.0 (+https://www.obrasdeteatro.com/mediateca)', accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(TIEMPO_MAX_MS),
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`${new URL(url).hostname} respondió ${r.status}`)
  return r.text()
}

/** Campos que rellenar en un existente a partir de una fuente, sin pisar nada. */
export function huecosARellenar(e: Existente, f: EpisodioFuente): Partial<Existente> {
  const c: Partial<Existente> = {}
  if (f.youtube_video_id && !e.youtube_video_id) c.youtube_video_id = f.youtube_video_id
  if (f.audio_guid && !e.audio_guid) { c.audio_guid = f.audio_guid; c.audio_url = f.audio_url ?? null }
  if (f.enlace_audio && !e.enlace_audio) c.enlace_audio = f.enlace_audio
  if (f.duracion_segundos && !e.duracion_segundos) c.duracion_segundos = f.duracion_segundos
  if (f.descripcion && !e.descripcion) c.descripcion = f.descripcion
  if (f.imagen_url && !e.imagen_url) c.imagen_url = f.imagen_url
  return c
}

/**
 * Decide, para cada episodio de las fuentes, si es nuevo, si completa uno
 * existente o si ya está. Puro: se prueba sin base.
 */
export function planificar(existentes: Existente[], fuentes: EpisodioFuente[]) {
  const porVideo = new Map(existentes.filter(e => e.youtube_video_id).map(e => [e.youtube_video_id!, e]))
  const porGuid = new Map(existentes.filter(e => e.audio_guid).map(e => [e.audio_guid!, e]))
  const porClave = new Map<string, Existente>()
  for (const e of existentes) porClave.set(claveEpisodio(e.titulo), e)

  const nuevos: EpisodioFuente[] = []
  const cambios = new Map<string, Partial<Existente>>()
  // Primero el audio (suele traer el archivo completo, con duración y
  // descripción), después YouTube, que se cuelga del mismo episodio.
  const orden = [...fuentes].sort((a, b) => (a.fuente === b.fuente ? 0 : a.fuente === 'audio' ? -1 : 1))
  const nuevosPorClave = new Map<string, EpisodioFuente>()

  for (const f of orden) {
    const exacto = f.youtube_video_id ? porVideo.get(f.youtube_video_id) : porGuid.get(f.audio_guid!)
    if (exacto) {
      const c = huecosARellenar(exacto, f)
      if (Object.keys(c).length) cambios.set(exacto.id, { ...cambios.get(exacto.id), ...c })
      continue
    }
    const pareja = porClave.get(f.clave)
    const libre = pareja && (f.fuente === 'youtube' ? !pareja.youtube_video_id : !pareja.audio_guid)
    if (pareja && libre) {
      const c = huecosARellenar(pareja, f)
      Object.assign(pareja, c)
      cambios.set(pareja.id, { ...cambios.get(pareja.id), ...c })
      continue
    }
    const nuevoPar = nuevosPorClave.get(f.clave)
    if (nuevoPar && (f.fuente === 'youtube' ? !nuevoPar.youtube_video_id : !nuevoPar.audio_guid)) {
      if (f.youtube_video_id) nuevoPar.youtube_video_id = f.youtube_video_id
      if (f.audio_guid) { nuevoPar.audio_guid = f.audio_guid; nuevoPar.audio_url = f.audio_url }
      nuevoPar.enlace_audio ??= f.enlace_audio
      nuevoPar.duracion_segundos ??= f.duracion_segundos
      nuevoPar.descripcion ??= f.descripcion
      continue
    }
    const copia = { ...f }
    nuevos.push(copia)
    nuevosPorClave.set(f.clave, copia)
  }
  return { nuevos, cambios }
}

export async function importarPrograma(
  supabase: Cliente,
  p: ProgramaImportable,
  fetcher: typeof fetch = fetch,
): Promise<ResultadoImportacion> {
  const errores: string[] = []
  const fuentes: EpisodioFuente[] = []
  let portada: string | null = null

  if (p.youtube_channel_id) {
    try { fuentes.push(...leerFeedYoutube(await descargar(urlFeedYoutube(p.youtube_channel_id), fetcher), { filtroTitulo: p.filtro_titulo })) }
    catch (e) { errores.push(`YouTube: ${e instanceof Error ? e.message : e}`) }
  }
  if (p.rss_url) {
    try {
      const xml = await descargar(p.rss_url, fetcher)
      fuentes.push(...leerFeedPodcast(xml))
      if (!p.imagen_url) portada = imagenCanalPodcast(xml)
    }
    catch (e) { errores.push(`Podcast: ${e instanceof Error ? e.message : e}`) }
  }

  let nuevos = 0
  let actualizados = 0
  if (fuentes.length) {
    const { data: existentes, error } = await supabase
      .from('mediateca_episodios')
      .select('id, titulo, descripcion, duracion_segundos, imagen_url, youtube_video_id, audio_guid, audio_url, enlace_audio')
      .eq('programa_id', p.id)
    if (error) {
      errores.push(`Lectura: ${error.message}`)
    } else {
      const plan = planificar(existentes ?? [], fuentes)
      for (const f of plan.nuevos) {
        const { error: e } = await supabase.from('mediateca_episodios').insert({
          programa_id: p.id,
          titulo: f.titulo,
          descripcion: f.descripcion,
          fecha_publicacion: f.fecha_publicacion,
          duracion_segundos: f.duracion_segundos,
          imagen_url: f.imagen_url,
          youtube_video_id: f.youtube_video_id ?? null,
          audio_guid: f.audio_guid ?? null,
          audio_url: f.audio_url ?? null,
          enlace_audio: f.enlace_audio ?? null,
        })
        if (e) errores.push(`«${f.titulo.slice(0, 60)}»: ${e.message}`)
        else nuevos++
      }
      for (const [id, c] of plan.cambios) {
        const { error: e } = await supabase.from('mediateca_episodios').update(c).eq('id', id)
        if (e) errores.push(`Actualización: ${e.message}`)
        else actualizados++
      }
    }
  }

  const error = errores.length ? errores.slice(0, 5).join(' · ').slice(0, 500) : null
  await supabase.from('mediateca_programas')
    .update({ ultima_importacion_at: new Date().toISOString(), ultimo_error: error, ...(portada ? { imagen_url: portada } : {}) })
    .eq('id', p.id)

  return { programa: p.nombre, nuevos, actualizados, error }
}
