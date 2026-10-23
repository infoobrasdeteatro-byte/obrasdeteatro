import { contieneCodigo } from './verificacion'

/**
 * Comprobación automática: descarga la página enviada (solo https, sin seguir
 * redirecciones, 6 s y 1 MB como mucho) y busca el código. Es una ayuda para
 * moderación, no una decisión: Instagram y otras redes suelen bloquear la
 * descarga, y entonces queda «sin comprobar» (null).
 */
export async function comprobarCodigoEnEnlace(url: string, codigo: string): Promise<boolean | null> {
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'ObrasDeTeatro-Verificacion/1.0 (+https://www.obrasdeteatro.com)' },
    })
    if (!res.ok || !res.body) return null
    const lector = res.body.getReader()
    const decodificador = new TextDecoder()
    let texto = ''
    while (texto.length < 1_000_000) {
      const { done, value } = await lector.read()
      if (done) break
      texto += decodificador.decode(value, { stream: true })
      if (contieneCodigo(texto, codigo)) { lector.cancel().catch(() => {}); return true }
    }
    lector.cancel().catch(() => {})
    return false
  } catch {
    return null
  }
}

/** Aviso por correo (Resend). Si falla, no rompe la acción. */
export async function enviarAviso(to: string, subject: string, texto: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:560px">${
    texto.split('\n\n').map(p => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('')
  }<p style="color:#6b7280;font-size:13px">ObrasDeTeatro® · www.obrasdeteatro.com</p></div>`
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'ObrasDeTeatro® <no-reply@obrasdeteatro.com>', to, subject, html }),
    })
  } catch {
    // El aviso no es crítico: el estado se ve en el panel.
  }
}
