export type PlanId = 'gratuito' | 'premium' | 'destacado' | 'empresas'

export interface FeatureGroup {
  titulo: string
  items: string[]
  proximamente?: boolean
}

export interface Plan {
  id: PlanId
  nombre: string
  precio: number
  tagline: string
  bloques: FeatureGroup[]
  descripcion?: string
  caracteristicas?: string[]
  recomendado: boolean
}

export const PLANES: Plan[] = [
  {
    id: 'gratuito',
    nombre: 'Gratuito',
    precio: 0,
    tagline: 'Tu punto de partida en el teatro en español.',
    bloques: [
      {
        titulo: 'Perfil Profesional',
        items: [
          'Perfil básico en el directorio',
          'Foto de perfil y descripción biográfica',
          'Enlace a tu web personal',
        ],
      },
      {
        titulo: 'Biblioteca Digital',
        items: [
          'Hasta 3 obras publicadas',
          'Acceso completo a la Biblioteca Digital',
          'Descarga de guiones en dominio público',
        ],
      },
      {
        titulo: 'Comunidad',
        items: [
          'Visible para compañías, teatros y festivales',
          'Acceso a convocatorias públicas abiertas',
          'Directorio completo de profesionales',
        ],
      },
    ],
    recomendado: false,
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: 2.99,
    tagline: 'Tu perfil profesional completo y sin límites.',
    bloques: [
      {
        titulo: 'Perfil Profesional',
        items: [
          'Perfil completo con todos los campos',
          'Galería de fotos y vídeos',
          'Portfolio de proyectos y espectáculos',
          'Redes sociales y datos de contacto',
          'Premios, reconocimientos y formación',
          'Disponibilidad profesional activa',
        ],
      },
      {
        titulo: 'Visibilidad',
        items: [
          'Obras ilimitadas publicadas',
          'Mayor posicionamiento en búsquedas',
          'Perfil optimizado para SEO',
        ],
      },
      {
        titulo: 'Biblioteca Digital',
        items: [
          'Descarga ilimitada de guiones',
          'Listas de lectura y obras favoritas',
        ],
      },
      {
        titulo: 'Scena IA',
        items: [
          'Asistente de teatro con inteligencia artificial',
          'Análisis de guiones con IA',
          'Generación de dossiers profesionales',
        ],
        proximamente: true,
      },
      {
        titulo: 'Herramientas',
        items: [
          'Acceso a todas las convocatorias',
          'Alertas de convocatorias personalizadas',
          'Recursos creativos exclusivos',
        ],
      },
    ],
    recomendado: false,
  },
  {
    id: 'destacado',
    nombre: 'Destacado',
    precio: 6.99,
    tagline: 'La máxima presencia profesional en ObrasDeTeatro®.',
    bloques: [
      {
        titulo: 'Perfil Destacado',
        items: [
          'Todo lo del plan Premium',
          'Perfil destacado en el directorio',
          'Insignia profesional verificada',
          'Etiqueta «Destacado» visible en resultados',
        ],
      },
      {
        titulo: 'Visibilidad y Promoción',
        items: [
          'Prioridad máxima en búsquedas',
          'Incluido en selecciones editoriales',
          'Difusión en redes de ObrasDeTeatro®',
          'Recomendado a compañías y teatros activos',
        ],
      },
      {
        titulo: 'Analítica Profesional',
        items: [
          'Dashboard de visitas al perfil',
          'Estadísticas de obras vistas',
          'Quién visita tu perfil',
          'Informe mensual de rendimiento',
        ],
      },
      {
        titulo: 'Scena IA',
        items: [
          'Acceso completo a Scena IA',
          'Análisis avanzado de guiones',
          'Sugerencias de casting con IA',
          'Reportes de tendencias del sector',
        ],
        proximamente: true,
      },
      {
        titulo: 'Herramientas',
        items: [
          'Acceso prioritario a convocatorias',
          'Participación en proyectos editoriales',
          'Recursos exclusivos para destacados',
        ],
      },
    ],
    recomendado: true,
  },
  {
    id: 'empresas',
    nombre: 'Empresas',
    precio: 14.99,
    tagline: 'La solución integral para organizaciones teatrales.',
    bloques: [
      {
        titulo: 'Perfil Institucional',
        items: [
          'Perfil para compañía, teatro, festival o institución',
          'Sello de verificación institucional',
          'Página de organización con identidad propia',
          'Gestión de equipo y colaboradores',
        ],
      },
      {
        titulo: 'Visibilidad Institucional',
        items: [
          'Prioridad máxima en el directorio',
          'Presencia editorial en ObrasDeTeatro®',
          'Aparición en selecciones especiales',
          'Difusión de convocatorias a toda la comunidad',
        ],
      },
      {
        titulo: 'Convocatorias y Gestión',
        items: [
          'Convocatorias ilimitadas publicadas',
          'Gestión de candidaturas recibidas',
          'Búsqueda avanzada de profesionales',
          'Filtros por especialidad, disponibilidad y zona',
        ],
      },
      {
        titulo: 'Scena IA para Organizaciones',
        items: [
          'Búsqueda inteligente de profesionales',
          'Análisis de repertorio y tendencias del sector',
          'Generación de programas y dossiers',
          'IA aplicada a la gestión de elencos',
        ],
        proximamente: true,
      },
      {
        titulo: 'Biblioteca y Contenidos',
        items: [
          'Colecciones y listas editoriales propias',
          'Acceso prioritario a nuevas incorporaciones',
          'Descarga masiva de guiones',
        ],
      },
      {
        titulo: 'Soporte Dedicado',
        items: [
          'Soporte prioritario con gestor asignado',
          'Incorporación guiada a la plataforma',
          'Acceso anticipado a nuevas funcionalidades',
          'Panel de administración multi-usuario',
        ],
      },
    ],
    recomendado: false,
  },
]

// ─── Tabla comparativa ────────────────────────────────────────────────────

export type CellValue = boolean | string

export interface CompareRow {
  label: string
  values: [CellValue, CellValue, CellValue, CellValue]
}

export interface CompareSection {
  titulo: string
  filas: CompareRow[]
  proximamente?: boolean
}

export const TABLA_COMPARATIVA: CompareSection[] = [
  {
    titulo: 'Perfil',
    filas: [
      { label: 'Perfil básico en el directorio',      values: [true,       true,         true,         true] },
      { label: 'Galería, portfolio y redes sociales',  values: [false,      true,         true,         true] },
      { label: 'Premios, formación y currículum',      values: [false,      true,         true,         true] },
      { label: 'Disponibilidad profesional activa',    values: [false,      true,         true,         true] },
      { label: 'Perfil destacado en el directorio',    values: [false,      false,        true,         true] },
      { label: 'Insignia profesional verificada',      values: [false,      false,        true,         true] },
      { label: 'Perfil institucional',                 values: [false,      false,        false,        true] },
      { label: 'Gestión de equipo y colaboradores',    values: [false,      false,        false,        true] },
    ],
  },
  {
    titulo: 'Visibilidad',
    filas: [
      { label: 'Visible en el directorio',             values: [true,       true,         true,         true] },
      { label: 'Perfil optimizado para SEO',           values: [false,      true,         true,         true] },
      { label: 'Prioridad en búsquedas',               values: [false,      false,        true,         true] },
      { label: 'Selecciones editoriales',              values: [false,      false,        true,         true] },
      { label: 'Difusión en redes de ObrasDeTeatro®',  values: [false,      false,        true,         true] },
    ],
  },
  {
    titulo: 'Biblioteca',
    filas: [
      { label: 'Acceso a la Biblioteca Digital',       values: [true,       true,         true,         true] },
      { label: 'Obras publicadas',                     values: ['Hasta 3',  'Ilimitadas', 'Ilimitadas', 'Ilimitadas'] },
      { label: 'Descarga de guiones',                  values: [true,       true,         true,         true] },
      { label: 'Listas de lectura propias',            values: [false,      true,         true,         true] },
      { label: 'Acceso prioritario a novedades',       values: [false,      false,        false,        true] },
    ],
  },
  {
    titulo: 'Scena IA',
    proximamente: true,
    filas: [
      { label: 'Asistente IA para teatro',             values: [false,      true,         true,         true] },
      { label: 'Análisis avanzado de guiones',         values: [false,      false,        true,         true] },
      { label: 'Sugerencias de casting con IA',        values: [false,      false,        true,         true] },
      { label: 'IA para organizaciones',               values: [false,      false,        false,        true] },
    ],
  },
  {
    titulo: 'Convocatorias',
    filas: [
      { label: 'Convocatorias públicas abiertas',      values: [true,       true,         true,         true] },
      { label: 'Acceso a todas las convocatorias',     values: [false,      true,         true,         true] },
      { label: 'Alertas personalizadas',               values: [false,      true,         true,         true] },
      { label: 'Publicar convocatorias propias',       values: [false,      false,        false,        'Ilimitadas'] },
      { label: 'Gestión de candidaturas recibidas',    values: [false,      false,        false,        true] },
    ],
  },
  {
    titulo: 'Analítica',
    filas: [
      { label: 'Estadísticas de visitas al perfil',    values: [false,      false,        true,         true] },
      { label: 'Dashboard de rendimiento',             values: [false,      false,        true,         true] },
      { label: 'Informe mensual',                      values: [false,      false,        true,         true] },
    ],
  },
  {
    titulo: 'Soporte',
    filas: [
      { label: 'Soporte por email',                    values: [true,       true,         true,         true] },
      { label: 'Soporte prioritario',                  values: [false,      false,        false,        true] },
      { label: 'Gestor de cuenta asignado',            values: [false,      false,        false,        true] },
      { label: 'Acceso anticipado a funcionalidades',  values: [false,      false,        false,        true] },
    ],
  },
]
