import { REMITENTE, SITIO, destinatario } from '@/lib/convocatorias/resumen-semanal'

/**
 * Aviso a moderación cuando entra una reclamación de ficha de espacio.
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

function escaparHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function asuntoAviso(espacioNombre: string): string {
  return `Espacios: nueva reclamación de «${espacioNombre}»`
}

export function construirHtmlAviso(d: DatosAviso): string {
  const ficha = `${SITIO}/espacios/${encodeURIComponent(d.espacioSlug)}`
  const bandeja = `${SITIO}/admin/espacios#reclamaciones`
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f6f5f2;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px">
<tr><td style="padding:24px">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#b3261e">Espacios escénicos</p>
  <h1 style="margin:0 0 16px;font-size:20px">Nueva reclamación de ficha</h1>
  <p style="margin:0 0 6px;font-size:14px"><strong>Espacio:</strong> <a href="${ficha}" style="color:#1a1a1a">${escaparHtml(d.espacioNombre)}</a> (${escaparHtml(d.municipio)})</p>
  <p style="margin:0 0 6px;font-size:14px"><strong>Solicitante:</strong> ${escaparHtml(d.solicitante)}</p>
  <p style="margin:12px 0 6px;font-size:14px"><strong>Mensaje:</strong></p>
  <p style="margin:0 0 20px;font-size:14px;line-height:1.5;white-space:pre-wrap;background:#f6f5f2;padding:12px;border-radius:6px">${escaparHtml(d.mensaje)}</p>
  <p style="margin:0"><a href="${bandeja}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px">Revisar en la bandeja</a></p>
  <p style="margin:20px 0 0;font-size:12px;color:#777">Antes de aprobar, confirma por otro canal que la persona gestiona de verdad el espacio.</p>
</td></tr></table>
</body></html>`
}

export type ResultadoEnvio = { ok: true } | { ok: false; error: string }

/** Envía el aviso por Resend. No lanza: devuelve el error para registrarlo. */
export async function enviarAvisoReclamacion(d: DatosAviso): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'Falta RESEND_API_KEY' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: REMITENTE, to: destinatario(), subject: asuntoAviso(d.espacioNombre), html: construirHtmlAviso(d) }),
    })
    if (!res.ok) return { ok: false, error: `Resend respondió ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error de red' }
  }
}
