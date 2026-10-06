import { crearToken } from './token-moderacion'
import { getCountryByCode } from '@/lib/geo/countries'

/**
 * Resumen semanal de convocatorias pendientes de revisión, por correo.
 *
 * Funciones puras (HTML y asunto) más el envío por Resend. La consulta y la
 * autenticación del cron viven en app/api/cron/resumen-convocatorias.
 */

export const SITIO = 'https://www.obrasdeteatro.com'
export const REMITENTE = 'ObrasDeTeatro® <no-reply@obrasdeteatro.com>'
export const DESTINATARIO_POR_DEFECTO = 'hola@obrasdeteatro.com'
export const MAX_RESUMEN_CORTO = 220

export type PendienteResumen = {
  id: string
  title: string
  description: string | null
  origen: string
  lote: string | null
  pais_code: string | null
  ciudad: string | null
  location: string | null
  entidad_convocante: string | null
  deadline: string | null
  prize: string | null
  url_bases: string | null
  fuente_dominio: string | null
}

export function destinatario(): string {
  const d = process.env.CONVOCATORIAS_RESUMEN_EMAIL?.trim()
  return d ? d : DESTINATARIO_POR_DEFECTO
}

function escaparHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Solo https se pinta como enlace. */
function hrefSeguro(url: string | null): string | null {
  return url && /^https:\/\/[^\s"'<>]+$/i.test(url) ? url : null
}

export function resumenCorto(texto: string | null): string {
  const t = (texto ?? '').replace(/\s+/g, ' ').trim()
  return t.length <= MAX_RESUMEN_CORTO ? t : `${t.slice(0, MAX_RESUMEN_CORTO - 1).trimEnd()}…`
}

function lugar(c: PendienteResumen): string {
  const pais = c.pais_code ? getCountryByCode(c.pais_code)?.name ?? c.pais_code : null
  const partes = [pais, c.ciudad].filter(Boolean)
  return partes.length > 0 ? partes.join(' · ') : c.location ?? '—'
}

function fechaLimite(deadline: string | null): string {
  if (!deadline) return 'Sin fecha límite'
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' })
}

export function enlaceModeracion(token: string): string {
  return `${SITIO}/admin/convocatorias/moderar?t=${encodeURIComponent(token)}`
}

export function asunto(pendientes: number): string {
  return pendientes === 1
    ? 'Convocatorias: 1 pendiente de revisión esta semana'
    : `Convocatorias: ${pendientes} pendientes de revisión esta semana`
}

/**
 * HTML del correo. Lanza si falta el secreto de los tokens: un correo sin
 * botones válidos no debe salir.
 */
export function construirHtml(pendientes: PendienteResumen[], bdnsAutopublicadas: number, ahora: Date = new Date()): string {
  const tarjetas = pendientes.map(c => {
    const aprobar = crearToken(c.id, 'aprobar', ahora)
    const rechazar = crearToken(c.id, 'rechazar', ahora)
    if (!aprobar || !rechazar) throw new Error('Falta CONVOCATORIAS_MODERACION_SECRET')

    const fuente = hrefSeguro(c.url_bases)
    const origen = c.origen === 'redaccion'
      ? `Redacción · ${escaparHtml(c.lote?.split('-')[0] ?? 'automática')}`
      : 'Usuario'

    return `
          <tr><td style="padding:20px 0;border-bottom:1px solid #e5e7eb;">
            <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">${origen}</p>
            <p style="margin:0 0 8px;font-family:Georgia,serif;font-size:17px;color:#111827;line-height:1.3;">${escaparHtml(c.title)}</p>
            <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;color:#374151;line-height:1.6;">
              <strong>Lugar:</strong> ${escaparHtml(lugar(c))}<br>
              <strong>Entidad:</strong> ${escaparHtml(c.entidad_convocante ?? '—')}<br>
              <strong>Fecha límite:</strong> ${escaparHtml(fechaLimite(c.deadline))}
              ${c.prize ? `<br><strong>Dotación:</strong> ${escaparHtml(c.prize)}` : ''}
            </p>
            ${c.description ? `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:13px;color:#4b5563;line-height:1.6;">${escaparHtml(resumenCorto(c.description))}</p>` : ''}
            ${fuente ? `<p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:13px;"><a href="${escaparHtml(fuente)}" style="color:#b91c1c;">Fuente${c.fuente_dominio ? `: ${escaparHtml(c.fuente_dominio)}` : ''}</a></p>` : ''}
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding-right:8px;"><a href="${escaparHtml(enlaceModeracion(aprobar))}" style="display:inline-block;padding:9px 18px;background:#111827;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;text-decoration:none;border-radius:6px;">Aprobar</a></td>
              <td><a href="${escaparHtml(enlaceModeracion(rechazar))}" style="display:inline-block;padding:9px 18px;background:#ffffff;color:#111827;border:1px solid #d1d5db;font-family:Arial,sans-serif;font-size:13px;text-decoration:none;border-radius:6px;">Rechazar</a></td>
            </tr></table>
          </td></tr>`
  }).join('')

  const bdns = bdnsAutopublicadas === 1
    ? 'Esta semana se ha publicado automáticamente 1 convocatoria de la BDNS.'
    : `Esta semana se han publicado automáticamente ${bdnsAutopublicadas} convocatorias de la BDNS.`

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6"><tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;">
      <tr><td style="padding:20px 28px;background:#0a0a0a;">
        <p style="margin:0;font-family:Georgia,serif;font-size:11px;color:#c9a84c;letter-spacing:3px;text-transform:uppercase;">OBRASDETEATRO.COM · RESUMEN SEMANAL</p>
      </td></tr>
      <tr><td style="padding:24px 28px 8px;">
        <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:20px;color:#111827;">${escaparHtml(asunto(pendientes.length))}</p>
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#6b7280;line-height:1.6;">${escaparHtml(bdns)} Los botones abren una página de confirmación: nada cambia hasta que confirmes con tu sesión de moderación. Los enlaces caducan a los 14 días.</p>
      </td></tr>
      <tr><td style="padding:0 28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0">${tarjetas}
      </table></td></tr>
      <tr><td style="padding:20px 28px 28px;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;"><a href="${SITIO}/admin/convocatorias" style="color:#b91c1c;">Revisar todas en el panel de moderación →</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

export type ResultadoEnvio = { ok: true } | { ok: false; error: string }

/** Envía el correo por Resend. No lanza: devuelve el error para que el cron lo registre. */
export async function enviarResumen(html: string, pendientes: number): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'Falta RESEND_API_KEY' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: REMITENTE, to: destinatario(), subject: asunto(pendientes), html }),
    })
    if (!res.ok) return { ok: false, error: `Resend respondió ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error de red' }
  }
}
