/**
 * Master Control: semáforos de las automatizaciones. Funciones puras: reciben
 * los datos ya leídos y la hora, y devuelven color, fecha del último dato y
 * una frase. Así se prueban sin base ni red.
 */

import { diaIsoMadrid } from '@/lib/boletin/boletin'

export type Color = 'verde' | 'ambar' | 'rojo' | 'gris'

export type Detalle = { texto: string; color: Color }

export type Semaforo = {
  clave: string
  titulo: string
  color: Color
  /** Fecha (ISO) del último dato en que se basa; null si no hay ninguno. */
  ultimoDato: string | null
  frase: string
  detalles?: Detalle[]
  href?: string
}

const HORA = 3_600_000
const DIA = 24 * HORA

const edad = (iso: string | null, ahora: Date) => (iso ? ahora.getTime() - Date.parse(iso) : Infinity)

/** «hace 3 h», «hace 2 días»… */
export function hace(iso: string | null, ahora: Date): string {
  const ms = edad(iso, ahora)
  if (!Number.isFinite(ms)) return 'nunca'
  if (ms < HORA) return `hace ${Math.max(1, Math.round(ms / 60_000))} min`
  if (ms < DIA) return `hace ${Math.round(ms / HORA)} h`
  const d = Math.floor(ms / DIA)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}

// ── Make ────────────────────────────────────────────────────────────────────

export type EjecucionMake = { at: string; resultado: 'ok' | 'aviso' | 'error' }
export type EscenarioMake = { id: number; nombre: string; activo: boolean; invalido: boolean; ultimaEjecucion: EjecucionMake | null }
export type EstadoMake =
  | { tipo: 'sin_token' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'ok'; escenarios: EscenarioMake[]; leidoAt: string }

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Escenarios de convocatorias, reconocidos por su nombre en Make. */
export const PATRON_BDNS = /bdns/
export const PATRON_LATAM = /google ?alert|galertas/

export function buscarEscenario(make: EstadoMake, patron: RegExp): EscenarioMake | null {
  if (make.tipo !== 'ok') return null
  return make.escenarios.find(e => patron.test(sinTildes(e.nombre))) ?? null
}

/** Problema de un escenario, o null si está bien. maxDias: antigüedad máxima de la última ejecución. */
export function problemaEscenario(e: EscenarioMake, ahora: Date, maxDias?: number): string | null {
  if (!e.activo) return 'está desactivado'
  if (e.invalido) return 'Make lo marca como inválido'
  if (!e.ultimaEjecucion) return 'no consta ninguna ejecución'
  if (e.ultimaEjecucion.resultado === 'error') return `su última ejecución (${hace(e.ultimaEjecucion.at, ahora)}) falló`
  if (maxDias !== undefined && edad(e.ultimaEjecucion.at, ahora) > maxDias * DIA) {
    return `no se ejecuta desde ${hace(e.ultimaEjecucion.at, ahora)}`
  }
  return null
}

export function saludMake(make: EstadoMake, ahora: Date): Semaforo {
  const base = { clave: 'make', titulo: 'Make', href: 'https://eu1.make.com' }
  if (make.tipo === 'sin_token') return { ...base, color: 'gris', ultimoDato: null, frase: 'Sin conectar: falta MAKE_API_TOKEN.' }
  if (make.tipo === 'error') return { ...base, color: 'ambar', ultimoDato: null, frase: `No se pudo consultar Make: ${make.mensaje}` }

  const detalles: Detalle[] = make.escenarios.map(e => {
    const problema = problemaEscenario(e, ahora)
    const ultima = e.ultimaEjecucion ? `última ejecución ${hace(e.ultimaEjecucion.at, ahora)}` : 'sin ejecuciones'
    return {
      texto: `${e.nombre}: ${problema ?? `bien, ${ultima}`}`,
      color: !e.activo ? 'ambar' : problema ? 'rojo' : e.ultimaEjecucion?.resultado === 'aviso' ? 'ambar' : 'verde',
    }
  })
  const rojos = detalles.filter(d => d.color === 'rojo').length
  const ambar = detalles.filter(d => d.color === 'ambar').length
  const ultimas = make.escenarios.map(e => e.ultimaEjecucion?.at).filter((x): x is string => !!x).sort()
  return {
    ...base,
    color: rojos ? 'rojo' : ambar ? 'ambar' : 'verde',
    ultimoDato: ultimas[ultimas.length - 1] ?? null,
    frase: rojos
      ? `${rojos} ${rojos === 1 ? 'escenario con problemas' : 'escenarios con problemas'} de ${make.escenarios.length}.`
      : ambar
        ? `${ambar} ${ambar === 1 ? 'escenario desactivado o con avisos' : 'escenarios desactivados o con avisos'} de ${make.escenarios.length}.`
        : `Los ${make.escenarios.length} escenarios funcionan.`,
    detalles,
  }
}

// ── Noticias ────────────────────────────────────────────────────────────────

export function saludNoticias(d: { ultima: string | null; fuentesActivas: number; fuentesTotal: number }, ahora: Date): Semaforo {
  const ms = edad(d.ultima, ahora)
  const color: Color = ms < DIA ? 'verde' : ms <= 2 * DIA ? 'ambar' : 'rojo'
  const fuentes = `${d.fuentesActivas} de ${d.fuentesTotal} fuentes activas`
  return {
    clave: 'noticias', titulo: 'Noticias', href: '/admin/noticias', color, ultimoDato: d.ultima,
    frase: d.ultima
      ? `La última noticia entró ${hace(d.ultima, ahora)}. ${fuentes}.`
      : `No ha entrado ninguna noticia. ${fuentes}.`,
  }
}

// ── Convocatorias (Make + base) ─────────────────────────────────────────────

/**
 * Convocatorias que trae un escenario de Make. Rojo si el escenario tiene un
 * problema (desactivado, inválido, la última ejecución falló o es más antigua
 * que maxDias). Si el escenario funciona pero no entra nada desde hace más de
 * maxDias, ámbar: es lo que pasó con BDNS en octubre de 2026. Sin Make, se
 * juzga solo por la base, en ámbar como mucho, y se dice que falta Make.
 */
export function saludConvocatorias(
  d: { clave: string; titulo: string; ultimaImportada: string | null; patron: RegExp; maxDias: number },
  make: EstadoMake,
  ahora: Date,
): Semaforo {
  const escenario = buscarEscenario(make, d.patron)
  const entrada = d.ultimaImportada
    ? `La última convocatoria entró ${hace(d.ultimaImportada, ahora)}.`
    : 'No ha entrado ninguna convocatoria.'
  const sinEntradas = edad(d.ultimaImportada, ahora) > d.maxDias * DIA
  const base = { clave: d.clave, titulo: d.titulo, href: '/admin/convocatorias' }

  if (escenario) {
    const problema = problemaEscenario(escenario, ahora, d.maxDias)
    const ultimoDato = [escenario.ultimaEjecucion?.at, d.ultimaImportada].filter((x): x is string => !!x).sort().pop() ?? null
    if (problema) return { ...base, color: 'rojo', ultimoDato, frase: `El escenario «${escenario.nombre}» ${problema}. ${entrada}` }
    if (sinEntradas) return { ...base, color: 'ambar', ultimoDato, frase: `El escenario se ejecuta (${hace(escenario.ultimaEjecucion!.at, ahora)}) pero no trae resultados. ${entrada}` }
    return { ...base, color: 'verde', ultimoDato, frase: `El escenario funciona (última ejecución ${hace(escenario.ultimaEjecucion!.at, ahora)}). ${entrada}` }
  }

  const motivo = make.tipo === 'sin_token' ? 'Make sin conectar' : make.tipo === 'error' ? 'no se pudo consultar Make' : 'escenario no encontrado en Make'
  return { ...base, color: sinEntradas ? 'ambar' : 'verde', ultimoDato: d.ultimaImportada, frase: `${entrada} (${motivo}: se juzga solo por lo que entra en la base).` }
}

// ── Mediateca ───────────────────────────────────────────────────────────────

export type ProgramaSalud = { id: string; nombre: string; ultima_importacion_at: string | null; ultimo_error: string | null }

/** Un semáforo por programa activo: rojo con error o sin importar en más de 26 h. */
export function saludMediateca(programas: ProgramaSalud[], ahora: Date): Semaforo[] {
  return programas.map(p => {
    const base = { clave: `mediateca-${p.id}`, titulo: `Mediateca · ${p.nombre}`, href: '/admin/mediateca', ultimoDato: p.ultima_importacion_at }
    if (p.ultimo_error?.trim()) return { ...base, color: 'rojo' as const, frase: `La última importación (${hace(p.ultima_importacion_at, ahora)}) falló: ${p.ultimo_error.trim()}` }
    if (edad(p.ultima_importacion_at, ahora) > 26 * HORA) return { ...base, color: 'rojo' as const, frase: `No se importa desde ${hace(p.ultima_importacion_at, ahora)}: la importación diaria no está corriendo.` }
    return { ...base, color: 'verde' as const, frase: `Importado ${hace(p.ultima_importacion_at, ahora)} sin errores.` }
  })
}

// ── Proscenio ───────────────────────────────────────────────────────────────

/** Fecha (AAAA-MM-DD) en Madrid. */
const fechaMadrid = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

/** Lunes (AAAA-MM-DD, hora de Madrid) de la semana de `ahora`. */
export function lunesMadrid(ahora: Date): string {
  const [y, m, d] = fechaMadrid(ahora).split('-').map(Number)
  const lunes = new Date(Date.UTC(y, m - 1, d - (diaIsoMadrid(ahora) - 1)))
  return lunes.toISOString().slice(0, 10)
}

const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

/**
 * Último envío real del boletín. Rojo si tuvo errores, o si ya ha pasado el
 * día de envío de esta semana (con dia_envio = jueves: de viernes en
 * adelante), el boletín está activo y no ha salido el de esta semana.
 */
export function saludProscenio(
  d: { nombre: string; activo: boolean; dia_envio: number; ultimo: { enviado_at: string; destinatarios: number; errores: number } | null },
  ahora: Date,
): Semaforo {
  const base = { clave: 'proscenio', titulo: d.nombre || 'Proscenio', href: '/admin/boletin', ultimoDato: d.ultimo?.enviado_at ?? null }
  const ultimo = d.ultimo
    ? `Último envío ${hace(d.ultimo.enviado_at, ahora)} a ${d.ultimo.destinatarios} ${d.ultimo.destinatarios === 1 ? 'suscriptor' : 'suscriptores'}`
    : 'Todavía no ha salido ningún envío'
  if (d.ultimo && d.ultimo.errores > 0) {
    return { ...base, color: 'rojo', frase: `${ultimo}, con ${d.ultimo.errores} ${d.ultimo.errores === 1 ? 'error' : 'errores'}.` }
  }
  if (!d.activo) return { ...base, color: 'gris', frase: `Desactivado. ${ultimo}.` }

  const salioEstaSemana = !!d.ultimo && fechaMadrid(new Date(d.ultimo.enviado_at)) >= lunesMadrid(ahora)
  if (diaIsoMadrid(ahora) > d.dia_envio && !salioEstaSemana) {
    return { ...base, color: 'rojo', frase: `No ha salido el de esta semana (tocaba el ${DIAS[d.dia_envio] ?? d.dia_envio}). ${ultimo}. Si no hubo novedades en la semana, no se envía.` }
  }
  return { ...base, color: 'verde', frase: `${ultimo}. Sale cada ${DIAS[d.dia_envio] ?? d.dia_envio}.` }
}

/** El peor color de una lista (para el resumen del bloque). */
export function peorColor(colores: Color[]): Color {
  for (const c of ['rojo', 'ambar', 'verde'] as const) if (colores.includes(c)) return c
  return 'gris'
}

// ── Correo entrante ─────────────────────────────────────────────────────────

/**
 * Correo entrante (Resend). Gris «Sin configurar» mientras falte la clave de
 * firma del webhook o no haya llegado ningún correo; si no, verde con la
 * fecha del último recibido.
 */
export function saludCorreo(d: { configurado: boolean; ultimo: string | null; sinAtender: number | null }, ahora: Date): Semaforo {
  const base = { clave: 'correo', titulo: 'Correo entrante', href: '/admin/correo', ultimoDato: d.ultimo }
  if (!d.configurado) return { ...base, color: 'gris', frase: 'Sin configurar: falta RESEND_INBOUND_WEBHOOK_SECRET.' }
  if (!d.ultimo) return { ...base, color: 'gris', frase: 'Sin configurar: todavía no ha llegado ningún correo.' }
  const pendientes = d.sinAtender ? ` ${d.sinAtender} ${d.sinAtender === 1 ? 'correo sin atender' : 'correos sin atender'}.` : ''
  return { ...base, color: 'verde', frase: `El último correo llegó ${hace(d.ultimo, ahora)}.${pendientes}` }
}
