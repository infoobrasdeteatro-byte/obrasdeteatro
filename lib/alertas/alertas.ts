import { createHmac, timingSafeEqual } from 'node:crypto'
import { getCountryByCode } from '@/lib/geo/countries'
import { etiquetaCategoria } from '@/components/convocatorias/vocabulario'

export { FRECUENCIAS, validarAlerta, type CamposAlerta, type Frecuencia } from './formulario'

/**
 * Alertas de convocatorias personalizadas (planes de pago).
 *
 * Funciones puras: qué convocatorias coinciden con una alerta, cuándo toca
 * enviarla, el HTML del correo y el token de baja. La consulta y el envío
 * viven en app/api/cron/alertas-convocatorias; la tabla y la RLS, en la
 * migración 20261008090000.
 */

export const SITIO = 'https://www.obrasdeteatro.com'
export const REMITENTE = 'ObrasDeTeatro® <no-reply@obrasdeteatro.com>'
export const MAX_POR_CORREO = 20
export const VENTANA_INICIAL_MS = 7 * 24 * 60 * 60 * 1000
/** Planes que reciben alertas: todos menos el gratuito (como public.plan_de_pago()). */
export const PLANES_CON_ALERTAS: ReadonlySet<string> = new Set(['premium', 'destacado', 'empresas'])

export type Alerta = {
  profile_id: string
  activa: boolean
  paises: string[]
  categorias: string[]
  frecuencia: string
  ultimo_envio_at: string | null
}

export type ConvocatoriaAlerta = {
  id: string
  title: string
  entidad_convocante: string | null
  pais_code: string | null
  location: string | null
  category: string | null
  deadline: string | null
  fecha_publicacion: string | null
}

// ── Cuándo toca ───────────────────────────────────────────────────────────

/** ¿Es lunes en Madrid? (el cron diario corre a las 07:30 UTC). */
export function esLunesEnMadrid(ahora: Date): boolean {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'short' }).format(ahora) === 'Mon'
}

/**
 * ¿Toca enviar esta alerta ahora? Diaria: sí. Semanal: solo los lunes.
 * Además, si ya hubo un envío reciente (20 h la diaria, 6 días la semanal),
 * no: así un cron que se ejecute dos veces no manda el correo dos veces.
 */
export function tocaEnvio(alerta: Pick<Alerta, 'activa' | 'frecuencia' | 'ultimo_envio_at'>, ahora: Date): boolean {
  if (!alerta.activa) return false
  const ultimo = alerta.ultimo_envio_at ? new Date(alerta.ultimo_envio_at).getTime() : null
  const hace = (h: number) => ahora.getTime() - h * 60 * 60 * 1000
  if (alerta.frecuencia === 'diaria') return ultimo === null || ultimo <= hace(20)
  if (alerta.frecuencia === 'semanal') return esLunesEnMadrid(ahora) && (ultimo === null || ultimo <= hace(6 * 24))
  return false
}

/** Desde cuándo buscar: el último envío o, la primera vez, hace 7 días. */
export function desdeDe(alerta: Pick<Alerta, 'ultimo_envio_at'>, ahora: Date): Date {
  return alerta.ultimo_envio_at ? new Date(alerta.ultimo_envio_at) : new Date(ahora.getTime() - VENTANA_INICIAL_MS)
}

// ── Qué coincide ──────────────────────────────────────────────────────────

/**
 * Convocatorias de una alerta: publicadas después de `desde`, con plazo no
 * vencido (o sin plazo), del país y la categoría elegidos (listas vacías =
 * todos). Una convocatoria sin país o sin categoría solo entra si la alerta
 * no filtra por eso. Ordenadas por fecha límite más próxima (sin plazo, al
 * final).
 */
export function coincidencias(alerta: Pick<Alerta, 'paises' | 'categorias'>, convocatorias: ConvocatoriaAlerta[], desde: Date, ahora: Date): ConvocatoriaAlerta[] {
  const fin = (c: ConvocatoriaAlerta) => (c.deadline ? new Date(c.deadline).getTime() : Number.POSITIVE_INFINITY)
  return convocatorias
    .filter(c => c.fecha_publicacion !== null && new Date(c.fecha_publicacion).getTime() > desde.getTime())
    .filter(c => c.deadline === null || new Date(c.deadline).getTime() > ahora.getTime())
    .filter(c => alerta.paises.length === 0 || (c.pais_code !== null && alerta.paises.includes(c.pais_code)))
    .filter(c => alerta.categorias.length === 0 || (c.category !== null && alerta.categorias.includes(c.category)))
    .sort((a, b) => fin(a) - fin(b))
}

// ── Token de baja ─────────────────────────────────────────────────────────
//
// Identifica a un usuario y solo sirve para desactivar su alerta. No caduca:
// un enlace de baja tiene que seguir funcionando en correos antiguos. Firmado
// con HMAC-SHA256 y ALERTAS_CONVOCATORIAS_SECRET.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PROPOSITO = 'baja-alertas-convocatorias'

function claveBaja(): string | null {
  const s = process.env.ALERTAS_CONVOCATORIAS_SECRET
  return s && s.length > 0 ? s : null
}

function firmar(datos: string, clave: string): string {
  return createHmac('sha256', clave).update(`${PROPOSITO}:${datos}`, 'utf8').digest('base64url')
}

export function crearTokenBaja(profileId: string): string | null {
  const clave = claveBaja()
  if (!clave) return null
  const datos = Buffer.from(profileId, 'utf8').toString('base64url')
  return `${datos}.${firmar(datos, clave)}`
}

/** Devuelve el profile_id si el token es auténtico; null en cualquier otro caso. Nunca lanza. */
export function verificarTokenBaja(token: string | null | undefined): string | null {
  const clave = claveBaja()
  if (!clave || typeof token !== 'string' || token.length > 300) return null
  const [datos, firma, ...resto] = token.split('.')
  if (!datos || !firma || resto.length > 0) return null
  const esperada = Buffer.from(firmar(datos, clave), 'utf8')
  const recibida = Buffer.from(firma, 'utf8')
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null
  const id = Buffer.from(datos, 'base64url').toString('utf8')
  return UUID.test(id) ? id : null
}

export const enlaceBaja = (token: string) => `${SITIO}/alertas/baja?t=${encodeURIComponent(token)}`
/** Baja de un clic desde el propio cliente de correo (RFC 8058: POST sin cuerpo útil). */
export const enlaceBajaUnClic = (token: string) => `${SITIO}/api/alertas/baja?t=${encodeURIComponent(token)}`

// ── Correo ────────────────────────────────────────────────────────────────

function escaparHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function fechaLimite(deadline: string | null): string {
  if (!deadline) return 'Sin fecha límite'
  return new Date(deadline).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' })
}

export function asunto(total: number): string {
  return total === 1 ? '1 convocatoria nueva para ti' : `${total} convocatorias nuevas para ti`
}

/** «Ver todas»: al listado, con el país si la alerta filtra por uno solo. */
export function enlaceVerTodas(alerta: Pick<Alerta, 'paises'>): string {
  return alerta.paises.length === 1 ? `${SITIO}/convocatoria?pais=${alerta.paises[0]}` : `${SITIO}/convocatoria`
}

/** HTML del correo con como mucho MAX_POR_CORREO convocatorias. */
export function construirHtml(alerta: Pick<Alerta, 'paises'>, lista: ConvocatoriaAlerta[], tokenBaja: string): string {
  const visibles = lista.slice(0, MAX_POR_CORREO)
  const filas = visibles.map(c => {
    const pais = c.pais_code ? getCountryByCode(c.pais_code)?.name ?? c.pais_code : c.location
    return `
        <tr><td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#b91c1c;text-transform:uppercase;letter-spacing:1px;">${escaparHtml(etiquetaCategoria(c.category))}</p>
          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:17px;line-height:1.3;"><a href="${SITIO}/convocatoria/${encodeURIComponent(c.id)}" style="color:#111827;text-decoration:none;">${escaparHtml(c.title)}</a></p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#4b5563;line-height:1.6;">
            ${c.entidad_convocante ? `${escaparHtml(c.entidad_convocante)}<br>` : ''}
            ${pais ? `${escaparHtml(pais)} · ` : ''}Fecha límite: ${escaparHtml(fechaLimite(c.deadline))}
          </p>
          <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:13px;"><a href="${SITIO}/convocatoria/${encodeURIComponent(c.id)}" style="color:#b91c1c;">Ver la convocatoria →</a></p>
        </td></tr>`
  }).join('')

  const mas = lista.length > MAX_POR_CORREO
    ? `Te mostramos las ${MAX_POR_CORREO} de plazo más próximo de ${lista.length}.`
    : ''

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6"><tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;">
      <tr><td style="padding:20px 28px;background:#0a0a0a;">
        <p style="margin:0;font-family:Georgia,serif;font-size:11px;color:#c9a84c;letter-spacing:3px;text-transform:uppercase;">OBRASDETEATRO.COM · TUS ALERTAS</p>
      </td></tr>
      <tr><td style="padding:24px 28px 4px;">
        <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:20px;color:#111827;">${escaparHtml(asunto(lista.length))}</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;">Convocatorias publicadas desde tu último aviso que coinciden con tus alertas, de plazo más próximo a más lejano. ${escaparHtml(mas)}</p>
      </td></tr>
      <tr><td style="padding:0 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${filas}
      </table></td></tr>
      <tr><td style="padding:18px 28px 6px;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;"><a href="${escaparHtml(enlaceVerTodas(alerta))}" style="color:#b91c1c;">Ver todas las convocatorias →</a></p>
      </td></tr>
      <tr><td style="padding:16px 28px 24px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.6;">
          Recibes este correo porque activaste las alertas de convocatorias en obrasdeteatro.com.<br>
          <a href="${SITIO}/perfil/centro#alertas" style="color:#374151;">Gestionar mis alertas</a> ·
          <a href="${escaparHtml(enlaceBaja(tokenBaja))}" style="color:#374151;">Darme de baja</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
