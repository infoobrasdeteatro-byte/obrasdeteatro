export type PlanId = 'gratuito' | 'destacado' | 'empresas'

export interface Plan {
  id: PlanId
  nombre: string
  precio: number
  descripcion: string
  caracteristicas: string[]
  recomendado: boolean
}

export const PLANES: Plan[] = [
  {
    id: 'gratuito',
    nombre: 'Gratuito',
    precio: 0,
    descripcion: 'Para empezar en la comunidad teatral',
    caracteristicas: [
      'Perfil profesional en el directorio',
      'Hasta 3 obras publicadas',
      'Visible para compañías y teatros',
    ],
    recomendado: false,
  },
  {
    id: 'destacado',
    nombre: 'Destacado',
    precio: 6.99,
    descripcion: 'Para profesionales activos',
    caracteristicas: [
      'Todo lo del plan Gratuito',
      'Obras ilimitadas publicadas',
      'Perfil destacado en el directorio',
      'Estadísticas de visitas',
      'Mayor visibilidad en búsquedas',
    ],
    recomendado: true,
  },
  {
    id: 'empresas',
    nombre: 'Empresas',
    precio: 14.99,
    descripcion: 'Para compañías y organizaciones',
    caracteristicas: [
      'Todo lo del plan Destacado',
      'Gestión de múltiples perfiles',
      'Soporte prioritario',
      'Facturación personalizada',
    ],
    recomendado: false,
  },
]
