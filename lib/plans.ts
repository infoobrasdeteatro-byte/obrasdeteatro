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
      'Perfil básico en el directorio',
      'Hasta 3 obras publicadas',
      'Acceso a convocatorias abiertas',
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
      'Analytics de visitas al perfil',
      'Badge premium visible',
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
      'Convocatorias ilimitadas',
      'Perfil verificado',
      'Gestión empresarial',
      'Soporte prioritario',
    ],
    recomendado: false,
  },
]
