/**
 * Vocabulario compartido de Castings: las etiquetas legibles de los valores
 * que la base guarda en crudo.
 *
 * Vive aquí y no en cada pantalla porque el formulario y la ficha pública
 * tienen que decir lo mismo. Las CATEGORÍAS no están aquí a propósito: esas
 * viven en public.casting_categorias, para poder ampliarlas sin desplegar.
 */

export const TIPOS_ENTIDAD = [
  { value: 'compania',    label: 'Compañía de teatro' },
  { value: 'productora',  label: 'Productora' },
  { value: 'teatro',      label: 'Teatro / Sala' },
  { value: 'festival',    label: 'Festival' },
  { value: 'escuela',     label: 'Escuela de artes escénicas' },
  { value: 'institucion', label: 'Institución pública' },
  { value: 'asociacion',  label: 'Asociación cultural' },
  { value: 'particular',  label: 'Particular' },
  { value: 'otro',        label: 'Otro' },
]

export const TIPOS_REMUNERACION = [
  { value: 'remunerado',                     label: 'Remunerado' },
  { value: 'no_remunerado_gastos_cubiertos', label: 'No remunerado — gastos cubiertos (dietas, transporte, material)' },
  { value: 'cooperativa',                    label: 'Cooperativa o a beneficios' },
  { value: 'no_remunerado_academico',        label: 'No remunerado — proyecto académico o de formación' },
]

/** Versión corta, para insignias donde la etiqueta larga no cabe. */
export const REMUNERACION_CORTA: Record<string, string> = {
  remunerado: 'Remunerado',
  no_remunerado_gastos_cubiertos: 'Gastos cubiertos',
  cooperativa: 'Cooperativa',
  no_remunerado_academico: 'Académico',
}

export const GENEROS_ESCENICOS = ['Masculino', 'Femenino', 'Indistinto', 'No binario']

export const MODALIDADES = ['Presencial', 'Online', 'Mixta']

// Mismo vocabulario que el formulario de Obras, para no abrir un segundo
// diccionario de idiomas en el proyecto.
export const IDIOMAS = [
  { value: 'es', label: 'Español' },
  { value: 'ca', label: 'Catalán' },
  { value: 'eu', label: 'Euskera' },
  { value: 'gl', label: 'Gallego' },
  { value: 'va', label: 'Valenciano' },
  { value: 'en', label: 'Inglés' },
  { value: 'fr', label: 'Francés' },
  { value: 'pt', label: 'Portugués' },
  { value: 'de', label: 'Alemán' },
  { value: 'it', label: 'Italiano' },
  { value: 'otro', label: 'Otro' },
]

/** Traduce un valor guardado a su etiqueta; si no lo conoce, lo devuelve tal cual. */
function etiquetaDe(lista: { value: string; label: string }[], valor: string | null): string | null {
  if (!valor) return null
  return lista.find(x => x.value === valor)?.label ?? valor
}

export const etiquetaRemuneracion = (v: string | null) => etiquetaDe(TIPOS_REMUNERACION, v)
export const etiquetaEntidad = (v: string | null) => etiquetaDe(TIPOS_ENTIDAD, v)
export const etiquetaIdioma = (v: string) => etiquetaDe(IDIOMAS, v) ?? v
