/**
 * Formación: vocabulario y reglas de presentación.
 *
 * Los valores son los de los CHECK de public.formaciones (migración
 * 20261013130000). Añadir un tipo o una disciplina es cambiar el CHECK y esta
 * lista a la vez; un valor desconocido se enseña tal cual en vez de desaparecer.
 *
 * Las reglas de negocio (quién publica, «retirado» solo para moderación,
 * slug fijo, cierre de las terminadas) viven en la base. Aquí solo hay
 * etiquetas, formato y la validación que el usuario puede corregir antes de
 * enviar.
 */

import { COUNTRIES } from '@/lib/geo/countries'

export const TIPOS = [
  { value: 'curso', label: 'Curso', plural: 'Cursos' },
  { value: 'taller', label: 'Taller', plural: 'Talleres' },
  { value: 'masterclass', label: 'Masterclass', plural: 'Masterclass' },
  { value: 'seminario', label: 'Seminario', plural: 'Seminarios' },
  { value: 'residencia', label: 'Residencia', plural: 'Residencias' },
  { value: 'diplomatura', label: 'Diplomatura / posgrado', plural: 'Diplomaturas y posgrados' },
] as const

export const DISCIPLINAS = [
  { value: 'interpretacion', label: 'Interpretación' },
  { value: 'direccion', label: 'Dirección escénica' },
  { value: 'dramaturgia', label: 'Dramaturgia y escritura' },
  { value: 'voz', label: 'Voz y palabra' },
  { value: 'cuerpo', label: 'Cuerpo y movimiento' },
  { value: 'teatro_musical', label: 'Teatro musical' },
  { value: 'danza', label: 'Danza' },
  { value: 'improvisacion', label: 'Improvisación' },
  { value: 'clown_titeres', label: 'Clown, títeres y objetos' },
  { value: 'escenografia_tecnica', label: 'Escenografía, luz y técnica' },
  { value: 'produccion_gestion', label: 'Producción y gestión cultural' },
  { value: 'otra', label: 'Otra disciplina' },
] as const

export const NIVELES = [
  { value: 'todos', label: 'Todos los niveles' },
  { value: 'iniciacion', label: 'Iniciación' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
  { value: 'profesional', label: 'Profesional' },
] as const

export const MODALIDADES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'En línea' },
  { value: 'hibrida', label: 'Híbrida' },
] as const

/** Monedas de los 20 países del ámbito, más el dólar para lo internacional. */
export const MONEDAS = [
  'EUR', 'USD', 'ARS', 'MXN', 'COP', 'CLP', 'PEN', 'UYU', 'PYG', 'BOB',
  'VES', 'CRC', 'PAB', 'GTQ', 'HNL', 'NIO', 'DOP', 'CUP',
] as const

/** Estados del CHECK formaciones_estado_check. */
export const ESTADOS = {
  borrador: 'Borrador',
  publicado: 'Publicada',
  finalizado: 'Finalizada',
  cancelado: 'Cancelada',
  retirado: 'Retirada por moderación',
} as const

type Lista = readonly { value: string; label: string }[]
const etiqueta = (lista: Lista, valor: string | null | undefined, vacio = '—') =>
  !valor ? vacio : lista.find(x => x.value === valor)?.label ?? valor

export const etiquetaTipo = (v: string | null | undefined) => etiqueta(TIPOS, v)
export const etiquetaDisciplina = (v: string | null | undefined) => etiqueta(DISCIPLINAS, v)
export const etiquetaNivel = (v: string | null | undefined) => etiqueta(NIVELES, v)
export const etiquetaModalidad = (v: string | null | undefined) => etiqueta(MODALIDADES, v)
export const etiquetaEstado = (v: string) => (ESTADOS as Record<string, string>)[v] ?? v

export const esTipo = (v: string | undefined) => TIPOS.some(t => t.value === v)
export const esDisciplina = (v: string | undefined) => DISCIPLINAS.some(t => t.value === v)
export const esModalidad = (v: string | undefined) => MODALIDADES.some(t => t.value === v)
export const esPais = (v: string | undefined) => COUNTRIES.some(c => c.code === v)

export function nombrePaisFormacion(code: string | null): string | null {
  if (!code) return null
  return COUNTRIES.find(c => c.code === code)?.name ?? code
}

/** «Madrid, España» · «En línea» · «Híbrida · Madrid, España». */
export function lugarFormacion(f: { modalidad: string; ciudad: string | null; pais_code: string | null }): string {
  const sitio = [f.ciudad, nombrePaisFormacion(f.pais_code)].filter(Boolean).join(', ')
  if (f.modalidad === 'online') return sitio ? `En línea · ${sitio}` : 'En línea'
  if (f.modalidad === 'hibrida') return sitio ? `Híbrida · ${sitio}` : 'Híbrida'
  return sitio || 'Presencial'
}

/** Precio legible: «Gratuita», «120 €», «45.000 ARS» o null si no se indica. */
export function precioFormacion(f: { es_gratuita: boolean; precio: number | null; moneda: string | null }): string | null {
  if (f.es_gratuita) return 'Gratuita'
  if (f.precio === null || f.precio === undefined) return null
  const moneda = f.moneda ?? 'EUR'
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: moneda,
      maximumFractionDigits: Number.isInteger(Number(f.precio)) ? 0 : 2,
    }).format(Number(f.precio))
  } catch {
    return `${f.precio} ${moneda}`
  }
}

const FECHA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const fechaCorta = (iso: string) => FECHA.format(new Date(`${iso}T00:00:00Z`))

/** «12 nov 2026», «12 nov 2026 – 30 ene 2027» o null. Las fechas son `date`, sin hora. */
export function fechasFormacion(f: { fecha_inicio: string | null; fecha_fin: string | null }): string | null {
  if (!f.fecha_inicio && !f.fecha_fin) return null
  if (f.fecha_inicio && (!f.fecha_fin || f.fecha_fin === f.fecha_inicio)) return fechaCorta(f.fecha_inicio)
  if (!f.fecha_inicio) return `Hasta el ${fechaCorta(f.fecha_fin!)}`
  return `${fechaCorta(f.fecha_inicio)} – ${fechaCorta(f.fecha_fin!)}`
}

/** Solo http(s) y mailto se pintan como enlace. */
export function enlaceInscripcion(f: { url_inscripcion: string | null; email_inscripcion: string | null }): string | null {
  if (f.url_inscripcion && /^https?:\/\/[^\s]+$/i.test(f.url_inscripcion)) return f.url_inscripcion
  if (f.email_inscripcion && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(f.email_inscripcion)) return `mailto:${f.email_inscripcion}`
  return null
}

// --- Formulario ----------------------------------------------------------------

export type CamposFormacion = {
  titulo: string
  tipo: string
  disciplina: string
  nivel: string
  modalidad: string
  pais_code: string
  ciudad: string
  lugar: string
  fecha_inicio: string
  fecha_fin: string
  horario: string
  duracion: string
  imparte: string
  plazas: string
  es_gratuita: boolean
  precio: string
  moneda: string
  descripcion: string
  requisitos: string
  url_inscripcion: string
  email_inscripcion: string
}

export const CAMPOS_VACIOS: CamposFormacion = {
  titulo: '', tipo: 'curso', disciplina: 'interpretacion', nivel: '', modalidad: 'presencial',
  pais_code: '', ciudad: '', lugar: '', fecha_inicio: '', fecha_fin: '', horario: '', duracion: '',
  imparte: '', plazas: '', es_gratuita: false, precio: '', moneda: 'EUR', descripcion: '',
  requisitos: '', url_inscripcion: '', email_inscripcion: '',
}

/** Lo que el usuario puede corregir antes de enviar. `publicar` añade lo que exige una formación pública. */
export function validarFormacion(c: CamposFormacion, publicar: boolean): string | null {
  const t = c.titulo.trim()
  if (t.length < 3) return 'El título necesita al menos 3 caracteres.'
  if (t.length > 160) return 'El título no puede pasar de 160 caracteres.'
  if (!esTipo(c.tipo)) return 'Elige el tipo de formación.'
  if (!esDisciplina(c.disciplina)) return 'Elige la disciplina.'
  if (!esModalidad(c.modalidad)) return 'Elige la modalidad.'
  if (c.modalidad !== 'online') {
    if (!esPais(c.pais_code)) return 'Indica el país donde se imparte.'
    if (c.ciudad.trim() === '') return 'Indica la ciudad donde se imparte.'
  }
  if (c.fecha_inicio && c.fecha_fin && c.fecha_fin < c.fecha_inicio) return 'La fecha de fin no puede ser anterior a la de inicio.'
  if (c.plazas.trim() !== '') {
    const n = Number(c.plazas)
    if (!Number.isInteger(n) || n < 1) return 'Las plazas deben ser un número entero mayor que cero.'
  }
  if (!c.es_gratuita && c.precio.trim() !== '') {
    const p = Number(c.precio.replace(',', '.'))
    if (!Number.isFinite(p) || p < 0) return 'El precio no es válido.'
  }
  const url = c.url_inscripcion.trim()
  if (url && !/^https?:\/\/[^\s/?#]+[^\s]*$/i.test(url)) return 'El enlace de inscripción debe empezar por https://'
  const email = c.email_inscripcion.trim()
  if (email && !/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(email)) return 'El correo de inscripción no es válido.'
  if (publicar && !url && !email) return 'Para publicar, indica un enlace o un correo de inscripción.'
  return null
}

/** Campos del formulario → columnas de public.formaciones (sin estado ni sistema). */
export function aFilaFormacion(c: CamposFormacion) {
  const v = (s: string) => (s.trim() === '' ? null : s.trim())
  const online = c.modalidad === 'online'
  const precio = !c.es_gratuita && c.precio.trim() !== '' ? Number(c.precio.replace(',', '.')) : null
  return {
    titulo: c.titulo.trim(),
    tipo: c.tipo,
    disciplina: c.disciplina,
    nivel: v(c.nivel),
    modalidad: c.modalidad,
    pais_code: v(c.pais_code),
    ciudad: v(c.ciudad),
    lugar: online ? null : v(c.lugar),
    fecha_inicio: v(c.fecha_inicio),
    fecha_fin: v(c.fecha_fin),
    horario: v(c.horario),
    duracion: v(c.duracion),
    imparte: v(c.imparte),
    plazas: c.plazas.trim() === '' ? null : Number(c.plazas),
    es_gratuita: c.es_gratuita,
    precio,
    moneda: precio === null ? null : (c.moneda || 'EUR'),
    descripcion: v(c.descripcion),
    requisitos: v(c.requisitos),
    url_inscripcion: v(c.url_inscripcion),
    email_inscripcion: v(c.email_inscripcion),
  }
}

/** Una fila de la base → campos del formulario (edición). */
export function camposDesdeFila(f: Partial<Record<keyof CamposFormacion, unknown>>): CamposFormacion {
  const s = (x: unknown) => (x === null || x === undefined ? '' : String(x))
  return {
    ...CAMPOS_VACIOS,
    titulo: s(f.titulo), tipo: s(f.tipo) || 'curso', disciplina: s(f.disciplina) || 'otra',
    nivel: s(f.nivel), modalidad: s(f.modalidad) || 'presencial', pais_code: s(f.pais_code),
    ciudad: s(f.ciudad), lugar: s(f.lugar), fecha_inicio: s(f.fecha_inicio), fecha_fin: s(f.fecha_fin),
    horario: s(f.horario), duracion: s(f.duracion), imparte: s(f.imparte), plazas: s(f.plazas),
    es_gratuita: Boolean(f.es_gratuita), precio: s(f.precio), moneda: s(f.moneda) || 'EUR',
    descripcion: s(f.descripcion), requisitos: s(f.requisitos),
    url_inscripcion: s(f.url_inscripcion), email_inscripcion: s(f.email_inscripcion),
  }
}

/** Mensajes de la base: los del trigger ya vienen redactados y se dejan pasar. */
export function mensajeErrorFormacion(m?: string): string {
  if (!m) return 'No se pudo guardar. Inténtalo de nuevo.'
  if (m.includes('Para publicar formaciones') || m.includes('retirado el equipo') || m.includes('Solo el equipo de moderación')) return m
  if (m.includes('row-level security')) {
    return 'Tu perfil no puede publicar formaciones. Pueden hacerlo escuelas, compañías, teatros, festivales, productoras e instituciones, y los profesionales con plan Premium o superior.'
  }
  if (m.includes('lugar_si_presencial')) return 'Las formaciones presenciales o híbridas necesitan país y ciudad.'
  if (m.includes('inscripcion_si_publicada')) return 'Para publicar, indica un enlace o un correo de inscripción.'
  return `No se pudo guardar: ${m}`
}

/** Columnas que leen las páginas públicas (nunca `select *`). */
export const COLUMNAS_PUBLICAS =
  'id, slug, titulo, tipo, disciplina, nivel, modalidad, pais_code, ciudad, lugar, fecha_inicio, fecha_fin, horario, duracion, imparte, plazas, es_gratuita, precio, moneda, descripcion, requisitos, url_inscripcion, email_inscripcion, fecha_publicacion, profile_id'

export const rutaFormacion = (slug: string) => `/formacion/${slug}`
