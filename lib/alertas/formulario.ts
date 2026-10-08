import { CATEGORIAS_IMPORTABLES } from '@/lib/convocatorias/importacion'
import { PAISES_NOTICIAS } from '@/lib/noticias/importacion'

/**
 * Lo que el formulario de alertas del Centro Profesional puede enviar. Sin
 * dependencias de servidor: lo usan el componente de cliente y la server action.
 */

export const FRECUENCIAS = ['diaria', 'semanal'] as const
export type Frecuencia = (typeof FRECUENCIAS)[number]

export type CamposAlerta = { activa: boolean; paises: string[]; categorias: string[]; frecuencia: string }

/** Validación de lo que envía el formulario. Null si todo está bien. Repite las CHECK de la tabla. */
export function validarAlerta(c: CamposAlerta): string | null {
  if (!c.paises.every(p => PAISES_NOTICIAS.has(p))) return 'Hay un país que no es del ámbito.'
  if (!c.categorias.every(x => CATEGORIAS_IMPORTABLES.has(x))) return 'Hay una categoría desconocida.'
  if (!(FRECUENCIAS as readonly string[]).includes(c.frecuencia)) return 'Elige la frecuencia.'
  return null
}

/** Lee el FormData del formulario (casillas repetidas «paises» y «categorias»). Sin duplicados. */
export function camposDeFormData(fd: FormData): CamposAlerta {
  const unicos = (k: string) => [...new Set(fd.getAll(k).map(String))]
  return {
    activa: fd.get('activa') === 'on',
    paises: unicos('paises'),
    categorias: unicos('categorias'),
    frecuencia: String(fd.get('frecuencia') ?? ''),
  }
}
