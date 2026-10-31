/**
 * Las secciones de /admin, agrupadas como en el Master Control. Cada una
 * dice si es solo de administración y qué cola de pendientes la acompaña.
 * Añadir una sección nueva es añadir una fila aquí.
 */

export type ClaveCola =
  | 'noticias' | 'castings' | 'reportes' | 'convocatorias' | 'cartelera'
  | 'verificaciones' | 'reclamaciones' | 'sugerencias' | 'avisos' | 'recordatorios' | 'correo'
  | 'tareas' | 'tareas_vencidas' | 'tareas_urgentes'

export type Seccion = {
  href: string
  titulo: string
  descripcion: string
  soloAdmin?: boolean
  /** Colas cuyos pendientes suma su contador. */
  colas?: ClaveCola[]
}

export type GrupoSecciones = { titulo: string; secciones: Seccion[] }

export const GRUPOS_SECCIONES: GrupoSecciones[] = [
  {
    titulo: 'Moderación',
    secciones: [
      { href: '/admin/noticias', titulo: 'Noticias', descripcion: 'Candidatas, alta manual y fuentes', colas: ['noticias'] },
      { href: '/admin/castings', titulo: 'Castings', descripcion: 'Castings en revisión', colas: ['castings'] },
      { href: '/admin/reportes-castings', titulo: 'Reportes de castings', descripcion: 'Denuncias de usuarios', colas: ['reportes'] },
      { href: '/admin/convocatorias', titulo: 'Convocatorias', descripcion: 'Convocatorias en revisión', colas: ['convocatorias'] },
      { href: '/admin/cartelera', titulo: 'Cartelera', descripcion: 'Espectáculos en revisión y publicados', colas: ['cartelera'] },
      { href: '/admin/galeria', titulo: 'Galería', descripcion: 'Fotos, vídeos y proyectos de los perfiles' },
    ],
  },
  {
    titulo: 'Catálogos',
    secciones: [
      { href: '/admin/espacios', titulo: 'Espacios escénicos', descripcion: 'Catálogo, reclamaciones y sugerencias', colas: ['reclamaciones', 'sugerencias'] },
      { href: '/admin/formaciones', titulo: 'Formación', descripcion: 'Cursos y talleres' },
      { href: '/admin/mediateca', titulo: 'Mediateca', descripcion: 'Programas y episodios' },
      { href: '/admin/colaboradores', titulo: 'Colaboradores', descripcion: 'Medios y entidades colaboradoras' },
    ],
  },
  {
    titulo: 'Comunidad',
    secciones: [
      { href: '/admin/embajadores', titulo: 'Embajadores', descripcion: 'Invitaciones y referidos', soloAdmin: true },
      { href: '/admin/elenco', titulo: 'Elenco Fundador', descripcion: 'Invitaciones 001–100, referidos y escalera', soloAdmin: true },
      { href: '/admin/verificaciones', titulo: 'Verificaciones', descripcion: 'Sello «✓ Verificado»', colas: ['verificaciones'] },
      { href: '/admin/avisos-perfil', titulo: 'Avisos de perfil', descripcion: 'Correo «completa tu perfil»', soloAdmin: true, colas: ['avisos'] },
      { href: '/admin/recordatorio-confirmacion', titulo: 'Recordatorio de confirmación', descripcion: 'Cuentas sin confirmar el correo', soloAdmin: true, colas: ['recordatorios'] },
    ],
  },
  {
    titulo: 'Equipo',
    secciones: [
      { href: '/admin/tareas', titulo: 'Tareas', descripcion: 'Lo que hay que hacer y quién lo hace', colas: ['tareas'] },
    ],
  },
  {
    titulo: 'Comunicación',
    secciones: [
      { href: '/admin/boletin', titulo: 'Boletín', descripcion: 'Proscenio, el boletín semanal' },
      { href: '/admin/correo', titulo: 'Correo entrante', descripcion: 'Copias de hola@ y del Gmail', soloAdmin: true, colas: ['correo'] },
    ],
  },
]

/** Grupos con lo que puede ver la cuenta (sin grupos vacíos). */
export function seccionesVisibles(esAdmin: boolean): GrupoSecciones[] {
  return GRUPOS_SECCIONES
    .map(g => ({ ...g, secciones: g.secciones.filter(s => esAdmin || !s.soloAdmin) }))
    .filter(g => g.secciones.length > 0)
}
