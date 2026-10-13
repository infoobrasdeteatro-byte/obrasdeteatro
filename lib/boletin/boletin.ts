/**
 * Boletín semanal: reglas, tokens y HTML del correo (funciones puras).
 *
 * La consulta del contenido y el envío están en lib/boletin/envio.ts; la
 * suscripción, en app/boletin/acciones.ts; la tabla, en la migración
 * 20261013170000_boletin.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getCountryByCode } from '@/lib/geo/countries'
import type { ConfigBoletin } from './constantes'

export { DIAS, type ConfigBoletin } from './constantes'

export const SITIO = 'https://www.obrasdeteatro.com'
export const REMITENTE_DIRECCION = 'boletin@obrasdeteatro.com'
/** Las respuestas de los lectores llegan a este buzón (existe en Arsys). */
export const RESPONDER_A = 'hola@obrasdeteatro.com'
export const PLANES_DE_PAGO: ReadonlySet<string> = new Set(['premium', 'destacado', 'empresas'])
export const MAX_POR_SECCION = 6
/** Reenvío del correo de confirmación como mucho una vez por hora. */
export const ESPERA_REENVIO_MS = 60 * 60 * 1000


// ── Correo ──────────────────────────────────────────────────────────────────

export const normalizarEmail = (v: string) => v.trim().toLowerCase()
export const emailValido = (v: string) =>
  v.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/.test(v)

// ── Cuándo toca ─────────────────────────────────────────────────────────────

/** Día ISO (1 = lunes … 7 = domingo) en Madrid. */
export function diaIsoMadrid(ahora: Date): number {
  const corto = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'short' }).format(ahora)
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(corto) + 1
}

/**
 * ¿Toca el envío semanal? Solo si está activo, hoy es el día elegido (hora de
 * Madrid) y el último envío real fue hace más de 6 días: un cron que se
 * ejecute dos veces no manda el boletín dos veces.
 */
export function tocaEnvio(config: Pick<ConfigBoletin, 'activo' | 'dia_envio'>, ultimoEnvio: string | null, ahora: Date): boolean {
  if (!config.activo || diaIsoMadrid(ahora) !== config.dia_envio) return false
  return !ultimoEnvio || ahora.getTime() - new Date(ultimoEnvio).getTime() > 6 * 24 * 60 * 60 * 1000
}

// ── Tokens ──────────────────────────────────────────────────────────────────

/** Enlace de confirmación: aleatorio; en la base solo se guarda su hash. */
export function crearTokenConfirmacion(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}
export const hashToken = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex')

const PROPOSITO_BAJA = 'baja-boletin'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Misma clave que las alertas de convocatorias, con otro propósito: un token de una no sirve para la otra. */
function clave(): string | null {
  const s = process.env.ALERTAS_CONVOCATORIAS_SECRET
  return s && s.length > 0 ? s : null
}
const firmar = (datos: string, k: string) => createHmac('sha256', k).update(`${PROPOSITO_BAJA}:${datos}`, 'utf8').digest('base64url')

export function crearTokenBaja(suscriptorId: string): string | null {
  const k = clave()
  if (!k) return null
  const datos = Buffer.from(suscriptorId, 'utf8').toString('base64url')
  return `${datos}.${firmar(datos, k)}`
}

/** El id del suscriptor si el token es auténtico; null en otro caso. Nunca lanza. */
export function verificarTokenBaja(token: string | null | undefined): string | null {
  const k = clave()
  if (!k || typeof token !== 'string' || token.length > 300) return null
  const [datos, firma, ...resto] = token.split('.')
  if (!datos || !firma || resto.length) return null
  const a = Buffer.from(firmar(datos, k), 'utf8')
  const b = Buffer.from(firma, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  const id = Buffer.from(datos, 'base64url').toString('utf8')
  return UUID.test(id) ? id : null
}

export const enlaceConfirmacion = (token: string) => `${SITIO}/boletin/confirmar?t=${encodeURIComponent(token)}`
export const enlaceBaja = (token: string) => `${SITIO}/boletin/baja?t=${encodeURIComponent(token)}`
export const enlaceBajaUnClic = (token: string) => `${SITIO}/api/boletin/baja?t=${encodeURIComponent(token)}`

// ── Contenido ───────────────────────────────────────────────────────────────

export type ContenidoBoletin = {
  noticias: { titular: string; fuente: string | null; pais_code: string | null }[]
  convocatorias: { id: string; title: string; pais_code: string | null; deadline: string | null }[]
  formaciones: { slug: string; titulo: string; tipo: string; lugar: string }[]
  episodios: { titulo: string; programa: string; ruta: string }[]
}

export const contenidoVacio = (c: ContenidoBoletin) =>
  c.noticias.length + c.convocatorias.length + c.formaciones.length + c.episodios.length === 0

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const pais = (code: string | null) => (code ? getCountryByCode(code)?.name ?? code : null)
const fechaLarga = (d: Date) => d.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' })

export function asuntoBoletin(nombre: string, c: ContenidoBoletin): string {
  const destacado = c.convocatorias.length
    ? `${c.convocatorias.length} ${c.convocatorias.length === 1 ? 'convocatoria nueva' : 'convocatorias nuevas'}`
    : c.noticias.length ? 'la actualidad teatral de la semana' : 'novedades de la semana'
  return `${nombre}: ${destacado}`
}

function seccion(titulo: string, filas: string[], verTodo: { texto: string; url: string }): string {
  if (!filas.length) return ''
  return `
      <tr><td style="padding:22px 28px 0;">
        <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#b91c1c;letter-spacing:2px;text-transform:uppercase;">${esc(titulo)}</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">${filas.join('')}</table>
        <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:13px;"><a href="${esc(verTodo.url)}" style="color:#b91c1c;">${esc(verTodo.texto)} →</a></p>
      </td></tr>`
}

const fila = (titulo: string, url: string, detalle: string | null) => `
          <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <p style="margin:0;font-family:Georgia,serif;font-size:16px;line-height:1.35;"><a href="${esc(url)}" style="color:#111827;text-decoration:none;">${esc(titulo)}</a></p>
            ${detalle ? `<p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;">${esc(detalle)}</p>` : ''}
          </td></tr>`

/**
 * HTML del boletín. `invitarPremium`: añade al final la invitación a las
 * alertas personalizadas de los planes de pago (no se pone a quien ya paga).
 */
export function construirHtmlBoletin(nombre: string, c: ContenidoBoletin, tokenBaja: string, ahora: Date, invitarPremium: boolean): string {
  const n = c.noticias.slice(0, MAX_POR_SECCION).map(x =>
    fila(x.titular, `${SITIO}/noticias`, [x.fuente, pais(x.pais_code)].filter(Boolean).join(' · ') || null))
  const cv = c.convocatorias.slice(0, MAX_POR_SECCION).map(x =>
    fila(x.title, `${SITIO}/convocatoria/${encodeURIComponent(x.id)}`,
      [pais(x.pais_code), x.deadline ? `Plazo: ${fechaLarga(new Date(x.deadline))}` : null].filter(Boolean).join(' · ') || null))
  const f = c.formaciones.slice(0, MAX_POR_SECCION).map(x =>
    fila(x.titulo, `${SITIO}/formacion/${encodeURIComponent(x.slug)}`, `${x.tipo} · ${x.lugar}`))
  const e = c.episodios.slice(0, MAX_POR_SECCION).map(x => fila(x.titulo, `${SITIO}${x.ruta}`, x.programa))

  const premium = invitarPremium ? `
      <tr><td style="padding:24px 28px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf7f0;border:1px solid #eadfc4;"><tr><td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:15px;color:#111827;">¿Solo quieres las convocatorias de tu país, en cuanto se publican?</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#4b5563;line-height:1.6;">Con un plan Premium recibes alertas a tu medida por país y categoría, a diario o cada semana. <a href="${SITIO}/precios" style="color:#b91c1c;">Ver planes →</a></p>
        </td></tr></table>
      </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(nombre)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6"><tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;">
      <tr><td style="padding:22px 28px;background:#0a0a0a;">
        <p style="margin:0;font-family:Georgia,serif;font-size:22px;color:#ffffff;">${esc(nombre)}</p>
        <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#c9a84c;letter-spacing:2px;text-transform:uppercase;">obrasdeteatro.com · ${esc(fechaLarga(ahora))}</p>
      </td></tr>
      <tr><td style="padding:22px 28px 0;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#374151;line-height:1.6;">Lo más destacado de la semana en el teatro en español: noticias, convocatorias abiertas, formación y nuevos episodios en la Mediateca.</p>
      </td></tr>
      ${seccion('Noticias', n, { texto: 'Todas las noticias', url: `${SITIO}/noticias` })}
      ${seccion('Convocatorias nuevas', cv, { texto: 'Todas las convocatorias', url: `${SITIO}/convocatoria` })}
      ${seccion('Formación', f, { texto: 'Toda la formación', url: `${SITIO}/formacion` })}
      ${seccion('Mediateca', e, { texto: 'Ir a la Mediateca', url: `${SITIO}/mediateca` })}
      ${premium}
      <tr><td style="padding:24px 28px;border-top:1px solid #e5e7eb;margin-top:24px;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.6;">
          Recibes ${esc(nombre)} porque te suscribiste en obrasdeteatro.com.<br>
          <a href="${esc(enlaceBaja(tokenBaja))}" style="color:#374151;">Darme de baja</a> ·
          <a href="${SITIO}/legal/privacidad" style="color:#374151;">Privacidad</a><br>
          CONECTA PLUS GLOBAL, S.L. · Santa Cruz de Tenerife, España
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

/** Correo de confirmación (doble opt-in). */
export function construirHtmlConfirmacion(nombre: string, token: string): string {
  const url = enlaceConfirmacion(token)
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6"><tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;">
      <tr><td style="padding:20px 28px;background:#0a0a0a;">
        <p style="margin:0;font-family:Georgia,serif;font-size:20px;color:#ffffff;">${esc(nombre)}</p>
      </td></tr>
      <tr><td style="padding:24px 28px;">
        <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:18px;color:#111827;">Confirma tu suscripción</p>
        <p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:14px;color:#374151;line-height:1.6;">Has pedido recibir ${esc(nombre)}, el boletín semanal de obrasdeteatro.com. Para empezar a recibirlo, confirma que este es tu correo:</p>
        <p style="margin:0 0 18px;"><a href="${esc(url)}" style="display:inline-block;background:#b91c1c;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;padding:12px 22px;text-decoration:none;">Confirmar suscripción</a></p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.6;">Si no lo pediste tú, ignora este correo: no te suscribiremos ni volverás a recibir nada.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

export type CorreoBoletin = { para: string; asunto: string; html: string; tokenBaja?: string }

const remitente = (nombre: string) => `${nombre.replace(/[<>"]/g, '')} · ObrasDeTeatro® <${REMITENTE_DIRECCION}>`
const cuerpo = (c: CorreoBoletin, nombre: string) => ({
  from: remitente(nombre),
  reply_to: RESPONDER_A,
  to: c.para,
  subject: c.asunto,
  html: c.html,
  ...(c.tokenBaja ? {
    headers: {
      'List-Unsubscribe': `<${enlaceBajaUnClic(c.tokenBaja)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  } : {}),
})

/** Hasta 100 correos en una petición (API de lotes de Resend). Nunca lanza. */
export async function enviarLote(correos: CorreoBoletin[], nombre: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!correos.length) return true
  try {
    const res = await fetcher('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(correos.map(c => cuerpo(c, nombre))),
    })
    if (!res.ok) console.error('boletin: Resend (lote) respondió', res.status)
    return res.ok
  } catch (e) {
    console.error('boletin: error de red con Resend:', e instanceof Error ? e.message : e)
    return false
  }
}

/** Envío a Resend. Nunca lanza: devuelve si salió bien. */
export async function enviarCorreo(
  para: string, asunto: string, html: string, nombreRemitente: string, tokenBaja?: string, fetcher: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo({ para, asunto, html, tokenBaja }, nombreRemitente)),
    })
    if (!res.ok) console.error('boletin: Resend respondió', res.status)
    return res.ok
  } catch (e) {
    console.error('boletin: error de red con Resend:', e instanceof Error ? e.message : e)
    return false
  }
}
