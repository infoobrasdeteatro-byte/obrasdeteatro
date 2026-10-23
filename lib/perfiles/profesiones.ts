/**
 * Lista cerrada de profesiones de las artes escénicas. Cada perfil de persona
 * marca todas las que ejerce (profile_specialties.specialty guarda el id) y
 * una como principal. La tabla public.profesiones de la base tiene los mismos
 * ids (migración 20261023120000): si se añade una aquí, hay que añadirla allí.
 */
export type Profesion = { id: string; nombre: string; grupo: string }

export const GRUPOS_PROFESIONES = [
  'Interpretación y creación',
  'Dirección y escritura',
  'Diseño y técnica',
  'Producción y gestión',
  'Formación e investigación',
] as const

export const PROFESIONES: readonly Profesion[] = [
  { id: 'actor', nombre: 'Actor / Actriz', grupo: 'Interpretación y creación' },
  { id: 'bailarin', nombre: 'Bailarín / Bailarina', grupo: 'Interpretación y creación' },
  { id: 'cantante', nombre: 'Cantante / Intérprete lírico', grupo: 'Interpretación y creación' },
  { id: 'circo', nombre: 'Artista de circo', grupo: 'Interpretación y creación' },
  { id: 'titiritero', nombre: 'Titiritero / Titiritera', grupo: 'Interpretación y creación' },
  { id: 'humorista', nombre: 'Humorista / Monologuista', grupo: 'Interpretación y creación' },
  { id: 'narrador', nombre: 'Narrador / Narradora oral', grupo: 'Interpretación y creación' },
  { id: 'direccion-escenica', nombre: 'Dirección escénica', grupo: 'Dirección y escritura' },
  { id: 'dramaturgia', nombre: 'Dramaturgia', grupo: 'Dirección y escritura' },
  { id: 'coreografia', nombre: 'Coreografía', grupo: 'Dirección y escritura' },
  { id: 'direccion-musical', nombre: 'Dirección musical', grupo: 'Dirección y escritura' },
  { id: 'ayudantia-direccion', nombre: 'Ayudantía de dirección', grupo: 'Dirección y escritura' },
  { id: 'escenografia', nombre: 'Escenografía', grupo: 'Diseño y técnica' },
  { id: 'iluminacion', nombre: 'Iluminación', grupo: 'Diseño y técnica' },
  { id: 'vestuario', nombre: 'Vestuario', grupo: 'Diseño y técnica' },
  { id: 'caracterizacion', nombre: 'Caracterización y maquillaje', grupo: 'Diseño y técnica' },
  { id: 'sonido', nombre: 'Sonido', grupo: 'Diseño y técnica' },
  { id: 'regiduria', nombre: 'Regiduría', grupo: 'Diseño y técnica' },
  { id: 'tecnico-escenario', nombre: 'Técnico/a de escenario', grupo: 'Diseño y técnica' },
  { id: 'produccion', nombre: 'Producción', grupo: 'Producción y gestión' },
  { id: 'gestion-cultural', nombre: 'Gestión cultural', grupo: 'Producción y gestión' },
  { id: 'distribucion', nombre: 'Distribución', grupo: 'Producción y gestión' },
  { id: 'programacion', nombre: 'Programación', grupo: 'Producción y gestión' },
  { id: 'comunicacion', nombre: 'Comunicación y prensa', grupo: 'Producción y gestión' },
  { id: 'docencia', nombre: 'Docencia', grupo: 'Formación e investigación' },
  { id: 'investigacion-critica', nombre: 'Investigación y crítica teatral', grupo: 'Formación e investigación' },
]

const POR_ID = new Map(PROFESIONES.map(p => [p.id, p]))

export function nombreProfesion(id: string): string | null {
  return POR_ID.get(id)?.nombre ?? null
}

export function esProfesion(id: unknown): id is string {
  return typeof id === 'string' && POR_ID.has(id)
}

/**
 * Las profesiones de un perfil como texto para tarjetas: la principal primero
 * y como mucho `max`. Ignora ids desconocidos.
 */
export function textoProfesiones(filas: { specialty: string; is_primary: boolean }[], max = 3): string | null {
  const nombres = [...filas]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .map(f => nombreProfesion(f.specialty))
    .filter((n): n is string => !!n)
  if (nombres.length === 0) return null
  const visibles = nombres.slice(0, max)
  return visibles.join(' · ') + (nombres.length > max ? ` · +${nombres.length - max}` : '')
}

/** Tipos de perfil que son personas (llevan profesiones), no organizaciones. */
export const TIPOS_PERSONA = ['profesional', 'actor', 'director', 'dramaturgo'] as const

/** Tipos que se pueden elegir al registrarse. */
export const TIPOS_ORGANIZACION = [
  { value: 'compania', label: 'Compañía de teatro' },
  { value: 'teatro', label: 'Teatro / Sala' },
  { value: 'festival', label: 'Festival' },
  { value: 'escuela', label: 'Escuela de artes escénicas' },
  { value: 'productora', label: 'Productora' },
  { value: 'institucion', label: 'Institución pública' },
] as const

export const TIPOS_REGISTRO = ['profesional', 'publico', ...TIPOS_ORGANIZACION.map(t => t.value)] as const
