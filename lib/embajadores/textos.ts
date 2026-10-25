/**
 * Embajadores de Escena: textos de la invitación (WhatsApp y página), por
 * oficio y género. Sin precio y sin mencionar a otros invitados: cada
 * invitación es personal.
 */
export const SITIO = 'https://www.obrasdeteatro.com'

/** Plazas de la promoción fundadora: límite interno, solo se ve en el panel de administración. */
export const PLAZAS_FUNDADORAS = 50

export type Oficio = 'interpretacion' | 'dramaturgia' | 'direccion' | 'otros'
export type Genero = 'f' | 'm'

export const OFICIOS: { id: Oficio; etiqueta: string }[] = [
  { id: 'interpretacion', etiqueta: 'Actor / Actriz' },
  { id: 'dramaturgia', etiqueta: 'Dramaturgia' },
  { id: 'direccion', etiqueta: 'Dirección' },
  { id: 'otros', etiqueta: 'Otros oficios (escenografía, iluminación, producción…)' },
]

export function esOficio(v: unknown): v is Oficio {
  return v === 'interpretacion' || v === 'dramaturgia' || v === 'direccion' || v === 'otros'
}

/** «Embajadora de Escena» / «Embajador de Escena». */
export function tituloEmbajador(genero: Genero | string | null | undefined): string {
  return genero === 'f' ? 'Embajadora de Escena' : 'Embajador de Escena'
}

/** El oficio con su género, para «Lo que ObrasDeTeatro® puede hacer por ti como…». */
export function oficioPersona(oficio: Oficio, genero: Genero): string {
  switch (oficio) {
    case 'interpretacion': return genero === 'f' ? 'actriz' : 'actor'
    case 'dramaturgia': return genero === 'f' ? 'dramaturga' : 'dramaturgo'
    case 'direccion': return genero === 'f' ? 'directora' : 'director'
    case 'otros': return 'profesional de la escena'
  }
}

/** Frase de cada oficio en el mensaje para quien no conoce el proyecto. */
export const FRASE_OFICIO: Record<Oficio, string> = {
  interpretacion: 'Es el punto de encuentro donde compañías, productoras y directores de casting buscan intérpretes: tu trayectoria, tus fotos y tus vídeos a la vista de quien contrata, y los castings abiertos de toda la comunidad en un solo lugar.',
  dramaturgia: 'Es el lugar donde compañías, salas y festivales buscan textos para llevar a escena: tus obras publicadas con su ficha completa, para que te contacten para estrenarlas, adaptarlas o programarlas.',
  direccion: 'Es el lugar donde productoras, salas y festivales buscan dirección escénica: tu trayectoria y tus montajes a la vista, y las convocatorias, residencias y festivales de todo el ámbito hispano en un solo lugar.',
  otros: 'Es el lugar donde compañías y productoras buscan equipo artístico y técnico: tu trabajo a la vista de quien contrata y las convocatorias del sector en un solo lugar.',
}

/** Lo que la plataforma puede hacer por cada oficio (página de invitación). */
export const VENTAJAS_OFICIO: Record<Oficio, string[]> = {
  interpretacion: [
    'Tu ficha profesional destacada en el Directorio: trayectoria, fotos y vídeos a la vista de compañías, productoras y directores de casting.',
    'Los castings abiertos de los 20 países de habla hispana, con alertas para que no se te escape ninguno.',
    'Tus espectáculos en la Cartelera, con fechas y enlace a las entradas.',
    'Contacto directo con colegas y profesionales a través de tu red.',
  ],
  dramaturgia: [
    'Tus obras publicadas en la Biblioteca con ficha completa: sinopsis, número de intérpretes, duración y situación de derechos.',
    'Que compañías, salas y festivales te encuentren y te contacten para estrenar, adaptar o programar tus textos.',
    'Convocatorias, premios y residencias de escritura de todo el ámbito hispano.',
    'Tu ficha profesional destacada en el Directorio.',
  ],
  direccion: [
    'Tu ficha profesional destacada en el Directorio: trayectoria y montajes a la vista de productoras, salas y festivales.',
    'Convocatorias, residencias y festivales de los 20 países de habla hispana.',
    'Tus espectáculos en la Cartelera y castings para formar tus elencos.',
    'Acceso a la Biblioteca de obras para encontrar tu próximo texto.',
  ],
  otros: [
    'Tu ficha profesional destacada en el Directorio, a la vista de compañías y productoras.',
    'Las convocatorias del sector de los 20 países de habla hispana.',
    'Tus trabajos en la Cartelera y en tu portfolio.',
    'Contacto directo con colegas y profesionales a través de tu red.',
  ],
}

export const CORTESIA = 'Un año de membresía Destacado por cortesía nuestra, sin tarjeta y sin compromiso.'

export function enlaceInvitacion(token: string): string {
  return `${SITIO}/invitacion/${token}`
}

export function enlaceReferido(codigo: string): string {
  return `${SITIO}/r/${codigo}`
}

/** Mensaje de WhatsApp. 'conoce': ya conoce el proyecto; 'nuevo': no lo conoce. */
export function mensajeWhatsapp(opts: { nombre: string; genero: Genero; oficio: Oficio; token: string; version: 'conoce' | 'nuevo' }): string {
  const nombre = opts.nombre.trim().split(/\s+/)[0] || opts.nombre.trim()
  const titulo = tituloEmbajador(opts.genero)
  const enlace = enlaceInvitacion(opts.token)
  if (opts.version === 'conoce') {
    return [
      `Hola, ${nombre}. Soy Renee Bausson, fundador de ObrasDeTeatro®.`,
      `Por tu trayectoria, me gustaría invitarte a formar parte de ObrasDeTeatro® como *${titulo}*: un año de membresía Destacado por cortesía nuestra, sin tarjeta y sin compromiso.`,
      `Puedes aceptar la invitación aquí: ${enlace}`,
      'Un abrazo.',
    ].join('\n\n')
  }
  return [
    `Hola, ${nombre}. Soy Renee Bausson, fundador de *ObrasDeTeatro®*, la plataforma profesional del teatro en español en los 20 países de habla hispana.`,
    FRASE_OFICIO[opts.oficio],
    `Por tu trayectoria, me gustaría invitarte a formar parte de ObrasDeTeatro® como *${titulo}*: un año de membresía Destacado por cortesía nuestra, sin tarjeta y sin compromiso.`,
    `Aquí tienes los detalles y puedes aceptar la invitación: ${enlace}`,
    'Un abrazo.',
  ].join('\n\n')
}

/** Enlace de WhatsApp con el mensaje: al número si lo hay (con prefijo), si no, para elegir contacto. */
export function enlaceWhatsapp(mensaje: string, telefono?: string | null): string {
  const t = (telefono ?? '').trim()
  let digitos = ''
  if (t.startsWith('+')) digitos = t.replace(/\D/g, '')
  else if (t.startsWith('00')) digitos = t.replace(/\D/g, '').slice(2)
  const base = digitos.length >= 8 ? `https://wa.me/${digitos}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(mensaje)}`
}

/** Cookie del código de referido entre el enlace y la confirmación del correo. */
export const COOKIE_REFERIDO = 'odt_ref'
export const REFERIDO_MAX_AGE_S = 60 * 60 * 24 * 30

export function codigoValido(v: string | null | undefined): string | null {
  const c = (v ?? '').trim().toUpperCase()
  return /^[0-9A-Z]{8}$/.test(c) ? c : null
}
