const COMBINING_DIACRITICS = /\p{Diacritic}/gu

/** Canonicalizacion mecanica, no comprension semantica: minusculas, sin diacriticos, espacios colapsados. */
export function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .replace(/\s+/g, ' ')
}
