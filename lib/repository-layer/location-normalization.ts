const DIACRITICS = /\p{Diacritic}/gu

/**
 * Forma canonica de un valor de ubicacion, para COMPARAR -- nunca para
 * almacenar. Los datos reales conservan su forma original: "tenerife " y
 * "CAPITAL FEDERAL" siguen exactamente como los escribio cada persona.
 *
 * La normalizacion es puramente mecanica: minusculas, sin diacriticos, sin
 * espacios sobrantes, espacios colapsados. No conoce ninguna ciudad, ningun
 * pais y ninguna equivalencia geografica. "Cuenca" no se convierte en
 * criterio por ser una ciudad real: solo el catalogo decide que existe.
 */
export function normalizeLocationValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/\s+/g, ' ')
}

/**
 * Valores REALES del catalogo cuya forma canonica coincide con la pedida.
 *
 * Resuelve el caso observado en datos reales: "tenerife " y "tenerife" son
 * la misma ciudad almacenada de dos formas. Filtrar por una sola perderia
 * la otra; filtrar por coincidencia parcial (`%tenerife%`) arriesgaria
 * falsos positivos. Devolver las variantes exactas permite un `in(...)`
 * preciso, sin aproximaciones.
 */
export function resolveLocationVariants(canonical: string, rawValues: readonly string[]): string[] {
  const objetivo = normalizeLocationValue(canonical)

  return [...new Set(rawValues.filter((value) => normalizeLocationValue(value) === objetivo))]
}
