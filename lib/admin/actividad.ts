/**
 * Master Control: línea de tiempo de actividad, construida con las fechas que
 * ya guardan las tablas (created_at, publicado_at, resuelta_at…), sin tablas
 * ni triggers nuevos. Sin datos sensibles: el nombre visible del perfil y
 * nunca un correo. Cada evento sale de la fecha en que ocurrió (publicado_at,
 * fecha_publicacion…): lo que se publicó y luego se retiró sigue constando.
 *
 * Para añadir un tipo de evento: una consulta más en cargarActividad() que
 * devuelva Evento[]; la mezcla y el orden son comunes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type TipoEvento =
  | 'registro' | 'verificacion' | 'casting' | 'obra' | 'espectaculo' | 'formacion'
  | 'convocatoria_entrada' | 'convocatoria_publicada' | 'noticia_entrada' | 'noticia_publicada'
  | 'episodio' | 'suscripcion_nueva' | 'suscripcion_cancelada' | 'proscenio' | 'embajador' | 'correo'
  | 'tarea_creada' | 'tarea_asignada' | 'tarea_resuelta'

export type Evento = { id: string; tipo: TipoEvento; texto: string; at: string; href: string | null }

export const ICONO: Record<TipoEvento, string> = {
  registro: '＋', verificacion: '✓', casting: '◉', obra: '▣', espectaculo: '▤', formacion: '◇',
  convocatoria_entrada: '↓', convocatoria_publicada: '◆', noticia_entrada: '↓', noticia_publicada: '◆',
  episodio: '▶', suscripcion_nueva: '★', suscripcion_cancelada: '☆', proscenio: '✉', embajador: '♦', correo: '✎',
  tarea_creada: '☐', tarea_asignada: '→', tarea_resuelta: '☑',
}

export const PERIODOS = {
  hoy: { etiqueta: 'Hoy' },
  '7d': { etiqueta: '7 días' },
  '30d': { etiqueta: '30 días' },
} as const
export type Periodo = keyof typeof PERIODOS

export const LIMITE_EVENTOS = 100
export const LIMITE_MAXIMO = 500

export const periodoValido = (v: string | undefined): Periodo => (v && v in PERIODOS ? (v as Periodo) : 'hoy')

/** Inicio del periodo. «Hoy» empieza a las 00:00 de Canarias, como las horas del resto de /admin. */
export function inicioPeriodo(p: Periodo, ahora: Date): Date {
  if (p === '7d') return new Date(ahora.getTime() - 7 * 86_400_000)
  if (p === '30d') return new Date(ahora.getTime() - 30 * 86_400_000)
  const partes = new Intl.DateTimeFormat('en-GB', { timeZone: 'Atlantic/Canary', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(ahora)
  const n = (t: string) => Number(partes.find(x => x.type === t)?.value ?? 0)
  return new Date(ahora.getTime() - ((n('hour') * 60 + n('minute')) * 60 + n('second')) * 1000 - ahora.getMilliseconds())
}

/** Puro: mezcla, ordena del más reciente al más antiguo y corta. */
export function mezclarEventos(listas: Evento[][], limite: number): { eventos: Evento[]; hayMas: boolean } {
  const todos = listas.flat().sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id))
  return { eventos: todos.slice(0, limite), hayMas: todos.length > limite }
}

type Perfil = { id: string; nombre: string | null; apellidos: string | null; nombre_artistico: string | null; slug: string | null; perfil_publico?: boolean }

/** Nombre visible del perfil (nunca el correo). */
export const nombreVisible = (p: Pick<Perfil, 'nombre' | 'apellidos' | 'nombre_artistico'> | undefined) =>
  p?.nombre_artistico?.trim() || [p?.nombre, p?.apellidos].filter(Boolean).join(' ').trim() || 'Sin nombre'

const PLAN: Record<string, string> = { premium: 'Premium', destacado: 'Destacado', empresas: 'Empresas' }

type Filas<T> = PromiseLike<{ data: T[] | null; error: unknown }>
const filas = async <T>(q: Filas<T>): Promise<T[]> => {
  const { data, error } = await q
  return error ? [] : data ?? []
}

export async function cargarActividad(
  sesion: SupabaseClient,
  servicio: SupabaseClient,
  { desde, limite, esAdmin }: { desde: Date; limite: number; esAdmin: boolean },
): Promise<{ eventos: Evento[]; hayMas: boolean }> {
  const d = desde.toISOString()
  const ultimos = <T>(q: { gte: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Filas<T> } } }, col: string) =>
    filas<T>(q.gte(col, d).order(col, { ascending: false }).limit(limite))

  const [registros, verificaciones, castings, obras, espectaculos, formaciones, convEntradas, convPublicadas,
    notEntradas, notPublicadas, episodios, subsNuevas, subsCanceladas, envios, embajadores, correos,
    tareasCreadas, tareasResueltas, asignaciones] = await Promise.all([
    ultimos<Perfil & { created_at: string }>(servicio.from('profiles').select('id, nombre, apellidos, nombre_artistico, slug, perfil_publico, created_at').is('deleted_at', null), 'created_at'),
    ultimos<{ id: string; profile_id: string; resuelta_at: string }>(servicio.from('verificaciones_profesionales').select('id, profile_id, resuelta_at').eq('estado', 'aprobada'), 'resuelta_at'),
    ultimos<{ id: string; titulo: string; publicado_at: string }>(sesion.from('castings').select('id, titulo, publicado_at'), 'publicado_at'),
    ultimos<{ id: string; title: string; slug: string | null; created_at: string }>(sesion.from('works').select('id, title, slug, created_at').eq('is_published', true).eq('is_library_work', false).is('deleted_at', null), 'created_at'),
    ultimos<{ id: string; titulo: string; slug: string; publicado_at: string }>(sesion.from('espectaculos').select('id, titulo, slug, publicado_at'), 'publicado_at'),
    ultimos<{ id: string; titulo: string; slug: string; fecha_publicacion: string }>(sesion.from('formaciones').select('id, titulo, slug, fecha_publicacion'), 'fecha_publicacion'),
    ultimos<{ id: string; title: string; created_at: string }>(sesion.from('calls').select('id, title, created_at').is('deleted_at', null), 'created_at'),
    ultimos<{ id: string; title: string; fecha_publicacion: string }>(sesion.from('calls').select('id, title, fecha_publicacion').is('deleted_at', null), 'fecha_publicacion'),
    ultimos<{ id: string; titular: string; created_at: string }>(sesion.from('noticias').select('id, titular, created_at'), 'created_at'),
    ultimos<{ id: string; titular: string; publicado_at: string }>(sesion.from('noticias').select('id, titular, publicado_at'), 'publicado_at'),
    ultimos<{ id: string; titulo: string; slug: string; programa_id: string; created_at: string }>(sesion.from('mediateca_episodios').select('id, titulo, slug, programa_id, created_at'), 'created_at'),
    ultimos<{ id: string; profile_id: string; plan: string; created_at: string }>(servicio.from('subscriptions').select('id, profile_id, plan, created_at'), 'created_at'),
    ultimos<{ id: string; profile_id: string; plan: string; updated_at: string }>(servicio.from('subscriptions').select('id, profile_id, plan, updated_at').eq('status', 'canceled'), 'updated_at'),
    ultimos<{ id: string; destinatarios: number; enviado_at: string }>(sesion.from('boletin_envios').select('id, destinatarios, enviado_at').eq('es_prueba', false), 'enviado_at'),
    esAdmin
      ? ultimos<{ id: string; nombre: string; genero: string; aceptada_at: string }>(servicio.from('embajadores_invitaciones').select('id, nombre, genero, aceptada_at').eq('estado', 'aceptada'), 'aceptada_at')
      : Promise.resolve([]),
    // Correo de personas (solo admin; la RLS no se lo da a nadie más). Sin direcciones.
    esAdmin
      ? ultimos<{ id: string; remitente_nombre: string | null; asunto: string | null; recibido_at: string }>(sesion.from('correos_entrantes').select('id, remitente_nombre, asunto, recibido_at').eq('categoria', 'persona'), 'recibido_at')
      : Promise.resolve([]),
    // Tareas, con la sesión: admin ve todas; moderator, las suyas.
    ultimos<{ id: string; titulo: string; created_at: string }>(sesion.from('tareas_admin').select('id, titulo, created_at'), 'created_at'),
    ultimos<{ id: string; titulo: string; resuelta_at: string }>(sesion.from('tareas_admin').select('id, titulo, resuelta_at').eq('estado', 'resuelta'), 'resuelta_at'),
    // «Asignada a <nombre visible>»: la nota que deja la base al asignar.
    ultimos<{ id: string; tarea_id: string; texto: string; created_at: string; tareas_admin: { titulo: string } | { titulo: string }[] | null }>(
      sesion.from('tareas_admin_notas').select('id, tarea_id, texto, created_at, tareas_admin(titulo)').eq('tipo', 'asignacion'), 'created_at'),
  ])

  // Nombres de los perfiles citados y slugs de los programas, en una lectura cada uno.
  const idsPerfil = [...new Set([...verificaciones, ...subsNuevas, ...subsCanceladas].map(x => x.profile_id))]
  const idsPrograma = [...new Set(episodios.map(e => e.programa_id))]
  const [perfiles, programas] = await Promise.all([
    idsPerfil.length ? filas<Perfil>(servicio.from('profiles').select('id, nombre, apellidos, nombre_artistico, slug, perfil_publico').in('id', idsPerfil)) : Promise.resolve([]),
    idsPrograma.length ? filas<{ id: string; slug: string; nombre: string }>(sesion.from('mediateca_programas').select('id, slug, nombre').in('id', idsPrograma)) : Promise.resolve([]),
  ])
  const perfil = new Map(perfiles.map(p => [p.id, p]))
  const programa = new Map(programas.map(p => [p.id, p]))
  const enlacePerfil = (p: Perfil | undefined) => (p?.slug && p.perfil_publico !== false ? `/perfil/${p.slug}` : null)
  const plan = (p: string) => PLAN[p] ?? p
  const entradaPorId = new Map(convEntradas.map(c => [c.id, c.created_at]))
  const publicadaAlEntrar = new Set(convPublicadas
    .filter(c => entradaPorId.has(c.id) && Math.abs(Date.parse(c.fecha_publicacion) - Date.parse(entradaPorId.get(c.id)!)) < 60_000)
    .map(c => c.id))

  const ev = (tipo: TipoEvento, id: string, at: string, texto: string, href: string | null): Evento => ({ id: `${tipo}:${id}`, tipo, at, texto, href })

  return mezclarEventos([
    registros.map(p => ev('registro', p.id, p.created_at, `Cuenta nueva: ${nombreVisible(p)}`, enlacePerfil(p))),
    verificaciones.map(v => ev('verificacion', v.id, v.resuelta_at, `Verificación aprobada: ${nombreVisible(perfil.get(v.profile_id))}`, enlacePerfil(perfil.get(v.profile_id)) ?? '/admin/verificaciones')),
    castings.map(c => ev('casting', c.id, c.publicado_at, `Casting publicado: ${c.titulo}`, `/castings/${c.id}`)),
    obras.map(o => ev('obra', o.id, o.created_at, `Obra publicada: ${o.title}`, o.slug ? `/obras/${o.slug}` : null)),
    espectaculos.map(e => ev('espectaculo', e.id, e.publicado_at, `Espectáculo publicado: ${e.titulo}`, `/cartelera/${e.slug}`)),
    formaciones.map(f => ev('formacion', f.id, f.fecha_publicacion, `Formación publicada: ${f.titulo}`, `/formacion/${f.slug}`)),
    // Las que entran ya publicadas (BDNS) salen una sola vez, como «entrada y publicada».
    convEntradas.filter(c => !publicadaAlEntrar.has(c.id)).map(c => ev('convocatoria_entrada', c.id, c.created_at, `Convocatoria entrada: ${c.title}`, '/admin/convocatorias')),
    convPublicadas.map(c => ev('convocatoria_publicada', c.id, c.fecha_publicacion,
      `${publicadaAlEntrar.has(c.id) ? 'Convocatoria entrada y publicada' : 'Convocatoria publicada'}: ${c.title}`, `/convocatoria/${c.id}`)),
    notEntradas.map(n => ev('noticia_entrada', n.id, n.created_at, `Noticia entrada: ${n.titular}`, '/admin/noticias')),
    notPublicadas.map(n => ev('noticia_publicada', n.id, n.publicado_at, `Noticia publicada: ${n.titular}`, '/admin/noticias')),
    episodios.map(e => {
      const p = programa.get(e.programa_id)
      return ev('episodio', e.id, e.created_at, `Episodio nuevo en Mediateca: ${e.titulo}`, p ? `/mediateca/${p.slug}/${e.slug}` : '/admin/mediateca')
    }),
    subsNuevas.map(s => ev('suscripcion_nueva', s.id, s.created_at, `Suscripción ${plan(s.plan)} nueva: ${nombreVisible(perfil.get(s.profile_id))}`, enlacePerfil(perfil.get(s.profile_id)))),
    subsCanceladas.map(s => ev('suscripcion_cancelada', s.id, s.updated_at, `Suscripción ${plan(s.plan)} cancelada: ${nombreVisible(perfil.get(s.profile_id))}`, enlacePerfil(perfil.get(s.profile_id)))),
    envios.map(e => ev('proscenio', e.id, e.enviado_at, `Proscenio enviado a ${e.destinatarios} ${e.destinatarios === 1 ? 'suscriptor' : 'suscriptores'}`, '/admin/boletin')),
    correos.map(c => ev('correo', c.id, c.recibido_at, `Correo recibido: ${c.remitente_nombre?.trim() || 'Remitente sin nombre'} — ${c.asunto?.trim() || '(sin asunto)'}`, `/admin/correo?id=${c.id}`)),
    tareasCreadas.map(t => ev('tarea_creada', t.id, t.created_at, `Tarea creada: ${t.titulo}`, `/admin/tareas/${t.id}`)),
    tareasResueltas.map(t => ev('tarea_resuelta', t.id, t.resuelta_at, `Tarea resuelta: ${t.titulo}`, `/admin/tareas/${t.id}`)),
    asignaciones.map(n => ev('tarea_asignada', n.id, n.created_at, `Tarea «${(Array.isArray(n.tareas_admin) ? n.tareas_admin[0] : n.tareas_admin)?.titulo ?? 'sin título'}»: ${n.texto.charAt(0).toLowerCase()}${n.texto.slice(1)}`, `/admin/tareas/${n.tarea_id}`)),
    embajadores.map(e => ev('embajador', e.id, e.aceptada_at, `${e.genero === 'f' ? 'Embajadora' : 'Embajador'} de Escena: ${e.nombre} aceptó la invitación`, '/admin/embajadores')),
  ], limite)
}
