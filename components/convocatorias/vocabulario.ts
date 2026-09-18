/**
 * Vocabulario de Convocatorias.
 *
 * Las cuatro categorías son las del CHECK `calls_category_check`
 * (migración 20260916132140). A diferencia de Castings, que las guarda en
 * public.casting_categorias para poder ampliarlas sin desplegar, aquí el
 * vocabulario está CERRADO EN LA BASE: añadir una quinta es modificar el
 * CHECK, no un INSERT. Este fichero solo pone la etiqueta legible; si algún
 * día el vocabulario tiene que crecer sin despliegue, el cambio es mover
 * estas cuatro filas a una tabla, igual que se hizo en Castings.
 *
 * La columna admite NULL a propósito, y su comentario en la base lo dice:
 * «NULL = sin categorizar todavia». Por eso el formulario no la exige.
 */

export const CATEGORIAS = [
  { value: 'festival',   label: 'Festival' },
  { value: 'premio',     label: 'Premio o certamen' },
  { value: 'residencia', label: 'Residencia artística' },
  { value: 'beca',       label: 'Beca o ayuda' },
] as const

export type CategoriaConvocatoria = (typeof CATEGORIAS)[number]['value']

/**
 * Traduce el valor guardado a su etiqueta. Un valor desconocido se devuelve
 * tal cual en vez de desaparecer: si alguien amplía el CHECK y olvida esta
 * lista, se ve en pantalla en lugar de quedar en blanco.
 */
export function etiquetaCategoria(valor: string | null): string {
  if (!valor) return 'Sin categorizar'
  return CATEGORIAS.find(c => c.value === valor)?.label ?? valor
}

/**
 * Los seis estados del CHECK `calls_estado_check`. Coinciden uno a uno con los
 * de castings, y por eso EstadoPill se comparte en vez de duplicarse.
 */
export const ESTADOS_EDITABLES_POR_AUTOR = ['borrador', 'rechazado', 'cerrado', 'cancelado'] as const
