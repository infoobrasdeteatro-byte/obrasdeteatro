/**
 * Plantillas predeterminadas de preinvitación del Master Control: el primer
 * mensaje personal, sin enlace, antes de crear la invitación en
 * /admin/embajadores o /admin/elenco. Una por distintivo y canal. Los textos
 * son los definitivos de Dirección: no se reformulan.
 */
import { enlaceWhatsapp } from '@/lib/embajadores/textos'

export type Distintivo = 'embajador' | 'fundador'
export type Canal = 'whatsapp' | 'correo'

export const DISTINTIVOS: { id: Distintivo; etiqueta: string }[] = [
  { id: 'embajador', etiqueta: 'Embajador/a de Escena' },
  { id: 'fundador', etiqueta: 'Elenco Fundador' },
]
export const CANALES: { id: Canal; etiqueta: string }[] = [
  { id: 'whatsapp', etiqueta: 'WhatsApp' },
  { id: 'correo', etiqueta: 'Correo' },
]

/** Por encima de este largo, algunos programas de correo cortan el mailto: se ofrece «Copiar texto». */
export const LIMITE_MAILTO = 1800

type Plantilla = { asunto?: string; cuerpo: string }

const PLANTILLAS: Record<Distintivo, Record<Canal, Plantilla>> = {
  embajador: {
    whatsapp: {
      cuerpo: `Hola, [Nombre]. ¿Cómo estás? Te saluda Renee Bausson, fundador de ObrasDeTeatro®.

Te escribo personalmente porque me encantaría contar contigo en obrasdeteatro.com, la plataforma profesional de las artes escénicas en español pensada para los 20 países de habla hispana, a la que he dedicado los últimos 5 años y más de 3.800 horas de programación.

Hoy la plataforma ya está construida en un 80 %, reuniendo un directorio de profesionales, castings y convocatorias de España y Latinoamérica, cartelera, una biblioteca con más de 5.800 obras y un catálogo de casi 4.000 espacios escénicos.

El 20 % restante son las personas, y he preferido apostar por el crecimiento orgánico de quienes hacen el teatro día a día. Por tu trayectoria, me gustaría proponerte una colaboración de beneficio mutuo al formar parte de Embajadores de Escena:
• Un año del plan Destacado de cortesía (sin tarjetas ni compromisos).
• Distintivo oficial de Embajador/a de Escena y lugar destacado en el directorio.
• Enlace exclusivo para invitar a colegas, que reciben 3 meses de Premium.
• Tu membresía se renueva con tu actividad: cuantos más colegas se suman activamente, más meses extiendes tu plan Destacado, hasta ser Embajador/a de Honor.

Tu presencia y tu trayectoria son lo que aporta la credibilidad inicial al ecosistema para hacerlo crecer para todos.

Si te interesa formar parte de la historia inicial del proyecto, respóndeme a este mensaje y te enviaré tu invitación personal. ¡Un abrazo!

Renee Bausson
Fundador de ObrasDeTeatro®`,
    },
    correo: {
      asunto: 'Invitación personal para [Nombre]: Programa Embajadores de Escena de ObrasDeTeatro®',
      cuerpo: `Hola, [Nombre]:

Soy Renee Bausson, fundador de ObrasDeTeatro®. Te escribo personalmente porque me encantaría contar contigo en el proyecto al que he dedicado los últimos cinco años.

obrasdeteatro.com es la plataforma profesional de las artes escénicas en español. Nace de una necesidad que conocemos bien quienes trabajamos en este oficio: el talento está disperso, las oportunidades llegan tarde o no llegan, y no existía un lugar común para los 20 países de habla hispana.

Hoy, la plataforma está materializada en un 80 %, tras más de 3.800 horas de programación e ingeniería de software, y ya reúne:
• Directorio de profesionales, compañías, productoras y salas.
• Castings y convocatorias de España y Latinoamérica.
• Cartelera de espectáculos y una biblioteca con más de 5.800 obras teatrales.
• Catálogo de casi 4.000 espacios escénicos.

El 20 % que falta no es técnico: son las personas. Una plataforma profesional cobra sentido cuando la habitan, desde el primer día, profesionales con tu trayectoria. Por eso, antes de buscar vías de financiación externas, he preferido apostar por lo orgánico y por quienes hacen el teatro: creo que, unidos, podemos darle al sector la herramienta que merece.

No te pido un favor; te propongo una colaboración de beneficio mutuo al formar parte de Embajadores de Escena.

Lo que obtienes como Embajador/a:
• Un año del plan Destacado de cortesía (sin tarjetas ni compromisos).
• Distintivo oficial de Embajador/a de Escena y lugar destacado en el directorio.
• Enlace exclusivo para invitar a colegas, que reciben 3 meses de Premium.
• Una membresía que se renueva con tu actividad: cuantos más colegas se suman activamente, más meses extiendes tu plan Destacado, hasta ser Embajador/a de Honor.

Tu presencia y tu trayectoria son lo que aporta la credibilidad inicial al ecosistema para hacerlo crecer para todos.

Si te interesa formar parte de la historia inicial del proyecto, responde a este correo y te haré llegar tu invitación personal con todos los detalles de acceso. Quedo a tu total disposición para cualquier duda, también por teléfono si lo prefieres.

Un abrazo,

Renee Bausson
Fundador de ObrasDeTeatro®
www.obrasdeteatro.com · hola@obrasdeteatro.com · +34 656 407 971`,
    },
  },
  fundador: {
    whatsapp: {
      cuerpo: `Hola, [Nombre]. ¿Cómo estás? Te saluda Renee Bausson, fundador de ObrasDeTeatro®.

Te escribo personalmente porque me encantaría contar contigo en obrasdeteatro.com, la plataforma profesional de las artes escénicas en español pensada para los 20 países de habla hispana, a la que he dedicado los últimos 5 años y más de 3.800 horas de programación.

Hoy la plataforma ya está construida en un 80 %, reuniendo un directorio de profesionales, castings y convocatorias de España y Latinoamérica, cartelera, una biblioteca con más de 5.800 obras y un catálogo de casi 4.000 espacios escénicos.

El 20 % restante son las personas, y he preferido apostar por el crecimiento orgánico de quienes hacen el teatro día a día. Por eso, me gustaría proponerte una colaboración de beneficio mutuo al formar parte de nuestro Elenco Fundador:
• Perfil profesional gratis para siempre (sin tarjetas ni compromisos).
• Distintivo oficial numerado de Elenco Fundador en tu perfil.
• 3 meses Premium de cortesía para activar durante el primer año.
• Enlace exclusivo para invitar a colegas: cuantos más se suman activamente, más tiempo de Premium ganas.

Tu presencia es lo que le aporta la credibilidad inicial al ecosistema para hacerlo crecer para todos.

Si te interesa formar parte de la historia inicial del proyecto, respóndeme a este mensaje y te enviaré tu invitación personal. ¡Un abrazo!

Renee Bausson
Fundador de ObrasDeTeatro®`,
    },
    correo: {
      asunto: 'Invitación personal para [Nombre]: Elenco Fundador de ObrasDeTeatro®',
      cuerpo: `Hola, [Nombre]:

Soy Renee Bausson, fundador de ObrasDeTeatro®. Te escribo personalmente porque me encantaría contar contigo en el proyecto al que he dedicado los últimos cinco años.

obrasdeteatro.com es la plataforma profesional de las artes escénicas en español. Nace de una necesidad que conocemos bien quienes trabajamos en este oficio: el talento está disperso, las oportunidades llegan tarde o no llegan, y no existía un lugar común para los 20 países de habla hispana.

Hoy, la plataforma está materializada en un 80 %, tras más de 3.800 horas de programación e ingeniería de software, y ya reúne:
• Directorio de profesionales, compañías, productoras y salas.
• Castings y convocatorias de España y Latinoamérica.
• Cartelera de espectáculos y una biblioteca con más de 5.800 obras teatrales.
• Catálogo de casi 4.000 espacios escénicos.

El 20 % que falta no es técnico: son las personas. Una plataforma profesional cobra sentido cuando la habitan, desde el primer día, los profesionales del oficio. Por eso, antes de buscar vías de financiación externas, he preferido apostar por lo orgánico y por quienes hacen el teatro: creo que, unidos, podemos darle al sector la herramienta que merece.

No te pido un favor; te propongo una colaboración de beneficio mutuo al formar parte de nuestro Elenco Fundador.

Lo que obtienes como miembro del Elenco:
• Perfil profesional gratuito para siempre y sin compromiso de permanencia.
• Distintivo oficial numerado de Elenco Fundador, visible en tu perfil.
• 3 meses de plan Premium de cortesía para activar cuando prefieras durante el primer año.
• Enlace exclusivo para invitar a tus colegas: cuantos más se suman activamente, más tiempo de Premium ganas.

Lo que sumas al proyecto:
• Tu presencia activa, que es el motor que ayuda a que la plataforma crezca y sea útil para todo el sector escénico.

Si te interesa formar parte de la historia inicial del proyecto, responde a este correo y te haré llegar tu invitación personal con todos los detalles de acceso. Quedo a tu total disposición para cualquier duda, también por teléfono si lo prefieres.

Un abrazo,

Renee Bausson
Fundador de ObrasDeTeatro®
www.obrasdeteatro.com · hola@obrasdeteatro.com · +34 656 407 971`,
    },
  },
}

/** Solo el nombre de pila: la primera palabra. */
export function nombreDePila(nombre: string | null | undefined): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? ''
}

/**
 * Pone el nombre de pila en lugar de «[Nombre]». Sin nombre, «Hola, [Nombre].»
 * y «Hola, [Nombre]:» quedan en «Hola.» y «Hola:», y el asunto en
 * «Invitación personal: …».
 */
function conNombre(texto: string, nombre: string): string {
  if (nombre) return texto.replaceAll('[Nombre]', nombre)
  return texto.replaceAll(', [Nombre]', '').replaceAll(' para [Nombre]', '').replaceAll('[Nombre]', '')
}

/** Asunto (solo correo) y cuerpo, con el nombre ya puesto. */
export function preinvitacion(distintivo: Distintivo, canal: Canal, nombre?: string | null): { asunto: string | null; cuerpo: string } {
  const p = PLANTILLAS[distintivo][canal]
  const n = nombreDePila(nombre)
  return { asunto: p.asunto ? conNombre(p.asunto, n) : null, cuerpo: conNombre(p.cuerpo, n) }
}

/** Enlace wa.me con el texto: al número si lo hay (con prefijo), si no, para elegir contacto. */
export function enlaceWhatsappPreinvitacion(texto: string, telefono?: string | null): string {
  return enlaceWhatsapp(texto, telefono)
}

/** mailto en texto plano: saltos de línea como %0D%0A. */
export function enlaceMailtoPreinvitacion(asunto: string, cuerpo: string, para?: string | null): string {
  const crlf = (t: string) => encodeURIComponent(t.replace(/\r?\n/g, '\r\n'))
  const p = (para ?? '').trim()
  const destino = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(p) ? p : ''
  return `mailto:${destino}?subject=${crlf(asunto)}&body=${crlf(cuerpo)}`
}

/** Lo que copia «Copiar texto»: asunto y cuerpo. */
export function textoParaCopiar(asunto: string, cuerpo: string): string {
  return `Asunto: ${asunto}\n\n${cuerpo}`
}
