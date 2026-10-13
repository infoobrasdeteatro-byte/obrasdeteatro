import { CATEGORIAS_IMPORTABLES } from '@/lib/convocatorias/importacion'
import { PAISES_NOTICIAS } from '@/lib/noticias/importacion'

/**
 * Lo que el formulario de alertas del Centro Profesional puede enviar. Sin
 * dependencias de servidor: lo usan el componente de cliente y la server action.
 */

export const FRECUENCIAS = ['diaria', 'semanal'] as const
export type Frecuencia = (typeof FRECUENCIAS)[number]

/** Géneros escénicos que se pueden elegir en la alerta («Indistinto» no: esos castings entran siempre). */
export const GENEROS_ALERTA = ['Masculino', 'Femenino', 'No binario'] as const

export type CamposAlerta = {
  activa: boolean
  paises: string[]
  categorias: string[]
  frecuencia: string
  castings_activa: boolean
  castings_paises: string[]
  castings_disciplinas: string[]
  castings_edad: number | null
  castings_genero: string | null
  castings_solo_remunerados: boolean
}

const ID_DISCIPLINA = /^[a-z0-9_]{1,40}$/

/** Validación de lo que envía el formulario. Null si todo está bien. Repite las CHECK de la tabla. */
export function validarAlerta(c: CamposAlerta): string | null {
  if (!c.paises.every(p => PAISES_NOTICIAS.has(p))) return 'Hay un país que no es del ámbito.'
  if (!c.categorias.every(x => CATEGORIAS_IMPORTABLES.has(x))) return 'Hay una categoría desconocida.'
  if (!(FRECUENCIAS as readonly string[]).includes(c.frecuencia)) return 'Elige la frecuencia.'
  if (!c.castings_paises.every(p => PAISES_NOTICIAS.has(p))) return 'Hay un país de castings que no es del ámbito.'
  if (c.castings_disciplinas.length > 30 || !c.castings_disciplinas.every(d => ID_DISCIPLINA.test(d))) return 'Hay una disciplina desconocida.'
  if (c.castings_edad !== null && (!Number.isInteger(c.castings_edad) || c.castings_edad < 1 || c.castings_edad > 120)) return 'La edad debe ser un número entre 1 y 120.'
  if (c.castings_genero !== null && !(GENEROS_ALERTA as readonly string[]).includes(c.castings_genero)) return 'Elige un género escénico de la lista.'
  return null
}

/** Lee el FormData del formulario (casillas repetidas). Sin duplicados. */
export function camposDeFormData(fd: FormData): CamposAlerta {
  const unicos = (k: string) => [...new Set(fd.getAll(k).map(String))]
  const edad = String(fd.get('castings_edad') ?? '').trim()
  const genero = String(fd.get('castings_genero') ?? '').trim()
  return {
    activa: fd.get('activa') === 'on',
    paises: unicos('paises'),
    categorias: unicos('categorias'),
    frecuencia: String(fd.get('frecuencia') ?? ''),
    castings_activa: fd.get('castings_activa') === 'on',
    castings_paises: unicos('castings_paises'),
    castings_disciplinas: unicos('castings_disciplinas'),
    castings_edad: edad === '' ? null : Number(edad),
    castings_genero: genero === '' ? null : genero,
    castings_solo_remunerados: fd.get('castings_solo_remunerados') === 'on',
  }
}
