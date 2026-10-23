/**
 * Aviso por correo a las cuentas con el perfil incompleto (octubre 2026).
 * Cada persona recibe solo los puntos que le faltan. Funciones puras: la
 * lectura de datos y el envío están en ./perfil-incompleto-envio.
 */
import { TIPOS_PERSONA } from '@/lib/perfiles/profesiones'

export const ASUNTO_AVISO_PERFIL = 'Unos detalles para completar tu perfil en ObrasDeTeatro®'
export const REMITENTE_AVISO_PERFIL = 'Renee Bausson · ObrasDeTeatro® <hola@obrasdeteatro.com>'
export const RESPONDER_A_AVISO_PERFIL = 'hola@obrasdeteatro.com'
export const URL_PANEL_PERFIL = 'https://www.obrasdeteatro.com/perfil'

export type Falta = 'tipo' | 'foto' | 'profesiones' | 'bio' | 'ciudad'

export type DatosPerfil = {
  tipo_perfil: string
  avatar_url: string | null
  bio: string | null
  ciudad: string | null
  num_profesiones: number
}

const esPersona = (tipo: string) => (TIPOS_PERSONA as readonly string[]).includes(tipo)
const esOrganizacion = (tipo: string) => tipo !== 'publico' && !esPersona(tipo)

/** Lo que le falta a un perfil, en el orden en que se cuenta en el correo. */
export function faltasDelPerfil(p: DatosPerfil): Falta[] {
  const faltas: Falta[] = []
  if (p.tipo_perfil === 'publico') faltas.push('tipo')
  if (!p.avatar_url?.trim()) faltas.push('foto')
  // Las profesiones solo existen para personas con perfil profesional.
  if (esPersona(p.tipo_perfil) && p.num_profesiones === 0) faltas.push('profesiones')
  if (!p.bio?.trim()) faltas.push('bio')
  if (!p.ciudad?.trim()) faltas.push('ciudad')
  return faltas
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Texto de cada punto: [negrita, resto]. */
export function textoFalta(f: Falta, tipo: string): [string, string] {
  switch (f) {
    case 'tipo':
      return ['Tu tipo de perfil.', ' Tu cuenta figura como «Público general». Si te dedicas a las artes escénicas, cámbialo a Profesional o al tipo de tu organización (compañía, sala, festival, escuela…); solo así apareces en el directorio. Si vienes como espectador o espectadora, puedes dejarlo tal cual.']
    case 'foto':
      return esOrganizacion(tipo)
        ? ['El logotipo de tu organización.', ' Sin él, tu ficha no aparece en el directorio.']
        : ['Una foto de perfil.', ' Sin ella, tu ficha no aparece en el directorio.']
    case 'profesiones':
      return ['Tus profesiones', ' (dirección, interpretación, producción…). Marca primero la principal.']
    case 'bio':
      return esOrganizacion(tipo)
        ? ['Una breve presentación.', ' Tres o cuatro líneas sobre vuestra trayectoria bastan para empezar.']
        : ['Una breve biografía.', ' Tres o cuatro líneas bastan para empezar.']
    case 'ciudad':
      return esOrganizacion(tipo)
        ? ['Vuestra ciudad.', ' Así os encuentran quienes buscan compañías o salas en vuestra zona.']
        : ['Tu ciudad.', ' Así te encuentran quienes buscan profesionales o salas en tu zona.']
  }
}

/** El correo en HTML. `nombre` vacío deja el saludo en «Hola:». */
export function construirHtmlAvisoPerfil(nombre: string, tipo: string, faltas: Falta[]): string {
  const saludo = nombre.trim() ? `Hola, ${esc(nombre.trim())}:` : 'Hola:'
  const p = (t: string) => `<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;color:#374151;line-height:1.6;">${t}</p>`
  const puntos = faltas.map(f => {
    const [neg, resto] = textoFalta(f, tipo)
    return `<li style="margin:0 0 10px;"><strong style="color:#111827;">${esc(neg)}</strong>${esc(resto)}</li>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(ASUNTO_AVISO_PERFIL)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6"><tr><td align="center" style="padding:24px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;">
      <tr><td style="padding:20px 28px;background:#0a0a0a;">
        <p style="margin:0;font-family:Georgia,serif;font-size:20px;color:#ffffff;">ObrasDeTeatro®</p>
      </td></tr>
      <tr><td style="padding:28px;">
        ${p(saludo)}
        ${p('Gracias por formar parte de ObrasDeTeatro®.')}
        ${p('Tu perfil ya está en marcha, pero le faltan algunos detalles para que se vea completo en el directorio y quienes te busquen sepan quién eres y a qué te dedicas:')}
        <ul style="margin:0 0 18px;padding-left:20px;font-family:Arial,sans-serif;font-size:15px;color:#374151;line-height:1.6;">${puntos}</ul>
        <p style="margin:0 0 18px;"><a href="${URL_PANEL_PERFIL}" style="display:inline-block;background:#b91c1c;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;padding:12px 22px;text-decoration:none;">Completa tu perfil</a></p>
        ${p('En tu panel verás el porcentaje completado y el siguiente paso recomendado.')}
        ${p('Si tienes cualquier duda, responde a este correo y te ayudamos personalmente.')}
        <p style="margin:22px 0 0;font-family:Arial,sans-serif;font-size:15px;color:#374151;line-height:1.6;">Un saludo cordial,<br><br><strong style="color:#111827;">Renee Bausson</strong><br>Fundador de ObrasDeTeatro®<br><a href="https://www.obrasdeteatro.com" style="color:#b91c1c;">www.obrasdeteatro.com</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

/** Versión en texto plano, para clientes de correo sin HTML. */
export function construirTextoAvisoPerfil(nombre: string, tipo: string, faltas: Falta[]): string {
  const saludo = nombre.trim() ? `Hola, ${nombre.trim()}:` : 'Hola:'
  const puntos = faltas.map(f => `- ${textoFalta(f, tipo).join('')}`).join('\n')
  return `${saludo}

Gracias por formar parte de ObrasDeTeatro®.

Tu perfil ya está en marcha, pero le faltan algunos detalles para que se vea completo en el directorio y quienes te busquen sepan quién eres y a qué te dedicas:

${puntos}

Completa tu perfil: ${URL_PANEL_PERFIL}

En tu panel verás el porcentaje completado y el siguiente paso recomendado.

Si tienes cualquier duda, responde a este correo y te ayudamos personalmente.

Un saludo cordial,

Renee Bausson
Fundador de ObrasDeTeatro®
www.obrasdeteatro.com`
}
