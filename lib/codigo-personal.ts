/**
 * Código personal de los enlaces de invitación (Elenco Fundador y
 * Embajadores de Escena), hecho con el nombre o el nombre artístico:
 * «Conchi García» → «conchigarcia». Minúsculas, sin tildes y solo letras y
 * números; misma regla que elenco_codigo_normalizar() en la base.
 */
export function normalizarCodigoPersonal(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, 'y').replace(/[^a-z0-9]/g, '')
}

/** Código con forma válida: 3–30 letras o números, con al menos una letra. */
export function formaCodigoPersonal(c: string): boolean {
  return /^[a-z0-9]{3,30}$/.test(c) && /[a-z]/.test(c)
}
