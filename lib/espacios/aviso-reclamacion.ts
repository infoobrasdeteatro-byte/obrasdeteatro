import { REMITENTE, SITIO, destinatario } from '@/lib/convocatorias/resumen-semanal'

/**
 * Avisos a moderación de espacios escénicos: una reclamación de ficha o una
 * sugerencia de corrección acaba de entrar.
 *
 * Mismo patrón que el resumen semanal de convocatorias: HTML y asunto en
 * funciones puras, envío por la API de Resend con fetch, mismo remitente y
 * mismo buzón de moderación (CONVOCATORIAS_RESUMEN_EMAIL o hola@).
 *
 * El correo no lleva botones de aprobar: se resuelve en /admin/espacios con
 * la sesión del moderador.
 */

export type DatosAviso = {
  espacioNombre: string
  espacioSlug: string
  municipio: string
  solicitante: string
  mensaje: string
}

export type DatosAvisoSugerencia = {
  espacioNombre: string
  espacioSlug: string
  municipio: string
  /** Quién la envía, como se enseña en el correo (sesión o visitante y email de respuesta). */
  remitente: string
  mensaje: string
}

type Clase = 'reclamacion' | 'sugerencia'

const TEXTOS: Record<Clase, { titulo: string; quien: string; ancla: string; nota: string; asunto: (n: string) => string }> = {
  reclamacion: {
    titulo: 'Nueva reclamación de ficha',
    quien: 'Solicitante',
    ancla: 'reclamaciones',
    nota: 'Antes de aprobar, confirma por otro canal que la persona gestiona de verdad el espacio.',
    asunto: n => `Espacios: nueva reclamación de «${n}»`,
  },
  sugerencia: {
    titulo: 'Nueva sugerencia de corrección',
    quien: 'Enviada por',
    ancla: 'sugerencias',
    nota: 'Comprueba el dato en una fuente fiable antes de corregir la ficha.',
    asunto: n => `Espacios: sugerencia de corrección para «${n}»`,
  },
}

function escaparHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function asuntoAviso(espacioNombre: string): string {
  return TEXTOS.reclamacion.asunto(espacioNombre)
}

export function asuntoAvisoSugerencia(espacioNombre: string): string {
  return TEXTOS.sugerencia.asunto(espacioNombre)
}

function html(clase: Clase, d: { espacioNombre: string; espacioSlug: string; municipio: string; quien: string; mensaje: string }): string {
  const t = TEXTOS[clase]
  const ficha = `${SITIO}/espacios/${encodeURIComponent(d.espacioSlug)}`
  const bandeja = `${SITIO}/admin/espacios#${t.ancla}`
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f6f5f2;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px">
<tr><td style="padding:24px">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#b3261e">Espacios escénicos</p>
  <h1 style="margin:0 0 16px;font-size:20px">${t.titulo}</h1>
  <p style="margin:0 0 6px;font-size:14px"><strong>Espacio:</strong> <a href="${ficha}" style="color:#1a1a1a">${escaparHtml(d.espacioNombre)}</a> (${escaparHtml(d.municipio)})</p>
  <p style="margin:0 0 6px;font-size:14px"><strong>${t.quien}:</strong> ${escaparHtml(d.quien)}</p>
  <p style="margin:12px 0 6px;font-size:14px"><strong>Mensaje:</strong></p>
  <p style="margin:0 0 20px;font-size:14px;line-height:1.5;white-space:pre-wrap;background:#f6f5f2;padding:12px;border-radius:6px">${escaparHtml(d.mensaje)}</p>
  <p style="margin:0"><a href="${bandeja}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">Revisar en la bandeja</a></p>
  <p style="margin:20px 0 0;font-size:12px;color:#777">${t.nota}</p>
</td></tr></table>
</body></html>`
}

export function construirHtmlAviso(d: DatosAviso): string {
  return html('reclamacion', { ...d, quien: d.solicitante })
}

export function construirHtmlAvisoSugerencia(d: DatosAvisoSugerencia): string {
  return html('sugerencia', { ...d, quien: d.remitente })
}

export type ResultadoEnvio = { ok: true } | { ok: false; error: string }

/** Envía por Resend. No lanza: devuelve el error para registrarlo. */
async function enviar(subject: string, cuerpoHtml: string): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'Falta RESEND_API_KEY' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: REMITENTE, to: destinatario(), subject, html: cuerpoHtml }),
    })
    if (!res.ok) return { ok: false, error: `Resend respondió ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error de red' }
  }
}

export function enviarAvisoReclamacion(d: DatosAviso): Promise<ResultadoEnvio> {
  return enviar(asuntoAviso(d.espacioNombre), construirHtmlAviso(d))
}

export function enviarAvisoSugerencia(d: DatosAvisoSugerencia): Promise<ResultadoEnvio> {
  return enviar(asuntoAvisoSugerencia(d.espacioNombre), construirHtmlAvisoSugerencia(d))
}
