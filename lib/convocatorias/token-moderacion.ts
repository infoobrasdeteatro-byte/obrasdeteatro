import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Tokens de los botones «Aprobar» y «Rechazar» del resumen semanal.
 *
 * Un token identifica UNA convocatoria y UNA acción, y caduca a los 14 días.
 * Va firmado con HMAC-SHA256 y la clave CONVOCATORIAS_MODERACION_SECRET:
 * cambiar el id, la acción o la caducidad invalida la firma.
 *
 * El token NO autoriza por sí solo. Abre la página de confirmación, que exige
 * sesión de moderador, y la aprobación viaja con esa sesión: la RLS y el
 * trigger calls_sync_estado() siguen decidiendo. El token solo evita que un
 * enlace sirva para otra convocatoria u otra acción, o pasado su plazo.
 *
 * Formato: base64url(JSON {c, a, e}) + '.' + base64url(firma).
 */

export const ACCIONES = ['aprobar', 'rechazar'] as const
export type AccionModeracion = (typeof ACCIONES)[number]

export const VIGENCIA_MS = 14 * 24 * 60 * 60 * 1000

/** Motivo que se guarda al rechazar desde el resumen semanal. */
export const MOTIVO_RECHAZO_RESUMEN = 'Rechazada desde resumen semanal'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type TokenVerificado =
  | { ok: true; callId: string; accion: AccionModeracion; caduca: Date }
  | { ok: false; motivo: 'sin_secreto' | 'formato' | 'firma' | 'caducado' }

function secreto(): string | null {
  const s = process.env.CONVOCATORIAS_MODERACION_SECRET
  return s && s.length > 0 ? s : null
}

function firmar(datos: string, clave: string): string {
  return createHmac('sha256', clave).update(datos, 'utf8').digest('base64url')
}

/** Crea el token de una convocatoria y una acción. Null si falta el secreto. */
export function crearToken(callId: string, accion: AccionModeracion, ahora: Date = new Date()): string | null {
  const clave = secreto()
  if (!clave) return null
  const datos = Buffer.from(JSON.stringify({ c: callId, a: accion, e: ahora.getTime() + VIGENCIA_MS }), 'utf8').toString('base64url')
  return `${datos}.${firmar(datos, clave)}`
}

/** Comprueba firma, forma y caducidad. Nunca lanza. */
export function verificarToken(token: string | null | undefined, ahora: Date = new Date()): TokenVerificado {
  const clave = secreto()
  if (!clave) return { ok: false, motivo: 'sin_secreto' }
  if (typeof token !== 'string' || token.length > 1000) return { ok: false, motivo: 'formato' }

  const partes = token.split('.')
  if (partes.length !== 2 || !partes[0] || !partes[1]) return { ok: false, motivo: 'formato' }
  const [datos, firma] = partes

  const esperada = Buffer.from(firmar(datos, clave), 'utf8')
  const recibida = Buffer.from(firma, 'utf8')
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
    return { ok: false, motivo: 'firma' }
  }

  let carga: unknown
  try {
    carga = JSON.parse(Buffer.from(datos, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, motivo: 'formato' }
  }
  if (typeof carga !== 'object' || carga === null) return { ok: false, motivo: 'formato' }
  const { c, a, e } = carga as Record<string, unknown>
  if (typeof c !== 'string' || !UUID.test(c)) return { ok: false, motivo: 'formato' }
  if (typeof a !== 'string' || !(ACCIONES as readonly string[]).includes(a)) return { ok: false, motivo: 'formato' }
  if (typeof e !== 'number' || !Number.isFinite(e)) return { ok: false, motivo: 'formato' }
  if (ahora.getTime() > e) return { ok: false, motivo: 'caducado' }

  return { ok: true, callId: c, accion: a as AccionModeracion, caduca: new Date(e) }
}
