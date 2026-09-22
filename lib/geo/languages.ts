export type Language = {
  code: string
  name: string
}

/**
 * Idiomas de una obra: el catalogo guarda el codigo (`works.language`) y
 * aqui se traduce a su nombre. Unica tabla para la ficha de la obra, los
 * formularios de alta y edicion y el prompt de ScenaIA. El orden es el de
 * los formularios.
 */
export const LANGUAGES: readonly Language[] = [
  { code: 'es', name: 'Español' },
  { code: 'ca', name: 'Catalán' },
  { code: 'eu', name: 'Euskera' },
  { code: 'gl', name: 'Gallego' },
  { code: 'va', name: 'Valenciano' },
  { code: 'en', name: 'Inglés' },
  { code: 'fr', name: 'Francés' },
  { code: 'pt', name: 'Portugués' },
  { code: 'de', name: 'Alemán' },
  { code: 'it', name: 'Italiano' },
  { code: 'otro', name: 'Otro' },
]

/** Nombre del idioma; si el codigo no esta en la tabla, el propio codigo. */
export function languageName(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.name ?? code
}
